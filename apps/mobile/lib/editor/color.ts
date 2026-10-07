import { EDITOR_FEATURES, type EditorFeature } from '@tingting/shared';
import type { AdjustValues } from './types';

/** 4x5 row-major color matrix; the 5th column is an offset in 0..1 units. */
export type ColorMatrix = number[];

export const IDENTITY: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

/** a ∘ b: applies b first, then a. */
function mul(a: ColorMatrix, b: ColorMatrix): ColorMatrix {
  const out = new Array<number>(20).fill(0);
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[r * 5 + k] * b[k * 5 + c];
      out[r * 5 + c] = c === 4 ? sum + a[r * 5 + 4] : sum;
    }
  }
  return out;
}

/** Applies the matrices in the given order. */
function chain(...ms: ColorMatrix[]): ColorMatrix {
  return ms.reduce((acc, m) => mul(m, acc), IDENTITY);
}

function lerpMatrix(m: ColorMatrix, t: number): ColorMatrix {
  return m.map((v, i) => IDENTITY[i] + (v - IDENTITY[i]) * t);
}

const brightness = (a: number): ColorMatrix => [
  1, 0, 0, 0, a * 0.2,
  0, 1, 0, 0, a * 0.2,
  0, 0, 1, 0, a * 0.2,
  0, 0, 0, 1, 0,
];

const contrast = (a: number): ColorMatrix => {
  const c = 1 + a * 0.5;
  const t = 0.5 * (1 - c);
  return [c, 0, 0, 0, t, 0, c, 0, 0, t, 0, 0, c, 0, t, 0, 0, 0, 1, 0];
};

const saturation = (a: number): ColorMatrix => {
  const s = Math.max(0, 1 + a);
  const inv = 1 - s;
  const R = 0.2126 * inv;
  const G = 0.7152 * inv;
  const B = 0.0722 * inv;
  return [R + s, G, B, 0, 0, R, G + s, B, 0, 0, R, G, B + s, 0, 0, 0, 0, 0, 1, 0];
};

const warmth = (a: number): ColorMatrix => [
  1 + a * 0.1, 0, 0, 0, a * 0.035,
  0, 1 + a * 0.02, 0, 0, a * 0.008,
  0, 0, 1 - a * 0.12, 0, -a * 0.03,
  0, 0, 0, 1, 0,
];

/** positive = magenta, negative = green */
const tint = (a: number): ColorMatrix => [
  1 + a * 0.05, 0, 0, 0, a * 0.015,
  0, 1 - a * 0.07, 0, 0, -a * 0.01,
  0, 0, 1 + a * 0.05, 0, a * 0.015,
  0, 0, 0, 1, 0,
];

const channels = (r: number, g: number, b: number, ro = 0, go = 0, bo = 0): ColorMatrix => [
  r, 0, 0, 0, ro,
  0, g, 0, 0, go,
  0, 0, b, 0, bo,
  0, 0, 0, 1, 0,
];

const lift = (a: number): ColorMatrix => {
  const s = 1 - a;
  return [s, 0, 0, 0, a, 0, s, 0, 0, a, 0, 0, s, 0, a, 0, 0, 0, 1, 0];
};

const GRAY: ColorMatrix = [
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0,
];

const SEPIA: ColorMatrix = [
  0.393, 0.769, 0.189, 0, 0,
  0.349, 0.686, 0.168, 0, 0,
  0.272, 0.534, 0.131, 0, 0,
  0, 0, 0, 1, 0,
];

/** Film-look extras applied in the shader, scaled by filter intensity. */
export type FilterLook = {
  matrix: ColorMatrix;
  fade?: number;
  vignette?: number;
  grain?: number;
  glow?: number;
};

const look = (matrix: ColorMatrix, extra: Omit<FilterLook, 'matrix'> = {}): FilterLook => ({ matrix, ...extra });

const LOOKS: Record<string, FilterLook> = {
  natural: look(chain(contrast(0.06), saturation(0.06))),
  warm: look(chain(warmth(0.6), saturation(0.05))),
  cool: look(chain(warmth(-0.6), brightness(0.05))),
  vivid: look(chain(saturation(0.45), contrast(0.18))),
  soft_clean: look(chain(brightness(0.3), saturation(-0.12), contrast(-0.08)), { glow: 0.15 }),
  peach_skin: look(chain(warmth(0.35), tint(0.25), brightness(0.2))),
  rosy: look(chain(tint(0.5), brightness(0.12), saturation(0.08))),
  clear_face: look(chain(brightness(0.22), contrast(0.1), warmth(-0.1))),
  porcelain: look(chain(brightness(0.32), saturation(-0.25), warmth(-0.15)), { glow: 0.1 }),
  blush: look(chain(tint(0.45), warmth(0.2), brightness(0.1))),
  vintage: look(chain(lerpMatrix(SEPIA, 0.35), contrast(-0.1), warmth(0.25)), { fade: 0.25, vignette: 0.35, grain: 0.25 }),
  film: look(chain(contrast(0.12), saturation(-0.18), channels(1.02, 1, 0.94, 0, 0.01, 0.03)), { fade: 0.15, grain: 0.3 }),
  mono: look(chain(GRAY, contrast(0.12))),
  fade_film: look(chain(contrast(-0.2), saturation(-0.15), lift(0.08)), { grain: 0.2 }),
  kodak_gold: look(chain(warmth(0.7), saturation(0.2), contrast(0.08)), { grain: 0.2 }),
  fuji_green: look(chain(channels(0.97, 1.06, 0.97, 0, 0.015, 0.02), saturation(-0.05)), { fade: 0.1, grain: 0.2 }),
  noir: look(chain(GRAY, contrast(0.45), brightness(-0.05)), { vignette: 0.45, grain: 0.3 }),
  instant: look(chain(warmth(0.25), lift(0.07), saturation(-0.1)), { fade: 0.2, vignette: 0.25 }),
  cinematic_blue: look(chain(warmth(-0.5), contrast(0.25), saturation(-0.1)), { vignette: 0.3 }),
  cinematic_teal: look(chain(channels(1.04, 1, 0.94, 0, 0.02, 0.05), contrast(0.18), saturation(0.08)), { vignette: 0.25 }),
  matte: look(chain(contrast(-0.2), saturation(-0.15), lift(0.06)), { fade: 0.2 }),
  dreamy: look(chain(brightness(0.2), saturation(0.08), tint(0.15)), { glow: 0.45 }),
  moody_gray: look(chain(saturation(-0.45), contrast(0.12), warmth(-0.15)), { vignette: 0.3 }),
  latte: look(chain(lerpMatrix(SEPIA, 0.2), warmth(0.3), contrast(-0.08), brightness(0.08)), { fade: 0.15 }),
  neon: look(chain(saturation(0.7), contrast(0.25), tint(0.25))),
  pastel: look(chain(brightness(0.18), saturation(-0.25), lift(0.05), tint(0.12))),
  jeju_sea: look(chain(warmth(-0.35), saturation(0.3), brightness(0.06))),
  seoul_night: look(chain(warmth(-0.3), contrast(0.3), tint(0.15)), { vignette: 0.3 }),
  busan_wave: look(chain(warmth(-0.4), brightness(0.1), saturation(0.18))),
  gyeongju_gold: look(chain(warmth(0.55), lerpMatrix(SEPIA, 0.15), contrast(0.12)), { vignette: 0.2 }),
  gangwon_forest: look(chain(channels(0.96, 1.07, 0.95), saturation(0.15), contrast(0.08))),
  travel_pop: look(chain(saturation(0.4), contrast(0.15), brightness(0.04))),
  blue_hour: look(chain(warmth(-0.7), tint(0.2), contrast(0.1)), { vignette: 0.2 }),
  sun_trip: look(chain(warmth(0.6), brightness(0.12), saturation(0.15)), { glow: 0.15 }),
  food_pop: look(chain(saturation(0.45), warmth(0.25), contrast(0.12))),
  cafe_mood: look(chain(warmth(0.4), saturation(-0.1), contrast(-0.05), lerpMatrix(SEPIA, 0.12)), { fade: 0.12, vignette: 0.2 }),
  dessert: look(chain(tint(0.3), brightness(0.18), saturation(0.1))),
  fresh_salad: look(chain(channels(0.98, 1.06, 0.98), saturation(0.3), brightness(0.08))),
  spicy: look(chain(channels(1.08, 0.98, 0.94), saturation(0.35), contrast(0.15))),
  brunch: look(chain(warmth(0.35), brightness(0.15), saturation(0.1)), { glow: 0.1 }),
  night_fix: look(chain(brightness(0.35), contrast(0.12), saturation(0.1))),
  city_light: look(chain(warmth(0.3), contrast(0.25), saturation(0.2)), { glow: 0.2 }),
  club_neon: look(chain(tint(0.5), saturation(0.6), contrast(0.25)), { vignette: 0.3 }),
  midnight: look(chain(warmth(-0.6), brightness(-0.08), contrast(0.25), saturation(-0.15)), { vignette: 0.4 }),
  fireworks: look(chain(saturation(0.5), contrast(0.3), warmth(0.2)), { glow: 0.2 }),
  sakura: look(chain(tint(0.4), brightness(0.15), saturation(-0.05)), { glow: 0.15 }),
  summer: look(chain(saturation(0.35), brightness(0.1), warmth(-0.1), contrast(0.1))),
  autumn: look(chain(warmth(0.55), channels(1.04, 0.98, 0.92), saturation(0.15))),
  winter: look(chain(warmth(-0.45), brightness(0.15), saturation(-0.2))),
  rainy: look(chain(saturation(-0.35), warmth(-0.25), contrast(-0.05)), { fade: 0.15, vignette: 0.2 }),
  snow: look(chain(brightness(0.25), warmth(-0.2), saturation(-0.1)), { glow: 0.2 }),
  k_cute: look(chain(tint(0.3), brightness(0.15), saturation(0.1))),
  k_drama: look(chain(tint(0.12), contrast(0.08), brightness(0.08)), { glow: 0.2 }),
  idol: look(chain(brightness(0.2), saturation(0.15), contrast(0.08)), { glow: 0.12 }),
  daily_cam: look(chain(brightness(0.08), warmth(0.1), saturation(-0.05)), { grain: 0.1 }),
  aegyo: look(chain(tint(0.35), brightness(0.18), warmth(0.1)), { glow: 0.15 }),
  clean_k: look(chain(brightness(0.2), warmth(-0.2), saturation(-0.08))),
  bbosyap: look(chain(brightness(0.25), warmth(0.2), tint(0.1)), { glow: 0.3 }),
  sky: look(chain(warmth(-0.4), saturation(0.3), contrast(0.1))),
  portrait: look(chain(brightness(0.15), saturation(-0.05), warmth(0.1)), { glow: 0.2, vignette: 0.2 }),
  cinematic: look(chain(channels(1.03, 1, 0.95, 0, 0.015, 0.04), contrast(0.28), saturation(-0.08)), { vignette: 0.35 }),
  dehaze: look(chain(contrast(0.35), saturation(0.15), brightness(-0.03))),
  cream: look(chain(brightness(0.2), warmth(0.15), saturation(-0.12), lift(0.04)), { glow: 0.2 }),
  peach: look(chain(tint(0.3), warmth(0.35), brightness(0.15)), { glow: 0.1 }),
  lavender: look(chain(tint(0.3), warmth(-0.2), brightness(0.12)), { glow: 0.15 }),
  retro: look(chain(lerpMatrix(SEPIA, 0.25), contrast(0.1), warmth(0.3), channels(1.04, 0.98, 0.9)), {
    fade: 0.2,
    vignette: 0.35,
    grain: 0.35,
  }),
  disposable: look(chain(lift(0.05), warmth(0.2), contrast(0.08), saturation(-0.1), channels(1.02, 1, 0.95, 0, 0.01, 0.03)), {
    fade: 0.12,
    vignette: 0.2,
    grain: 0.4,
  }),
  manga: look(chain(GRAY, contrast(0.6), brightness(0.05)), { vignette: 0.2, grain: 0.15 }),
  maple: look(chain(warmth(0.6), channels(1.08, 0.98, 0.88), saturation(0.25), contrast(0.08))),
  ocean: look(chain(warmth(-0.45), saturation(0.35), channels(0.95, 1.02, 1.08, 0, 0.01, 0.02), brightness(0.05))),
  night_view: look(chain(warmth(-0.25), contrast(0.3), saturation(0.25), tint(0.1)), { glow: 0.3 }),
};

export type FilterOption = {
  id: string;
  label: string;
  group: string;
  color: string;
  effectKey: string;
};

const featureToFilter = (f: EditorFeature, group?: string): FilterOption => ({
  id: f.id,
  label: f.name.ko,
  group: group ?? f.group?.ko ?? '기본',
  color: f.previewColor ?? '#E0607E',
  effectKey: f.effectKey ?? '',
});

export const FILTERS: FilterOption[] = [
  ...EDITOR_FEATURES.filter((f) => f.category === 'ai').map((f) => featureToFilter(f, '자동 보정')),
  ...EDITOR_FEATURES.filter((f) => f.category === 'filter').map((f) => featureToFilter(f)),
].filter((f) => LOOKS[f.effectKey]);

export const FILTER_GROUPS = Array.from(new Set(FILTERS.map((f) => f.group)));

export function getFilter(id: string | null | undefined): FilterOption | undefined {
  return id ? FILTERS.find((f) => f.id === id) : undefined;
}

export function getFilterLook(id: string | null | undefined): FilterLook | undefined {
  const filter = getFilter(id);
  return filter ? LOOKS[filter.effectKey] : undefined;
}

export function buildColorMatrix(
  filterId: string | null,
  intensity: number,
  adjust: AdjustValues,
): ColorMatrix {
  const filterLook = getFilterLook(filterId);
  const filterMatrix = filterLook ? lerpMatrix(filterLook.matrix, intensity) : IDENTITY;
  return chain(
    filterMatrix,
    brightness(adjust.brightness),
    contrast(adjust.contrast),
    saturation(adjust.saturation),
    warmth(adjust.warmth),
    tint(adjust.tint),
  );
}

export function filterPreviewMatrix(filterId: string): ColorMatrix {
  return getFilterLook(filterId)?.matrix ?? IDENTITY;
}
