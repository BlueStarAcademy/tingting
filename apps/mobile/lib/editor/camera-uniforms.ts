import { buildColorMatrix, getFilterLook } from './color';
import { FACE_PARTS } from './beauty-core';
import type { FaceGeom } from './faces';
import type { CameraLook } from './look';
import { EMPTY_ADJUST, MAKEUP_ITEMS } from './types';

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const LIP_COLOR = hexToRgb(MAKEUP_ITEMS.find((m) => m.key === 'lip')?.palette[0] ?? '#D8344F');
const BLUSH_COLOR = hexToRgb(MAKEUP_ITEMS.find((m) => m.key === 'blush')?.palette[0] ?? '#F58BA0');

export type CameraUniforms = Record<string, number | number[]>;

/** Look uniforms for the live camera shader (faces are sent separately); `size` is the drawing buffer in pixels. */
export function cameraLookUniforms(look: CameraLook, size: [number, number]): CameraUniforms {
  const b = look.beauty;
  const k = look.filterId ? look.filterIntensity : 0;
  const extras = getFilterLook(look.filterId);
  const m = buildColorMatrix(look.filterId, k, EMPTY_ADJUST);
  // 4x5 row-major color matrix -> column-major mat4 + offset (alpha is 1 in the shader)
  const mat: number[] = [];
  for (let col = 0; col < 4; col += 1) for (let row = 0; row < 4; row += 1) mat.push(m[row * 5 + col]);
  return {
    uSize: size,
    uBeauty1: [b.smooth, b.whiten, b.tone, b.slim],
    uBeauty2: [b.jaw, b.eyes, b.nose, b.cheek],
    uBeauty3: [b.chin, look.lip, look.blush, 0],
    uLipCol: LIP_COLOR,
    uBlushCol: BLUSH_COLOR,
    uColorMat: mat,
    uColorOff: [m[4], m[9], m[14], m[19]],
    uFinish: [(extras?.fade ?? 0) * k, (extras?.vignette ?? 0) * k, (extras?.grain ?? 0) * k, (extras?.glow ?? 0) * k],
  };
}

/** `uF{face}{part}` names in the same order as FACE_PARTS, for caching uniform locations. */
export const cameraFaceUniformNames = (maxFaces: number) =>
  Array.from({ length: maxFaces }, (_, i) => FACE_PARTS.map((part) => `uF${i}${part}`));

/**
 * Writes one face vec4 (part index into FACE_PARTS) into `out` without allocating; must stay value
 * for value equal to `faceUniforms` in faces.ts, including the harmless values for empty slots.
 */
export function writeFaceUniform(f: FaceGeom | undefined, part: number, out: Float32Array) {
  if (!f) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 1;
    out[3] = 1;
    return;
  }
  switch (part) {
    case 0:
      out[0] = f.center.x;
      out[1] = f.center.y;
      out[2] = Math.max(1, f.radius.x);
      out[3] = Math.max(1, f.radius.y);
      return;
    case 1:
      out[0] = f.leftEye.x;
      out[1] = f.leftEye.y;
      out[2] = f.rightEye.x;
      out[3] = f.rightEye.y;
      return;
    case 2:
      out[0] = f.nose.x;
      out[1] = f.nose.y;
      out[2] = f.mouth.x;
      out[3] = f.mouth.y;
      return;
    case 3:
      out[0] = f.chin.x;
      out[1] = f.chin.y;
      out[2] = Math.max(1, f.mouthHalfWidth);
      out[3] = Math.max(1, f.eyeRadius);
      return;
    case 4:
      out[0] = f.leftJaw.x;
      out[1] = f.leftJaw.y;
      out[2] = f.rightJaw.x;
      out[3] = f.rightJaw.y;
      return;
    case 5:
      out[0] = f.leftCheek.x;
      out[1] = f.leftCheek.y;
      out[2] = f.rightCheek.x;
      out[3] = f.rightCheek.y;
      return;
    default:
      out[0] = f.noseHalfWidth;
      out[1] = f.lipHalfHeight;
      out[2] = 0;
      out[3] = 0;
  }
}
