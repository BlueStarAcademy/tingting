import type { PhotoAdjustmentValues } from '@/lib/photo-effects';
import type { BeautyParams } from './types';

/** 4x5 ColorMatrix (row-major) used by Skia `<ColorMatrix />` */
export type ColorMatrix20 = number[];

const IDENTITY: ColorMatrix20 = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function multiplyMatrices(a: ColorMatrix20, b: ColorMatrix20): ColorMatrix20 {
  const out = new Array(20).fill(0) as ColorMatrix20;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      out[row * 5 + col] =
        a[row * 5 + 0] * b[0 * 5 + col] +
        a[row * 5 + 1] * b[1 * 5 + col] +
        a[row * 5 + 2] * b[2 * 5 + col] +
        a[row * 5 + 3] * b[3 * 5 + col] +
        (col === 4 ? a[row * 5 + 4] : 0);
    }
  }
  return out;
}

function brightnessMatrix(amount: number): ColorMatrix20 {
  const t = amount * 0.22;
  return [
    1, 0, 0, 0, t,
    0, 1, 0, 0, t,
    0, 0, 1, 0, t,
    0, 0, 0, 1, 0,
  ];
}

function contrastMatrix(amount: number): ColorMatrix20 {
  const c = 1 + amount * 0.45;
  const t = 0.5 * (1 - c);
  return [
    c, 0, 0, 0, t,
    0, c, 0, 0, t,
    0, 0, c, 0, t,
    0, 0, 0, 1, 0,
  ];
}

function saturationMatrix(amount: number): ColorMatrix20 {
  const s = 1 + amount * 0.7;
  const inv = 1 - s;
  const R = 0.2126 * inv;
  const G = 0.7152 * inv;
  const B = 0.0722 * inv;
  return [
    R + s, G, B, 0, 0,
    R, G + s, B, 0, 0,
    R, G, B + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

function warmthMatrix(amount: number): ColorMatrix20 {
  return [
    1 + amount * 0.12, 0, 0, 0, amount * 0.04,
    0, 1 + amount * 0.04, 0, 0, 0,
    0, 0, 1 - amount * 0.14, 0, amount * -0.02,
    0, 0, 0, 1, 0,
  ];
}

function tintMatrix(amount: number): ColorMatrix20 {
  return [
    1 + amount * 0.08, 0, 0, 0, 0,
    0, 1 - Math.abs(amount) * 0.04, 0, 0, amount * 0.03,
    0, 0, 1 - amount * 0.08, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** Named filter → base color grade */
const FILTER_MATRICES: Record<string, ColorMatrix20> = {
  natural: IDENTITY,
  warm: warmthMatrix(0.55),
  cool: warmthMatrix(-0.55),
  vivid: multiplyMatrices(saturationMatrix(0.55), contrastMatrix(0.2)),
  soft_clean: multiplyMatrices(brightnessMatrix(0.25), saturationMatrix(-0.1)),
  peach_skin: multiplyMatrices(warmthMatrix(0.45), brightnessMatrix(0.15)),
  rosy: multiplyMatrices(tintMatrix(0.35), brightnessMatrix(0.1)),
  clear_face: multiplyMatrices(brightnessMatrix(0.2), contrastMatrix(0.1)),
  porcelain: multiplyMatrices(brightnessMatrix(0.28), saturationMatrix(-0.15)),
  blush: multiplyMatrices(tintMatrix(0.4), warmthMatrix(0.2)),
  vintage: multiplyMatrices(warmthMatrix(0.35), saturationMatrix(-0.35)),
  film: multiplyMatrices(contrastMatrix(0.15), saturationMatrix(-0.2)),
  mono: [
    0.33, 0.33, 0.33, 0, 0,
    0.33, 0.33, 0.33, 0, 0,
    0.33, 0.33, 0.33, 0, 0,
    0, 0, 0, 1, 0,
  ],
  fade_film: multiplyMatrices(contrastMatrix(-0.25), brightnessMatrix(0.12)),
  kodak_gold: multiplyMatrices(warmthMatrix(0.65), saturationMatrix(0.2)),
  fuji_green: [
    1, 0, 0, 0, 0,
    0, 1.08, 0, 0, 0.02,
    0, 0, 0.92, 0, 0,
    0, 0, 0, 1, 0,
  ],
  noir: multiplyMatrices(
    [
      0.3, 0.3, 0.3, 0, 0,
      0.3, 0.3, 0.3, 0, 0,
      0.3, 0.3, 0.3, 0, 0,
      0, 0, 0, 1, 0,
    ],
    contrastMatrix(0.35),
  ),
  cinematic_blue: multiplyMatrices(warmthMatrix(-0.4), contrastMatrix(0.25)),
  cinematic_teal: multiplyMatrices(warmthMatrix(-0.25), saturationMatrix(0.15)),
  matte: multiplyMatrices(contrastMatrix(-0.2), saturationMatrix(-0.15)),
  dreamy: multiplyMatrices(brightnessMatrix(0.18), saturationMatrix(0.1)),
  neon: multiplyMatrices(saturationMatrix(0.7), contrastMatrix(0.2)),
  pastel: multiplyMatrices(brightnessMatrix(0.15), saturationMatrix(-0.2)),
  jeju_sea: multiplyMatrices(warmthMatrix(-0.35), saturationMatrix(0.25)),
  seoul_night: multiplyMatrices(warmthMatrix(-0.2), contrastMatrix(0.3)),
  busan_wave: multiplyMatrices(warmthMatrix(-0.3), brightnessMatrix(0.08)),
  food_pop: multiplyMatrices(saturationMatrix(0.45), warmthMatrix(0.25)),
  night_fix: multiplyMatrices(brightnessMatrix(0.35), contrastMatrix(0.15)),
  sakura: multiplyMatrices(tintMatrix(0.3), brightnessMatrix(0.12)),
  snow: multiplyMatrices(brightnessMatrix(0.22), warmthMatrix(-0.15)),
  idol: multiplyMatrices(brightnessMatrix(0.2), saturationMatrix(0.2)),
  aegyo: multiplyMatrices(tintMatrix(0.35), brightnessMatrix(0.15)),
  bbosyap: multiplyMatrices(brightnessMatrix(0.25), warmthMatrix(0.3)),
  portrait: multiplyMatrices(brightnessMatrix(0.18), saturationMatrix(-0.05)),
  cinematic: multiplyMatrices(warmthMatrix(-0.2), contrastMatrix(0.28)),
  sky: multiplyMatrices(warmthMatrix(-0.4), saturationMatrix(0.3)),
  travel_pop: multiplyMatrices(saturationMatrix(0.4), contrastMatrix(0.15)),
  dehaze: multiplyMatrices(contrastMatrix(0.35), brightnessMatrix(0.1)),
  k_cute: multiplyMatrices(tintMatrix(0.3), brightnessMatrix(0.12)),
  k_drama: multiplyMatrices(tintMatrix(0.15), contrastMatrix(0.1)),
};

export function buildFilterColorMatrix(
  filterEffectKey: string | null | undefined,
  beauty: BeautyParams,
  adjustments: PhotoAdjustmentValues,
): ColorMatrix20 {
  let matrix = FILTER_MATRICES[filterEffectKey ?? ''] ?? IDENTITY;

  matrix = multiplyMatrices(matrix, brightnessMatrix(adjustments.brightness + beauty.whiten * 0.35));
  matrix = multiplyMatrices(matrix, contrastMatrix(adjustments.contrast + beauty.clarity * 0.25));
  matrix = multiplyMatrices(matrix, saturationMatrix(adjustments.saturation - beauty.smooth * 0.08));
  matrix = multiplyMatrices(matrix, warmthMatrix(adjustments.warmth + beauty.smooth * 0.12));
  matrix = multiplyMatrices(matrix, tintMatrix(adjustments.tint));

  if (adjustments.fade > 0.01) {
    matrix = multiplyMatrices(matrix, contrastMatrix(-adjustments.fade * 0.4));
    matrix = multiplyMatrices(matrix, brightnessMatrix(adjustments.fade * 0.15));
  }
  if (adjustments.highlights !== 0) {
    matrix = multiplyMatrices(matrix, brightnessMatrix(adjustments.highlights * 0.12));
  }
  if (adjustments.shadows !== 0) {
    matrix = multiplyMatrices(matrix, brightnessMatrix(adjustments.shadows * 0.08));
  }

  return matrix;
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
}
