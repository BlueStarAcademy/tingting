import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { faceUniforms, type FaceGeom } from './faces';
import type { FilterLook } from './color';
import { EDITOR_SHADER_SOURCE, MAX_FACES } from './shader-source';
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
    uBeauty3: [beauty.chin, beauty.tone, 0, 0],
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
  return { ...u, ...faceUniforms(faces, MAX_FACES) };
}
