import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import type { FaceGeom } from './faces';
import type { FilterLook } from './color';
import { EDITOR_SHADER_SOURCE, FACE_PARTS, MAX_FACES } from './shader-source';
import type { EditState } from './types';

let compiled: SkRuntimeEffect | null | undefined;

export function getEditorEffect(): SkRuntimeEffect | null {
  if (compiled === undefined) {
    try {
      compiled = Skia.RuntimeEffect.Make(EDITOR_SHADER_SOURCE);
    } catch {
      compiled = null;
    }
    if (!compiled && __DEV__) console.warn('[editor] shader failed to compile');
  }
  return compiled;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export type EditorUniforms = Record<string, number | number[]>;

export function buildUniforms(
  state: EditState,
  faces: FaceGeom[],
  filterLook: FilterLook | undefined,
): EditorUniforms {
  const { beauty, makeup, adjust, effects } = state;
  const k = state.filterIntensity;
  const u: EditorUniforms = {
    uSize: [state.base.width, state.base.height],
    uFaceCount: Math.min(faces.length, MAX_FACES),
    uBeauty1: [beauty.smooth, beauty.whiten, beauty.clarity, beauty.slim],
    uBeauty2: [beauty.jaw, beauty.eyes, beauty.nose, beauty.cheek],
    uMk1: [makeup.blush.amount, makeup.lip.amount, makeup.eyeshadow.amount, makeup.eyeliner.amount],
    uMk2: [makeup.concealer.amount, makeup.highlight.amount, 0, 0],
    uBlushCol: hexToRgb(makeup.blush.color),
    uLipCol: hexToRgb(makeup.lip.color),
    uShadowCol: hexToRgb(makeup.eyeshadow.color),
    uLinerCol: hexToRgb(makeup.eyeliner.color),
    uConcealCol: hexToRgb(makeup.concealer.color),
    uHiCol: hexToRgb(makeup.highlight.color),
    uFinish1: [
      adjust.highlights,
      adjust.shadows,
      clamp01(adjust.fade + (filterLook?.fade ?? 0) * k),
      adjust.sharpen,
    ],
    uFinish2: [
      clamp01(adjust.vignette + (filterLook?.vignette ?? 0) * k),
      clamp01(adjust.grain + (filterLook?.grain ?? 0) * k),
      clamp01(effects.soft_blur + (filterLook?.glow ?? 0) * k),
      0,
    ],
    uFx1: [effects.light_leak, effects.prism, effects.dust, effects.spotlight],
    uFx2: [effects.sunflare, 0, 0, 0],
  };
  for (let i = 0; i < MAX_FACES; i += 1) {
    const f = faces[i];
    if (!f) {
      for (const part of FACE_PARTS) u[`uF${i}${part}`] = [0, 0, 1, 1];
      continue;
    }
    u[`uF${i}A`] = [f.center.x, f.center.y, f.radius.x, f.radius.y];
    u[`uF${i}B`] = [f.leftEye.x, f.leftEye.y, f.rightEye.x, f.rightEye.y];
    u[`uF${i}C`] = [f.nose.x, f.nose.y, f.mouth.x, f.mouth.y];
    u[`uF${i}D`] = [f.chin.x, f.chin.y, f.mouthHalfWidth, f.eyeRadius];
    u[`uF${i}E`] = [f.leftJaw.x, f.leftJaw.y, f.rightJaw.x, f.rightJaw.y];
    u[`uF${i}F`] = [f.leftCheek.x, f.leftCheek.y, f.rightCheek.x, f.rightCheek.y];
  }
  return u;
}
