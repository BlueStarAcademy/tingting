import { buildColorMatrix, getFilterLook } from './color';
import { CAMERA_MAX_FACES } from './camera-shader-source';
import { faceUniforms, type FaceGeom } from './faces';
import type { CameraLook } from './look';
import { EMPTY_ADJUST, MAKEUP_ITEMS } from './types';

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const LIP_COLOR = hexToRgb(MAKEUP_ITEMS.find((m) => m.key === 'lip')?.palette[0] ?? '#D8344F');
const BLUSH_COLOR = hexToRgb(MAKEUP_ITEMS.find((m) => m.key === 'blush')?.palette[0] ?? '#F58BA0');

export type CameraUniforms = Record<string, number | number[]>;

/** Uniforms for CAMERA_FRAGMENT_SOURCE; `size` is the drawing buffer in pixels. */
export function buildCameraUniforms(look: CameraLook, faces: FaceGeom[], size: [number, number]): CameraUniforms {
  const b = look.beauty;
  const k = look.filterId ? look.filterIntensity : 0;
  const extras = getFilterLook(look.filterId);
  const m = buildColorMatrix(look.filterId, k, EMPTY_ADJUST);
  // 4x5 row-major color matrix -> column-major mat4 + offset (alpha is 1 in the shader)
  const mat: number[] = [];
  for (let col = 0; col < 4; col += 1) for (let row = 0; row < 4; row += 1) mat.push(m[row * 5 + col]);
  return {
    uSize: size,
    uFaceCount: Math.min(faces.length, CAMERA_MAX_FACES),
    uBeauty1: [b.smooth, b.whiten, b.tone, b.slim],
    uBeauty2: [b.jaw, b.eyes, b.nose, b.cheek],
    uBeauty3: [b.chin, look.lip, look.blush, 0],
    uLipCol: LIP_COLOR,
    uBlushCol: BLUSH_COLOR,
    uColorMat: mat,
    uColorOff: [m[4], m[9], m[14], m[19]],
    uFinish: [(extras?.fade ?? 0) * k, (extras?.vignette ?? 0) * k, (extras?.grain ?? 0) * k, (extras?.glow ?? 0) * k],
    ...faceUniforms(faces, CAMERA_MAX_FACES),
  };
}
