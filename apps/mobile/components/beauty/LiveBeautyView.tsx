import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppState, PixelRatio, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { CameraView, type CameraType, type FlashMode } from 'expo-camera';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as FileSystem from 'expo-file-system/legacy';
import {
  CAMERA_MAX_FACES,
  CAMERA_RAW_FRAGMENT_SOURCE,
  CAMERA_SHADER_TIERS,
  CAMERA_VERTEX_SOURCE,
  type CameraShaderTier,
} from '@/lib/editor/camera-shader-source';
import { cameraFaceUniformNames, cameraLookUniforms, uniformsHash, writeFaceUniform } from '@/lib/editor/camera-uniforms';
import { arNeedsClassification } from '@/lib/ar/effects';
import { loadShaderTierStart, markLiveSession, saveShaderTierStart } from '@/lib/camera-safe-mode';
import { breadcrumb, checkpoint, logError, logEvent } from '@/lib/diagnostics';
import { createFaceMotion } from '@/lib/editor/face-motion';
import { detectFaces, scaleFace, type FaceGeom } from '@/lib/editor/faces';
import type { CameraLook } from '@/lib/editor/look';
import { FACE_ONLY_BEAUTY } from '@/lib/editor/types';
import { Samples, now } from '@/lib/perf';

/** `live`: effects render on the preview. `fallback`: plain preview, effects only after capture. */
export type LiveMode = 'starting' | 'live' | 'fallback';
export type TrackingStatus = 'off' | 'searching' | 'tracking' | 'unavailable';

export type CapturedPhoto = { uri: string; width: number; height: number };

export type LiveBeautyHandle = {
  takePicture: () => Promise<CapturedPhoto | null>;
};

export type LiveBeautyProps = {
  style?: StyleProp<ViewStyle>;
  facing: CameraType;
  flash: FlashMode;
  zoom: number;
  ratio: '4:3' | '16:9';
  look: CameraLook;
  /** false = safe mode: plain CameraView only, no GL pipeline at all */
  live: boolean;
  /**
   * `reason` starting with "stall:" means the device can't run the live pipeline (switch to safe
   * mode); "gpu:" means this attempt was too slow and a lighter shader is tried on the next open.
   */
  onModeChange?: (mode: LiveMode, reason?: string) => void;
  onTrackingChange?: (status: TrackingStatus) => void;
  /**
   * Called right after every rendered GL frame with the faces that frame used, in drawing-buffer
   * pixels (same orientation as the preview). The array and faces are reused; read, don't keep.
   */
  onFrame?: (faces: readonly FaceGeom[], bufferWidth: number, at: number) => void;
};

/** ML Kit fast mode finds selfie-sized faces reliably at this width; smaller = faster encode + detect */
const TRACK_WIDTH = 288;
const TRACK_JPEG_QUALITY = 0.7;
/** Spacing of detection round starts (~15 Hz); doubled while the renderer is behind. */
const TRACK_PERIOD_MS = 66;
/**
 * Rounds that may overlap: the next frame is captured and snapshotted while ML Kit still works on
 * the previous one. Captures themselves never overlap (one tracking framebuffer).
 */
const TRACK_IN_FLIGHT = 2;
/** a face that stays undetected this long (and for 3 rounds) is dropped */
const TRACK_LOST_MS = 400;
const TRACK_RETRY_MS = 2000;
/** Per-step startup budgets. The plain preview stays visible until a GL frame is verified. */
const CONTEXT_TIMEOUT_MS = 3000;
const COMPILE_TIMEOUT_MS = 2500;
const TEXTURE_TIMEOUT_MS = 2500;
const FIRST_FRAME_TIMEOUT_MS = 2500;
const FIRST_FRAME_POLL_MS = 150;
const STARTUP_TIMEOUT_MS = 9000;
/** The beauty shader runs per output pixel, so the drawing buffer is capped and scaled up on screen. */
const MAX_GL_WIDTH = 720;
/**
 * Render rates, fastest first. 60 fps samples every ~30 fps camera frame at a steady cadence
 * (rendering at the camera's own rate aliases: frames get shown twice or skipped). The loop steps
 * down while the GL thread can't keep up and retries the faster rate later with growing backoff.
 */
const FRAME_LEVELS_MS = [1000 / 60, 1000 / 30, 1000 / 20, 1000 / 15, 1000 / 10];
/** rAF ticks may arrive a little early; anything within this of the target interval draws */
const FRAME_SLACK_MS = 4;
/**
 * expo-gl queues draws for its GL thread without backpressure and has no fences, so a blocking
 * flushEXP() about every PACE_MS measures how far behind the GL thread is.
 */
const PACE_MS = 100;
const BEHIND_MIN_MS = 25;
const SLOW_CHECKS_TO_STEP = 2;
const GOOD_CHECKS_TO_STEP = 5;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;
const STALL_FLUSH_MS = 1500;
const MAX_BEHIND_CHECKS = 6;
const PERF_REPORT_MS = 10000;
const JS_STALL_MS = 50;
const SNAPSHOT_TIMEOUT_MS = 3000;
const DETECT_TIMEOUT_MS = 4000;

type Program = { program: WebGLProgram; position: number; locations: Map<string, WebGLUniformLocation | null> };
type PendingProgram = { program: WebGLProgram; vs: WebGLShader; fs: WebGLShader };
type Shaders = { gl: ExpoWebGLRenderingContext; tier: CameraShaderTier; main: Program; raw: Program };

/**
 * Queues compile + link only. expo-gl status queries block the JS thread until the driver is done,
 * which can take seconds for the beauty shader on some GPUs, so they wait for `glFence`.
 */
function queueProgram(gl: ExpoWebGLRenderingContext, fragmentSource: string): PendingProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vs || !fs || !program) throw new Error('createShader/createProgram failed');
  gl.shaderSource(vs, CAMERA_VERTEX_SOURCE);
  gl.compileShader(vs);
  gl.shaderSource(fs, fragmentSource);
  gl.compileShader(fs);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return { program, vs, fs };
}

/** The driver's compile/link log, or null when the program is usable. Call after `glFence`. */
function programError(gl: ExpoWebGLRenderingContext, p: PendingProgram): string | null {
  if (!gl.getShaderParameter(p.vs, gl.COMPILE_STATUS)) return `vertex: ${gl.getShaderInfoLog(p.vs) || 'compile failed'}`;
  if (!gl.getShaderParameter(p.fs, gl.COMPILE_STATUS)) return `fragment: ${gl.getShaderInfoLog(p.fs) || 'compile failed'}`;
  if (!gl.getProgramParameter(p.program, gl.LINK_STATUS)) return `link: ${gl.getProgramInfoLog(p.program) || 'link failed'}`;
  return null;
}

function toProgram(gl: ExpoWebGLRenderingContext, p: PendingProgram): Program {
  return { program: p.program, position: gl.getAttribLocation(p.program, 'position'), locations: new Map() };
}

/**
 * Resolves once every GL command queued so far has run on the GL thread, without blocking JS.
 * expo-gl has no fence API; endFrameEXP hands the pending batch to the GL thread and a 1x1
 * snapshot is queued behind it.
 */
async function glFence(gl: ExpoWebGLRenderingContext, glView: GLView): Promise<void> {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.endFrameEXP();
  const snap = await glView.takeSnapshotAsync({ rect: { x: 0, y: 0, width: 1, height: 1 }, format: 'png' });
  const file = typeof snap.uri === 'string' ? snap.uri : snap.localUri;
  if (file) FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
}

let glInfoLogged = false;

function logGlInfo(gl: ExpoWebGLRenderingContext) {
  if (glInfoLogged) return;
  glInfoLogged = true;
  try {
    logEvent('camera_gl_info', {
      renderer: String(gl.getParameter(gl.RENDERER)),
      version: String(gl.getParameter(gl.VERSION)),
      glsl: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
    });
  } catch {
    // informational only
  }
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

function setUniforms(gl: ExpoWebGLRenderingContext, prog: Program, values: Record<string, number | number[]>) {
  for (const name of Object.keys(values)) {
    let loc = prog.locations.get(name);
    if (loc === undefined) {
      loc = gl.getUniformLocation(prog.program, name);
      prog.locations.set(name, loc);
    }
    if (loc === null) continue;
    const v = values[name];
    if (typeof v === 'number') gl.uniform1f(loc, v);
    else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
    else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
    else if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    else if (v.length === 16) gl.uniformMatrix4fv(loc, false, new Float32Array(v));
  }
}

function needsFaces(look: CameraLook): boolean {
  return (
    !!look.effectId ||
    look.lip > 0.001 ||
    look.blush > 0.001 ||
    FACE_ONLY_BEAUTY.some((k) => Math.abs(look.beauty[k]) > 0.001)
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Settled<T> = { value: T } | { late: Promise<unknown> };

/** Resolves with the value, or `late` (the still-running promise) once `ms` passes. */
function within<T>(promise: Promise<T>, ms: number): Promise<Settled<T>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ late: promise.catch(() => undefined) }), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve({ value });
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** GLView layout that renders at most MAX_GL_WIDTH px wide and is scaled up to fill `size`. */
function glFrame(size: { w: number; h: number }) {
  const scale = Math.max(1, (size.w * PixelRatio.get()) / MAX_GL_WIDTH);
  const w = Math.round(size.w / scale);
  const h = Math.round(size.h / scale);
  return {
    key: `${w}x${h}`,
    style: {
      position: 'absolute' as const,
      left: (size.w - w) / 2,
      top: (size.h - h) / 2,
      width: w,
      height: h,
      transform: [{ scale }],
    },
  };
}

/**
 * expo-camera preview routed into an expo-gl texture and drawn through the beauty shader.
 * Falls back to the plain CameraView when the GL path is unavailable, stays black or can't keep up.
 */
export const LiveBeautyView = forwardRef<LiveBeautyHandle, LiveBeautyProps>(function LiveBeautyView(
  { style, facing, flash, zoom, ratio, look, live, onModeChange, onTrackingChange, onFrame },
  ref,
) {
  const cameraRef = useRef<CameraView | null>(null);
  const glViewRef = useRef<GLView | null>(null);
  const [mode, setMode] = useState<LiveMode>(live ? 'starting' : 'fallback');
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [glState, setGlState] = useState<{ key: string; gl: ExpoWebGLRenderingContext } | null>(null);

  const lookRef = useRef(look);
  lookRef.current = look;
  const callbacks = useRef({ onModeChange, onTrackingChange, onFrame });
  callbacks.current = { onModeChange, onTrackingChange, onFrame };
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const changeMode = useCallback((next: LiveMode, reason?: string) => {
    if (modeRef.current === next) return;
    modeRef.current = next;
    setMode(next);
    callbacks.current.onModeChange?.(next, reason);
    if (next === 'live') logEvent('camera_live', { tier: reason });
    if (next === 'fallback') {
      if (reason !== 'safe mode') logEvent('camera_fallback', { reason }, 'warn');
      callbacks.current.onTrackingChange?.('off');
      setCameraReady(false);
      setCameraKey((k) => k + 1);
    }
  }, []);

  const liveRef = useRef(live);
  useEffect(() => {
    if (liveRef.current === live) {
      if (!live) callbacks.current.onModeChange?.('fallback', 'safe mode');
      return;
    }
    liveRef.current = live;
    if (live) {
      modeRef.current = 'starting';
      setMode('starting');
      setCameraReady(false);
      setCameraKey((k) => k + 1);
      callbacks.current.onModeChange?.('starting');
    } else if (modeRef.current === 'fallback') {
      callbacks.current.onModeChange?.('fallback', 'safe mode');
    } else {
      changeMode('fallback', 'safe mode');
    }
  }, [live, changeMode]);

  useImperativeHandle(
    ref,
    () => ({
      takePicture: async () => {
        const camera = cameraRef.current;
        if (!camera) return null;
        const photo = await camera.takePictureAsync({ quality: 0.95 });
        return photo?.uri ? { uri: photo.uri, width: photo.width, height: photo.height } : null;
      },
    }),
    [],
  );

  const useGl = live && mode !== 'fallback';
  const frame = size && size.w > 0 && size.h > 0 ? glFrame(size) : null;
  const gl = useGl && frame && glState?.key === frame.key ? glState.gl : null;
  const [shaders, setShaders] = useState<Shaders | null>(null);

  // Unmounting a GLView joins its GL thread on the UI thread, so a view whose GL work timed out
  // stays mounted (hidden) until that work finishes instead of freezing the screen.
  const [glHolds, setGlHolds] = useState(0);
  const holdGl = useCallback((work: Promise<unknown>) => {
    setGlHolds((n) => n + 1);
    work.catch(() => undefined).then(() => setGlHolds((n) => n - 1));
  }, []);

  useEffect(() => {
    if (useGl) return;
    setGlState(null);
    setShaders(null);
  }, [useGl]);

  useEffect(() => {
    if (mode !== 'starting' || !live) return;
    const timer = setTimeout(() => changeMode('fallback', 'stall: camera start timeout'), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [mode, live, changeMode]);

  useEffect(() => {
    if (!useGl || gl || !cameraReady) return;
    const timer = setTimeout(() => changeMode('fallback', 'stall: gl context timeout'), CONTEXT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [useGl, gl, cameraReady, changeMode]);

  useEffect(() => {
    if (!gl) return;
    markLiveSession(true);
    const appState = AppState.addEventListener('change', (s) => markLiveSession(s === 'active'));
    return () => {
      appState.remove();
      markLiveSession(false);
    };
  }, [gl]);

  // Shader setup runs as soon as the GL context exists, before the camera texture is attached, so
  // the plain preview keeps showing while the driver compiles.
  useEffect(() => {
    if (!gl) return;
    const glView = glViewRef.current;
    if (!glView) return;
    let alive = true;
    const fail = (reason: string) => {
      if (alive) changeMode('fallback', reason);
    };

    const run = async () => {
      const start = Math.min(await loadShaderTierStart(), CAMERA_SHADER_TIERS.length - 1);
      if (!alive) return;
      let raw: PendingProgram | null = null;
      for (let i = start; i < CAMERA_SHADER_TIERS.length; i += 1) {
        const { tier, fragment } = CAMERA_SHADER_TIERS[i];
        const last = i === CAMERA_SHADER_TIERS.length - 1;
        const t0 = Date.now();
        checkpoint('camera_shader_compile', { tier });
        const firstRaw = !raw;
        raw = raw ?? queueProgram(gl, CAMERA_RAW_FRAGMENT_SOURCE);
        const main = queueProgram(gl, fragment);

        const fence = glFence(gl, glView);
        holdGl(fence);
        let late: Promise<unknown> | null = null;
        try {
          const res = await within(fence, COMPILE_TIMEOUT_MS);
          if ('late' in res) late = res.late;
        } catch (e) {
          // the snapshot runs after the queued compile, so the status checks below are still valid
          breadcrumb('camera_fence_error', { message: errorText(e) });
        }
        if (!alive) return;
        if (late) {
          if (!last) saveShaderTierStart(i + 1);
          logEvent('camera_shader_timeout', { tier, budgetMs: COMPILE_TIMEOUT_MS }, 'warn');
          late.then(() => logEvent('camera_shader_slow', { tier, ms: Date.now() - t0 }, 'warn'));
          fail(last ? `stall: shader compile timeout (${tier})` : `gpu: shader compile timeout (${tier})`);
          return;
        }
        logGlInfo(gl);
        const ms = Date.now() - t0;
        if (firstRaw) {
          const rawError = programError(gl, raw);
          if (rawError) {
            logEvent('camera_shader_failed', { tier: 'raw', log: rawError }, 'warn');
            fail('stall: gpu shader unsupported');
            return;
          }
        }
        const error = programError(gl, main);
        if (error) {
          logEvent('camera_shader_failed', { tier, ms, log: error }, 'warn');
          if (!last) saveShaderTierStart(i + 1);
          continue;
        }
        breadcrumb('camera_shader_ready', { tier, ms });
        setShaders({ gl, tier, main: toProgram(gl, main), raw: toProgram(gl, raw) });
        return;
      }
      fail('stall: gpu shader unsupported');
    };

    run().catch((e) => {
      logError('camera_gl_setup', e);
      fail('stall: gl setup error');
    });
    return () => {
      alive = false;
    };
  }, [gl, holdGl, changeMode]);

  useEffect(() => {
    if (!useGl || !gl || !cameraReady || !shaders || shaders.gl !== gl) return;
    const glView = glViewRef.current;
    const camera = cameraRef.current;
    if (!glView || !camera) return;
    const { main, raw } = shaders;

    let alive = true;
    let raf = 0;
    let cameraTexture: WebGLTexture | null = null;
    const destroyTexture = (t: unknown) => {
      if (t) glView.destroyObjectAsync(t as WebGLTexture & { id: number }).catch(() => {});
    };
    const stall = (reason: string, data: Record<string, unknown>) => {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      logEvent('camera_gl_stall', { reason, tier: shaders.tier, ...data }, 'warn');
      changeMode('fallback', `stall: ${reason}`);
    };

    const run = async () => {
      const started = Date.now();
      checkpoint('camera_texture_create', { tier: shaders.tier });
      const pending = glView.createCameraTextureAsync(camera);
      holdGl(pending);
      let res: Settled<WebGLTexture>;
      try {
        res = await within(pending, TEXTURE_TIMEOUT_MS);
      } catch (e) {
        logEvent('camera_texture_failed', { message: errorText(e) }, 'warn');
        if (alive) changeMode('fallback', `camera texture: ${errorText(e)}`);
        return;
      }
      if ('late' in res) {
        pending.then(destroyTexture, () => undefined);
        stall('camera texture timeout', { ms: Date.now() - started });
        return;
      }
      if (!alive) {
        destroyTexture(res.value);
        return;
      }
      cameraTexture = res.value;
      breadcrumb('camera_texture', { ms: Date.now() - started, w: gl.drawingBufferWidth, h: gl.drawingBufferHeight });

      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

      // small offscreen copy of the raw camera, used for face tracking and the black-frame check
      const trackTex = gl.createTexture();
      const trackFbo = gl.createFramebuffer();
      let trackW = 0;
      let trackH = 0;
      const ensureTrackTarget = () => {
        const w = TRACK_WIDTH;
        const h = Math.max(1, Math.round((TRACK_WIDTH * gl.drawingBufferHeight) / Math.max(1, gl.drawingBufferWidth)));
        if (w === trackW && h === trackH) return;
        trackW = w;
        trackH = h;
        gl.bindTexture(gl.TEXTURE_2D, trackTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, trackFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, trackTex, 0);
      };

      const uniformLocation = (prog: Program, name: string) => {
        let loc = prog.locations.get(name);
        if (loc === undefined) {
          loc = gl.getUniformLocation(prog.program, name);
          prog.locations.set(name, loc);
        }
        return loc;
      };

      const bindQuad = (prog: Program) => {
        gl.useProgram(prog.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.enableVertexAttribArray(prog.position);
        gl.vertexAttribPointer(prog.position, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
        gl.uniform1i(uniformLocation(prog, 'cameraTexture'), 0);
      };

      const drawRaw = () => {
        ensureTrackTarget();
        gl.bindFramebuffer(gl.FRAMEBUFFER, trackFbo);
        gl.viewport(0, 0, trackW, trackH);
        bindQuad(raw);
        setUniforms(gl, raw, { uOut: [trackW, trackH] });
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      };

      // Uniform values live in the program object, so look uniforms are only re-sent when the look
      // (or buffer size) changes, and face uniforms are written without allocating.
      const faceNames = cameraFaceUniformNames(CAMERA_MAX_FACES);
      const vec4 = new Float32Array(4);
      let sentLook: CameraLook | null = null;
      let sentW = 0;
      let sentH = 0;
      let sentNoFaces = false;
      let lookHash = '';
      let lookLoggedAt = 0;
      const drawMain = (faces: readonly FaceGeom[], w: number, h: number, t: number) => {
        bindQuad(main);
        const look = lookRef.current;
        if (look !== sentLook || w !== sentW || h !== sentH) {
          const values = cameraLookUniforms(look, [w, h]);
          setUniforms(gl, main, values);
          sentLook = look;
          sentW = w;
          sentH = h;
          lookHash = uniformsHash(values);
          perf.looks += 1;
          if (t - lookLoggedAt > 1000) {
            lookLoggedAt = t;
            breadcrumb('camera_look', { h: lookHash, filter: look.filterId, fx: look.effectId });
          }
        }
        const count = Math.min(faces.length, CAMERA_MAX_FACES);
        if (count > 0 || !sentNoFaces) {
          const countLoc = uniformLocation(main, 'uFaceCount');
          if (countLoc) gl.uniform1f(countLoc, count);
          for (let i = 0; i < CAMERA_MAX_FACES; i += 1) {
            const names = faceNames[i];
            for (let p = 0; p < names.length; p += 1) {
              const loc = uniformLocation(main, names[p]);
              if (!loc) continue;
              writeFaceUniform(i < count ? faces[i] : undefined, p, vec4);
              gl.uniform4f(loc, vec4[0], vec4[1], vec4[2], vec4[3]);
            }
          }
          sentNoFaces = count === 0;
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      const motion = createFaceMotion(CAMERA_MAX_FACES);
      // set by the tracker; the next rendered frame draws the tracking copy in the same batch as the
      // preview, so the snapshot queued right after it reads this frame (not a stale one)
      let captureWanted: ((at: number) => void) | null = null;
      const requestCapture = () =>
        new Promise<number>((resolve) => {
          captureWanted = resolve;
        });

      // Tracking breakdown per window: wait = request -> captured frame, snap = framebuffer -> JPEG
      // file, det = ML Kit call (file decode + detect + bridge), track = capture -> faces applied.
      // idle / off = % of the window with no round in flight / with tracking not needed.
      // looks = look uniform uploads, look = hash of the last uploaded set.
      const perf = {
        since: now(),
        frames: 0,
        stalls: 0,
        rounds: 0,
        stale: 0,
        errors: 0,
        idleMs: 0,
        offMs: 0,
        looks: 0,
        interval: new Samples(1024),
        pace: new Samples(256),
        track: new Samples(256),
        wait: new Samples(256),
        snap: new Samples(256),
        det: new Samples(256),
      };
      const reportPerf = (t: number) => {
        const ms = t - perf.since;
        const secs = ms / 1000;
        const activeSecs = Math.max(0.001, (ms - perf.offMs) / 1000);
        const pct = (v: number) => Math.round((v / ms) * 100);
        logEvent('camera_perf', {
          tier: shaders.tier,
          target: Math.round(1000 / FRAME_LEVELS_MS[level]),
          fps: Math.round((perf.frames / secs) * 10) / 10,
          p50: perf.interval.percentile(50),
          p95: perf.interval.percentile(95),
          trackHz: Math.round((perf.rounds / activeSecs) * 10) / 10,
          trackP50: perf.track.percentile(50),
          trackP95: perf.track.percentile(95),
          waitP95: perf.wait.percentile(95),
          snapP50: perf.snap.percentile(50),
          snapP95: perf.snap.percentile(95),
          detP50: perf.det.percentile(50),
          detP95: perf.det.percentile(95),
          idle: pct(perf.idleMs),
          off: pct(perf.offMs),
          stale: perf.stale,
          err: perf.errors,
          paceP95: perf.pace.percentile(95),
          stalls: perf.stalls,
          faces: motion.count,
          looks: perf.looks,
          look: lookHash,
        });
        resetPerf(t);
      };
      const resetPerf = (t: number) => {
        perf.since = t;
        perf.frames = 0;
        perf.stalls = 0;
        perf.rounds = 0;
        perf.stale = 0;
        perf.errors = 0;
        perf.idleMs = 0;
        perf.offMs = 0;
        perf.looks = 0;
        perf.interval.reset();
        perf.pace.reset();
        perf.track.reset();
        perf.wait.reset();
        perf.snap.reset();
        perf.det.reset();
      };

      let level = 0;
      const retryAfter = FRAME_LEVELS_MS.map(() => RETRY_BASE_MS);
      let retryAt = 0;
      let slowChecks = 0;
      let goodChecks = 0;
      let behindAtSlowest = 0;
      let lastTick = 0;
      let lastDraw = 0;
      let lastPace = 0;
      let frames = 0;
      const pace = (t: number) => {
        const frameMs = FRAME_LEVELS_MS[level];
        const t0 = now();
        gl.flushEXP();
        const waited = now() - t0;
        perf.pace.push(waited);
        if (waited > STALL_FLUSH_MS) {
          stall('gl backlog', { waited: Math.round(waited), frameMs: Math.round(frameMs) });
          return;
        }
        if (waited > Math.max(BEHIND_MIN_MS, frameMs * 1.5)) {
          goodChecks = 0;
          slowChecks += 1;
          if (level === FRAME_LEVELS_MS.length - 1) {
            behindAtSlowest += 1;
            if (behindAtSlowest >= MAX_BEHIND_CHECKS) stall('gl too slow', { waited: Math.round(waited), frameMs });
          } else if (slowChecks >= SLOW_CHECKS_TO_STEP) {
            retryAt = t + retryAfter[level];
            retryAfter[level] = Math.min(RETRY_MAX_MS, retryAfter[level] * 2);
            level += 1;
            slowChecks = 0;
            breadcrumb('camera_rate', { fps: Math.round(1000 / FRAME_LEVELS_MS[level]), waited: Math.round(waited) });
          }
          return;
        }
        slowChecks = 0;
        behindAtSlowest = Math.max(0, behindAtSlowest - 1);
        goodChecks = waited < frameMs * 0.5 ? goodChecks + 1 : 0;
        if (level > 0 && goodChecks >= GOOD_CHECKS_TO_STEP && t >= retryAt) {
          level -= 1;
          goodChecks = 0;
          breadcrumb('camera_rate', { fps: Math.round(1000 / FRAME_LEVELS_MS[level]) });
        }
      };

      const frameLoop = () => {
        if (!alive) return;
        raf = requestAnimationFrame(frameLoop);
        const t = now();
        if (lastTick && t - lastTick > JS_STALL_MS) perf.stalls += 1;
        lastTick = t;
        if (t - lastDraw < FRAME_LEVELS_MS[level] - FRAME_SLACK_MS) return;
        if (lastDraw) perf.interval.push(t - lastDraw);
        lastDraw = t;
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const captured = captureWanted;
        if (captured) {
          captureWanted = null;
          drawRaw();
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
        const faces = motion.sample(t);
        drawMain(faces, w, h, t);
        gl.endFrameEXP();
        captured?.(t);
        callbacks.current.onFrame?.(faces, w, t);
        frames += 1;
        perf.frames += 1;
        if (frames === 1) breadcrumb('camera_first_draw', { ms: Date.now() - started });
        if (t - lastPace >= PACE_MS) {
          lastPace = t;
          pace(t);
        }
        if (modeRef.current === 'live' && t - perf.since >= PERF_REPORT_MS) reportPerf(t);
      };
      frameLoop();

      // The camera texture stays black if the device never delivers frames to the SurfaceTexture;
      // the GL view is only revealed once a real camera pixel came through.
      const probe = new Uint8Array(4 * 16);
      const probeStart = Date.now();
      let gotFrame = false;
      while (alive && !gotFrame && Date.now() - probeStart < FIRST_FRAME_TIMEOUT_MS) {
        await sleep(FIRST_FRAME_POLL_MS);
        if (!alive) return;
        try {
          drawRaw();
          gl.bindFramebuffer(gl.FRAMEBUFFER, trackFbo);
          gl.readPixels(Math.floor(trackW / 2) - 2, Math.floor(trackH / 2) - 2, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, probe);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          let sum = 0;
          for (let i = 0; i < probe.length; i += 4) sum += probe[i] + probe[i + 1] + probe[i + 2];
          gotFrame = sum > 0;
        } catch {
          // keep waiting; a failed probe is not proof of a black preview
        }
      }
      if (!alive) return;
      if (!gotFrame) {
        stall('no camera frames', { ms: Date.now() - probeStart, frames });
        return;
      }
      breadcrumb('camera_first_frame', { ms: Date.now() - started });
      changeMode('live', shaders.tier);
      resetPerf(now());

      // Face tracking: snapshot the small raw copy, run ML Kit, map back to drawing-buffer pixels and
      // feed the motion filter, which the render loop samples every frame. A round starts every
      // TRACK_PERIOD_MS; capture + snapshot are exclusive, while ML Kit may still be working on the
      // previous round. A call that hangs keeps its slot until it settles, so work never stacks up.
      let lastStatus: TrackingStatus | null = null;
      const report = (s: TrackingStatus) => {
        if (s !== lastStatus) {
          lastStatus = s;
          callbacks.current.onTrackingChange?.(s);
        }
      };
      let inFlight = 0;
      let capturing = false;
      let lastStart = 0;
      let newestApplied = 0;
      let lastSeen = 0;
      let misses = 0;
      let pausedUntil = 0;
      let firstDetect = true;
      let wake: (() => void) | null = null;
      const nudge = () => wake?.();
      const idle = (ms: number) =>
        new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            wake = null;
            resolve();
          }, ms);
          wake = () => {
            clearTimeout(timer);
            wake = null;
            resolve();
          };
        });
      const lose = (status: TrackingStatus) => {
        motion.clear();
        misses = 0;
        report(status);
      };
      const pause = (ms: number, status: TrackingStatus) => {
        pausedUntil = now() + ms;
        lose(status);
      };

      const round = async () => {
        let file: string | null = null;
        try {
          const requested = now();
          const capturedAt = await requestCapture();
          if (!alive) return;
          perf.wait.push(capturedAt - requested);
          const snapStart = now();
          const snap = await within(
            glView.takeSnapshotAsync({
              framebuffer: trackFbo ?? undefined,
              rect: { x: 0, y: 0, width: trackW, height: trackH },
              flip: false,
              format: 'jpeg',
              compress: TRACK_JPEG_QUALITY,
            }),
            SNAPSHOT_TIMEOUT_MS,
          );
          if ('late' in snap) {
            logEvent('camera_snapshot_timeout', undefined, 'warn');
            pause(TRACK_RETRY_MS, 'unavailable');
            await snap.late;
            return;
          }
          capturing = false;
          nudge();
          if (!alive) return;
          perf.snap.push(now() - snapStart);
          file = typeof snap.value.uri === 'string' ? snap.value.uri : snap.value.localUri;
          const detStart = now();
          const detected = await within(
            detectFaces(file, {
              fast: true,
              maxFaces: CAMERA_MAX_FACES,
              classify: arNeedsClassification(lookRef.current.effectId),
            }),
            DETECT_TIMEOUT_MS,
          );
          if ('late' in detected) {
            logEvent('camera_detect_timeout', undefined, 'warn');
            pause(TRACK_RETRY_MS, 'unavailable');
            await detected.late;
            return;
          }
          if (!alive || !needsFaces(lookRef.current)) return;
          const detMs = now() - detStart;
          perf.det.push(detMs);
          if (firstDetect) {
            firstDetect = false;
            breadcrumb('camera_track_first', { ms: Math.round(detMs) });
          }
          const result = detected.value;
          if (result.status === 'unavailable' || result.status === 'error') {
            perf.errors += 1;
            pause(TRACK_RETRY_MS, 'unavailable');
            return;
          }
          // overlapping rounds can finish out of order; an older frame would pull the face back
          if (capturedAt <= newestApplied) {
            perf.stale += 1;
            return;
          }
          newestApplied = capturedAt;
          perf.rounds += 1;
          perf.track.push(now() - capturedAt);
          const scale = gl.drawingBufferWidth / trackW;
          motion.update(
            capturedAt,
            result.faces.map((f) => scaleFace(f, scale)),
          );
          if (result.faces.length > 0) {
            misses = 0;
            lastSeen = capturedAt;
            report('tracking');
          } else {
            misses += 1;
            if (misses >= 3 && capturedAt - lastSeen >= TRACK_LOST_MS) lose('searching');
          }
        } catch {
          perf.errors += 1;
          pausedUntil = now() + 500;
          report('searching');
        } finally {
          capturing = false;
          if (file) FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
        }
      };

      while (alive) {
        const t = now();
        if (!needsFaces(lookRef.current)) {
          if (motion.count > 0) lose('off');
          report('off');
          await sleep(300);
          if (modeRef.current === 'live') perf.offMs += now() - t;
          continue;
        }
        // keep the GL thread and JS free for drawing when the renderer has stepped down
        const behind = level > 0;
        const period = behind ? TRACK_PERIOD_MS * 2 : TRACK_PERIOD_MS;
        const blocked = capturing || inFlight >= (behind ? 1 : TRACK_IN_FLIGHT);
        const due = Math.max(pausedUntil, lastStart + period) - t;
        if (blocked || due > 0) {
          const wasIdle = inFlight === 0;
          await idle(blocked ? 1000 : due);
          if (wasIdle) perf.idleMs += now() - t;
          continue;
        }
        lastStart = t;
        inFlight += 1;
        capturing = true;
        void round().finally(() => {
          inFlight -= 1;
          nudge();
        });
      }
    };

    run().catch((e) => {
      logError('camera_gl_pipeline', e);
      stall('pipeline error', { message: errorText(e) });
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      destroyTexture(cameraTexture);
    };
  }, [gl, cameraReady, useGl, shaders, holdGl, changeMode]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
  };

  return (
    <View style={[styles.box, style]} onLayout={onLayout}>
      <CameraView
        key={cameraKey}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        zoom={zoom}
        ratio={ratio}
        mirror={facing === 'front'}
        onCameraReady={() => {
          breadcrumb('camera_ready', { live });
          setCameraReady(true);
        }}
        onMountError={(e) => {
          logEvent('camera_mount_error', { message: e.message }, 'warn');
          if (live && modeRef.current !== 'fallback') changeMode('fallback', e.message);
          else callbacks.current.onModeChange?.('fallback', e.message);
        }}
      />
      {(useGl || glHolds > 0) && frame ? (
        <GLView
          key={frame.key}
          ref={glViewRef}
          // Kept barely visible rather than at 0 until the first verified frame: a fully transparent
          // TextureView may not be composited, and then the GL thread can block on buffer swaps.
          style={[frame.style, { opacity: mode === 'live' ? 1 : 0.01 }]}
          onContextCreate={(ctx) => {
            breadcrumb('gl_ready', { w: ctx.drawingBufferWidth, h: ctx.drawingBufferHeight });
            setGlState({ key: frame.key, gl: ctx });
          }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: '#000' },
});
