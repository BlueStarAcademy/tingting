import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
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
  onModeChange?: (mode: LiveMode, reason?: string) => void;
  onTrackingChange?: (status: TrackingStatus) => void;
  /** tracked faces in drawing-buffer pixels (same orientation as the preview) */
  onFaces?: (faces: FaceGeom[], bufferWidth: number) => void;
};

const TRACK_WIDTH = 360;
const TRACK_INTERVAL_MS = 90;
const BLACK_FRAME_TIMEOUT_MS = 5000;
const STARTUP_TIMEOUT_MS = 10000;

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

/**
 * expo-camera preview routed into an expo-gl texture and drawn through the beauty shader.
 * Falls back to the plain CameraView when the GL path is unavailable or stays black.
 */
export const LiveBeautyView = forwardRef<LiveBeautyHandle, Props>(function LiveBeautyView(
  { style, facing, flash, zoom, ratio, look, onModeChange, onTrackingChange, onFaces },
  ref,
) {
  const cameraRef = useRef<CameraView | null>(null);
  const glViewRef = useRef<GLView | null>(null);
  const [mode, setMode] = useState<LiveMode>('starting');
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [gl, setGl] = useState<ExpoWebGLRenderingContext | null>(null);

  const lookRef = useRef(look);
  lookRef.current = look;
  const facesRef = useRef<FaceGeom[]>([]);
  const callbacks = useRef({ onModeChange, onTrackingChange, onFaces });
  callbacks.current = { onModeChange, onTrackingChange, onFaces };

  const changeMode = useCallback((next: LiveMode, reason?: string) => {
    setMode(next);
    callbacks.current.onModeChange?.(next, reason);
    if (next === 'fallback') {
      callbacks.current.onTrackingChange?.('off');
      setCameraReady(false);
      setCameraKey((k) => k + 1);
    }
  }, []);

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

  const useGl = mode !== 'fallback';

  useEffect(() => {
    if (mode !== 'starting') return;
    const timer = setTimeout(() => changeMode('fallback', 'camera start timeout'), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [mode, changeMode]);

  useEffect(() => {
    if (!useGl || !gl || !cameraReady) return;
    const glView = glViewRef.current;
    const camera = cameraRef.current;
    if (!glView || !camera) return;

    let alive = true;
    let raf = 0;
    let cameraTexture: WebGLTexture | null = null;

    const run = async () => {
      let main: Program;
      let raw: Program;
      try {
        main = buildProgram(gl, CAMERA_FRAGMENT_SOURCE);
        raw = buildProgram(gl, CAMERA_RAW_FRAGMENT_SOURCE);
        cameraTexture = await glView.createCameraTextureAsync(camera);
      } catch (e) {
        if (alive) changeMode('fallback', e instanceof Error ? e.message : String(e));
        return;
      }
      if (!alive) return;

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

      const frame = () => {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, w, h);
        draw(main, buildCameraUniforms(lookRef.current, facesRef.current, [w, h]));
        gl.endFrameEXP();
      };
      frame();

      // The camera texture stays black if the device never delivers frames to the SurfaceTexture.
      const started = Date.now();
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
        changeMode('fallback', 'no camera frames');
        return;
      }
      changeMode('live');

      // Face tracking: snapshot the small raw copy, run ML Kit, map back to drawing-buffer pixels.
      let misses = 0;
      let lastStatus: TrackingStatus | null = null;
      const report = (s: TrackingStatus) => {
        if (s !== lastStatus) {
          lastStatus = s;
          callbacks.current.onTrackingChange?.(s);
        }
      };
      const publish = () => callbacks.current.onFaces?.(facesRef.current, gl.drawingBufferWidth);
      while (alive) {
        if (!needsFaces(lookRef.current)) {
          if (facesRef.current.length) {
            facesRef.current = [];
            publish();
          }
          report('off');
          await sleep(300);
          continue;
        }
        let file: string | null = null;
        try {
          drawRaw();
          const snap = await glView.takeSnapshotAsync({
            framebuffer: trackFbo ?? undefined,
            rect: { x: 0, y: 0, width: trackW, height: trackH },
            flip: false,
            format: 'jpeg',
            compress: 0.8,
          });
          if (!alive) return;
          file = typeof snap.uri === 'string' ? snap.uri : snap.localUri;
          const result = await detectFaces(file, {
            fast: true,
            maxFaces: CAMERA_MAX_FACES,
            classify: arNeedsClassification(lookRef.current.effectId),
          });
          if (!alive) return;
          if (result.status === 'unavailable' || result.status === 'error') {
            facesRef.current = [];
            publish();
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
              facesRef.current = [];
              publish();
              report('searching');
            }
          }
        } catch {
          report('searching');
          await sleep(500);
        } finally {
          if (file) FileSystem.deleteAsync(file, { idempotent: true }).catch(() => {});
        }
        await sleep(TRACK_INTERVAL_MS);
      }
    };

    void run();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      facesRef.current = [];
      if (cameraTexture) glView.destroyObjectAsync(cameraTexture as WebGLTexture & { id: number }).catch(() => {});
    };
  }, [gl, cameraReady, useGl, changeMode]);

  return (
    <View style={[styles.box, style]}>
      <CameraView
        key={cameraKey}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        zoom={zoom}
        ratio={ratio}
        mirror={facing === 'front'}
        onCameraReady={() => setCameraReady(true)}
        onMountError={(e) => callbacks.current.onModeChange?.('fallback', e.message)}
      />
      {useGl ? (
        <GLView
          ref={glViewRef}
          style={StyleSheet.absoluteFill}
          onContextCreate={(ctx) => setGl(ctx)}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: '#000' },
});
