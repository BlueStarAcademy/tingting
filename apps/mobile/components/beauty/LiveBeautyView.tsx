import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppState, PixelRatio, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { CameraView, type CameraType, type FlashMode } from 'expo-camera';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as FileSystem from 'expo-file-system/legacy';
import {
  CAMERA_FRAGMENT_SOURCE,
  CAMERA_MAX_FACES,
  CAMERA_RAW_FRAGMENT_SOURCE,
  CAMERA_VERTEX_SOURCE,
} from '@/lib/editor/camera-shader-source';
import { buildCameraUniforms } from '@/lib/editor/camera-uniforms';
import { arNeedsClassification } from '@/lib/ar/effects';
import { markLiveSession } from '@/lib/camera-safe-mode';
import { breadcrumb, logEvent } from '@/lib/diagnostics';
import { blendFace, detectFaces, scaleFace, type FaceGeom } from '@/lib/editor/faces';
import type { CameraLook } from '@/lib/editor/look';
import { FACE_ONLY_BEAUTY } from '@/lib/editor/types';

/** `live`: effects render on the preview. `fallback`: plain preview, effects only after capture. */
export type LiveMode = 'starting' | 'live' | 'fallback';
export type TrackingStatus = 'off' | 'searching' | 'tracking' | 'unavailable';

export type CapturedPhoto = { uri: string; width: number; height: number };

export type LiveBeautyHandle = {
  takePicture: () => Promise<CapturedPhoto | null>;
};

type Props = {
  style?: StyleProp<ViewStyle>;
  facing: CameraType;
  flash: FlashMode;
  zoom: number;
  ratio: '4:3' | '16:9';
  look: CameraLook;
  /** false = safe mode: plain CameraView only, no GL pipeline at all */
  live: boolean;
  /** `reason` starting with "stall:" means the device could not keep up with the live pipeline */
  onModeChange?: (mode: LiveMode, reason?: string) => void;
  onTrackingChange?: (status: TrackingStatus) => void;
  /** tracked faces in drawing-buffer pixels (same orientation as the preview) */
  onFaces?: (faces: FaceGeom[], bufferWidth: number) => void;
};

const TRACK_WIDTH = 360;
const TRACK_INTERVAL_MS = 90;
const BLACK_FRAME_TIMEOUT_MS = 5000;
const STARTUP_TIMEOUT_MS = 10000;
/** The beauty shader runs per output pixel, so the drawing buffer is capped and scaled up on screen. */
const MAX_GL_WIDTH = 720;
const FRAME_MS = 33;
const SLOWEST_FRAME_MS = 100;
/**
 * expo-gl queues draws for its GL thread without backpressure and has no fences, so every few
 * frames a blocking flushEXP() measures how far behind the GL thread is.
 */
const PACE_EVERY = 5;
const BEHIND_MS = 60;
const STALL_FLUSH_MS = 1500;
const MAX_BEHIND_CHECKS = 6;
const SNAPSHOT_TIMEOUT_MS = 3000;
const DETECT_TIMEOUT_MS = 4000;

type Program = { program: WebGLProgram; position: number; locations: Map<string, WebGLUniformLocation | null> };

function buildProgram(gl: ExpoWebGLRenderingContext, fragmentSource: string): Program {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('createShader failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'shader compile failed');
    }
    return shader;
  };
  const program = gl.createProgram();
  if (!program) throw new Error('createProgram failed');
  gl.attachShader(program, compile(gl.VERTEX_SHADER, CAMERA_VERTEX_SOURCE));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
  }
  return { program, position: gl.getAttribLocation(program, 'position'), locations: new Map() };
}

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

/** Pairs each new face with the closest previous one and eases toward it to hide detector jitter. */
function smoothFaces(prev: FaceGeom[], next: FaceGeom[]): FaceGeom[] {
  return next.map((f) => {
    let best: FaceGeom | null = null;
    let bestD = Infinity;
    for (const p of prev) {
      const d = Math.hypot(p.center.x - f.center.x, p.center.y - f.center.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best || bestD > f.radius.x * 0.8) return f;
    // move fast when the face moves a lot, settle when it is still
    const t = Math.min(1, 0.45 + bestD / (f.radius.x * 0.6));
    return blendFace(best, f, t);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves with the value, or `late` (the still-running promise) once `ms` passes. */
function within<T>(promise: Promise<T>, ms: number): Promise<{ value: T } | { late: Promise<unknown> }> {
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
export const LiveBeautyView = forwardRef<LiveBeautyHandle, Props>(function LiveBeautyView(
  { style, facing, flash, zoom, ratio, look, live, onModeChange, onTrackingChange, onFaces },
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
  const facesRef = useRef<FaceGeom[]>([]);
  const callbacks = useRef({ onModeChange, onTrackingChange, onFaces });
  callbacks.current = { onModeChange, onTrackingChange, onFaces };
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const changeMode = useCallback((next: LiveMode, reason?: string) => {
    if (modeRef.current === next) return;
    modeRef.current = next;
    setMode(next);
    callbacks.current.onModeChange?.(next, reason);
    if (next === 'live') logEvent('camera_live');
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

  useEffect(() => {
    if (!useGl) setGlState(null);
  }, [useGl]);

  useEffect(() => {
    if (mode !== 'starting' || !live) return;
    const timer = setTimeout(() => changeMode('fallback', 'stall: camera start timeout'), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [mode, live, changeMode]);

  useEffect(() => {
    if (!useGl || !gl || !cameraReady) return;
    const glView = glViewRef.current;
    const camera = cameraRef.current;
    if (!glView || !camera) return;

    let alive = true;
    let raf = 0;
    let cameraTexture: WebGLTexture | null = null;
    markLiveSession(true);
    const appState = AppState.addEventListener('change', (s) => markLiveSession(s === 'active'));
    const stall = (reason: string, data: Record<string, unknown>) => {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      logEvent('camera_gl_stall', { reason, ...data }, 'warn');
      changeMode('fallback', `stall: ${reason}`);
    };

    const run = async () => {
      let main: Program;
      let raw: Program;
      const started = Date.now();
      try {
        main = buildProgram(gl, CAMERA_FRAGMENT_SOURCE);
        raw = buildProgram(gl, CAMERA_RAW_FRAGMENT_SOURCE);
        cameraTexture = await glView.createCameraTextureAsync(camera);
      } catch (e) {
        if (alive) changeMode('fallback', e instanceof Error ? e.message : String(e));
        return;
      }
      if (!alive) return;
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

      const draw = (prog: Program, uniforms: Record<string, number | number[]>) => {
        gl.useProgram(prog.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.enableVertexAttribArray(prog.position);
        gl.vertexAttribPointer(prog.position, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cameraTexture);
        let texLoc = prog.locations.get('cameraTexture');
        if (texLoc === undefined) {
          texLoc = gl.getUniformLocation(prog.program, 'cameraTexture');
          prog.locations.set('cameraTexture', texLoc);
        }
        gl.uniform1i(texLoc, 0);
        setUniforms(gl, prog, uniforms);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      const drawRaw = () => {
        ensureTrackTarget();
        gl.bindFramebuffer(gl.FRAMEBUFFER, trackFbo);
        gl.viewport(0, 0, trackW, trackH);
        draw(raw, { uOut: [trackW, trackH] });
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      };

      let frameMs = FRAME_MS;
      let lastDraw = 0;
      let frames = 0;
      let behind = 0;
      const frameLoop = () => {
        if (!alive) return;
        raf = requestAnimationFrame(frameLoop);
        const now = Date.now();
        if (now - lastDraw < frameMs - 4) return;
        lastDraw = now;
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
        draw(main, buildCameraUniforms(lookRef.current, facesRef.current, [w, h]));
        gl.endFrameEXP();
        frames += 1;
        if (frames === 1) breadcrumb('camera_first_frame', { ms: Date.now() - started });
        if (frames % PACE_EVERY !== 0) return;
        const t0 = Date.now();
        gl.flushEXP();
        const waited = Date.now() - t0;
        if (waited > STALL_FLUSH_MS) {
          stall('gl backlog', { waited, frameMs });
        } else if (waited > BEHIND_MS) {
          behind += 1;
          frameMs = Math.min(SLOWEST_FRAME_MS, frameMs * 1.5);
          if (behind >= MAX_BEHIND_CHECKS) stall('gl too slow', { waited, frameMs });
        } else {
          behind = Math.max(0, behind - 1);
          frameMs = Math.max(FRAME_MS, frameMs * 0.92);
        }
      };
      frameLoop();

      // The camera texture stays black if the device never delivers frames to the SurfaceTexture.
      const probe = new Uint8Array(4 * 16);
      let gotFrame = false;
      while (alive && !gotFrame && Date.now() - started < BLACK_FRAME_TIMEOUT_MS) {
        await sleep(400);
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
        changeMode('fallback', 'stall: no camera frames');
        return;
      }
      changeMode('live');

      // Face tracking: snapshot the small raw copy, run ML Kit, map back to drawing-buffer pixels.
      // Strictly one snapshot / detection in flight; a call that hangs pauses tracking, never stacks.
      let misses = 0;
      let lastStatus: TrackingStatus | null = null;
      const report = (s: TrackingStatus) => {
        if (s !== lastStatus) {
          lastStatus = s;
          callbacks.current.onTrackingChange?.(s);
        }
      };
      const publish = () => callbacks.current.onFaces?.(facesRef.current, gl.drawingBufferWidth);
      const clearFaces = () => {
        if (!facesRef.current.length) return;
        facesRef.current = [];
        publish();
      };
      while (alive) {
        if (!needsFaces(lookRef.current)) {
          clearFaces();
          report('off');
          await sleep(300);
          continue;
        }
        let file: string | null = null;
        const stepStart = Date.now();
        try {
          drawRaw();
          const snap = await within(
            glView.takeSnapshotAsync({
              framebuffer: trackFbo ?? undefined,
              rect: { x: 0, y: 0, width: trackW, height: trackH },
              flip: false,
              format: 'jpeg',
              compress: 0.8,
            }),
            SNAPSHOT_TIMEOUT_MS,
          );
          if ('late' in snap) {
            logEvent('camera_snapshot_timeout', undefined, 'warn');
            clearFaces();
            report('unavailable');
            await snap.late;
            continue;
          }
          if (!alive) return;
          file = typeof snap.value.uri === 'string' ? snap.value.uri : snap.value.localUri;
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
            clearFaces();
            report('unavailable');
            await detected.late;
            continue;
          }
          if (!alive) return;
          const result = detected.value;
          if (result.status === 'unavailable' || result.status === 'error') {
            clearFaces();
            report('unavailable');
            await sleep(2000);
          } else if (result.faces.length > 0) {
            misses = 0;
            const scale = gl.drawingBufferWidth / trackW;
            facesRef.current = smoothFaces(facesRef.current, result.faces.map((f) => scaleFace(f, scale)));
            publish();
            report('tracking');
          } else {
            misses += 1;
            if (misses >= 3) {
              clearFaces();
              report('searching');
            }
          }
        } catch {
          report('searching');
          await sleep(500);
        } finally {
          if (file) FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
        }
        // keep the tracker at or below half of the JS/GL budget on slow phones
        await sleep(Math.max(TRACK_INTERVAL_MS, Date.now() - stepStart));
      }
    };

    void run();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      appState.remove();
      markLiveSession(false);
      facesRef.current = [];
      if (cameraTexture) glView.destroyObjectAsync(cameraTexture as WebGLTexture & { id: number }).catch(() => {});
    };
  }, [gl, cameraReady, useGl, changeMode]);

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
      {useGl && frame ? (
        <GLView
          key={frame.key}
          ref={glViewRef}
          style={frame.style}
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
