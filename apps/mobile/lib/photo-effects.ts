import { Image, type ViewStyle } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export type PhotoEffectKey = string;

export interface PhotoOverlayLayer {
  backgroundColor?: string;
  opacity?: number;
  style?: ViewStyle;
}

export interface PhotoFrameStyle {
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  backgroundColor?: string;
}

export interface PhotoEffectPreset {
  overlays: PhotoOverlayLayer[];
  frame?: PhotoFrameStyle;
  imageOpacity?: number;
}

export interface PhotoAdjustmentValues {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  tint: number;
  fade: number;
  highlights: number;
  shadows: number;
  vignette: number;
  grain: number;
}

export const DEFAULT_ADJUSTMENTS: PhotoAdjustmentValues = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  tint: 0,
  fade: 0,
  highlights: 0,
  shadows: 0,
  vignette: 0,
  grain: 0,
};

export type PhotoTransformKey =
  | 'rotate'
  | 'flip'
  | 'crop_square'
  | 'crop_portrait'
  | 'crop_story'
  | 'crop_wide';

const layer = (
  backgroundColor: string,
  opacity: number,
  style?: ViewStyle,
): PhotoOverlayLayer => ({ backgroundColor, opacity, style });

const preset = (
  overlays: PhotoOverlayLayer[],
  frame?: PhotoFrameStyle,
  imageOpacity?: number,
): PhotoEffectPreset => ({ overlays, frame, imageOpacity });

const PRESETS: Record<PhotoEffectKey, PhotoEffectPreset> = {
  natural: { overlays: [] },
  warm: preset([layer('#F59E0B', 0.14)]),
  cool: preset([layer('#38BDF8', 0.16)]),
  vivid: preset([layer('#EC4899', 0.12), layer('#FACC15', 0.08)]),
  soft_clean: preset([layer('#FFFFFF', 0.12), layer('#FBCFE8', 0.08)]),
  peach_skin: preset([layer('#FDBA74', 0.16), layer('#FFFFFF', 0.07)]),
  rosy: preset([layer('#FB7185', 0.14)]),
  clear_face: preset([layer('#CCFBF1', 0.12), layer('#FFFFFF', 0.07)]),
  porcelain: preset([layer('#F8FAFC', 0.18), layer('#E0F2FE', 0.08)]),
  blush: preset([layer('#FDA4AF', 0.16), layer('#FFFFFF', 0.05)]),
  vintage: preset([layer('#92400E', 0.18), layer('#1C1917', 0.08)]),
  film: preset([layer('#44403C', 0.12)], { borderWidth: 10, borderColor: '#1C1917', padding: 4, backgroundColor: '#0C0A09' }),
  mono: preset([layer('#64748B', 0.45)], undefined, 0.88),
  fade_film: preset([layer('#E7E5E4', 0.18), layer('#292524', 0.06)], undefined, 0.94),
  kodak_gold: preset([layer('#FBBF24', 0.18), layer('#7C2D12', 0.07)]),
  fuji_green: preset([layer('#65A30D', 0.15), layer('#14B8A6', 0.08)]),
  noir: preset([layer('#020617', 0.42), layer('#FFFFFF', 0.04)], undefined, 0.82),
  instant: preset([layer('#FEF3C7', 0.16), layer('#A8A29E', 0.08)]),
  cinematic_blue: preset([layer('#1E3A8A', 0.24), layer('#000000', 0.2)]),
  cinematic_teal: preset([layer('#0F766E', 0.2), layer('#111827', 0.14)]),
  matte: preset([layer('#A8A29E', 0.14), layer('#FFFFFF', 0.05)]),
  dreamy: preset([layer('#DDD6FE', 0.2), layer('#FFFFFF', 0.08)]),
  moody_gray: preset([layer('#475569', 0.2), layer('#0F172A', 0.12)]),
  latte: preset([layer('#C08457', 0.15), layer('#FEF3C7', 0.07)]),
  neon: preset([layer('#A855F7', 0.16), layer('#06B6D4', 0.08)]),
  pastel: preset([layer('#F9A8D4', 0.12), layer('#BFDBFE', 0.09)]),
  jeju_sea: preset([layer('#0EA5E9', 0.2), layer('#FFFFFF', 0.06)]),
  seoul_night: preset([layer('#312E81', 0.24), layer('#FACC15', 0.05)]),
  busan_wave: preset([layer('#0284C7', 0.18), layer('#ECFEFF', 0.06)]),
  gyeongju_gold: preset([layer('#CA8A04', 0.17), layer('#451A03', 0.06)]),
  gangwon_forest: preset([layer('#15803D', 0.18), layer('#DCFCE7', 0.06)]),
  travel_pop: preset([layer('#22C55E', 0.1), layer('#3B82F6', 0.12), layer('#F97316', 0.1)]),
  blue_hour: preset([layer('#2563EB', 0.2), layer('#7C3AED', 0.09)]),
  sun_trip: preset([layer('#FDE047', 0.16), layer('#F97316', 0.08)]),
  food_pop: preset([layer('#EF4444', 0.13), layer('#FACC15', 0.1)]),
  cafe_mood: preset([layer('#92400E', 0.16), layer('#FEF3C7', 0.08)]),
  dessert: preset([layer('#F9A8D4', 0.15), layer('#FFFFFF', 0.06)]),
  fresh_salad: preset([layer('#84CC16', 0.14), layer('#ECFCCB', 0.06)]),
  spicy: preset([layer('#DC2626', 0.16), layer('#F97316', 0.08)]),
  brunch: preset([layer('#FDBA74', 0.14), layer('#FEF9C3', 0.08)]),
  night_fix: preset([layer('#FEF3C7', 0.18), layer('#FFFFFF', 0.08)]),
  city_light: preset([layer('#FACC15', 0.12), layer('#1E1B4B', 0.18)]),
  club_neon: preset([layer('#DB2777', 0.18), layer('#06B6D4', 0.08)]),
  midnight: preset([layer('#0F172A', 0.28), layer('#60A5FA', 0.05)]),
  fireworks: preset([layer('#F97316', 0.14), layer('#A855F7', 0.1)]),
  sakura: preset([layer('#F9A8D4', 0.16), layer('#FFFFFF', 0.06)]),
  summer: preset([layer('#06B6D4', 0.14), layer('#FDE047', 0.08)]),
  autumn: preset([layer('#EA580C', 0.18), layer('#78350F', 0.06)]),
  winter: preset([layer('#BAE6FD', 0.18), layer('#FFFFFF', 0.08)]),
  rainy: preset([layer('#64748B', 0.18), layer('#DBEAFE', 0.05)]),
  snow: preset([layer('#EFF6FF', 0.22), layer('#BAE6FD', 0.08)]),
  k_cute: preset([layer('#FB7185', 0.13), layer('#FBCFE8', 0.08)]),
  k_drama: preset([layer('#C4B5FD', 0.14), layer('#FFFFFF', 0.06)]),
  idol: preset([layer('#F472B6', 0.15), layer('#A78BFA', 0.08)]),
  daily_cam: preset([layer('#E2E8F0', 0.11), layer('#FDE68A', 0.06)]),
  aegyo: preset([layer('#FBCFE8', 0.18), layer('#FFFFFF', 0.07)]),
  clean_k: preset([layer('#DBEAFE', 0.14), layer('#FFFFFF', 0.08)]),
  bbosyap: preset([layer('#FFF7ED', 0.2), layer('#FDE68A', 0.08)]),
  sky: preset([layer('#0EA5E9', 0.24, { height: '42%', alignSelf: 'stretch' }), layer('#FFFFFF', 0.05)]),
  portrait: preset([layer('#FDF2F8', 0.12), layer('#000000', 0.18, { borderRadius: 9999 })]),
  cinematic: preset(
    [
      layer('#1E1B4B', 0.22),
      layer('#000000', 0.35, { height: '12%', alignSelf: 'stretch' }),
      layer('#000000', 0.35, { height: '12%', alignSelf: 'stretch', marginTop: 'auto' }),
    ],
    { borderWidth: 2, borderColor: '#312E81', padding: 2 },
  ),
  dehaze: preset([layer('#FFFFFF', 0.08), layer('#0F172A', 0.05)]),
  vignette: preset([layer('#000000', 0.28, { borderRadius: 9999 })]),
  grain: preset([layer('#FFFFFF', 0.06), layer('#000000', 0.05)]),
  light_leak: preset([layer('#F97316', 0.18, { width: '42%', alignSelf: 'flex-end' }), layer('#FDE68A', 0.08)]),
  prism: preset([layer('#EC4899', 0.1, { width: '35%' }), layer('#22D3EE', 0.1, { width: '35%', marginLeft: 'auto' })]),
  dust: preset([layer('#FFFFFF', 0.05), layer('#A8A29E', 0.05)]),
  soft_blur: preset([layer('#FFFFFF', 0.12), layer('#E9D5FF', 0.05)], undefined, 0.96),
  spotlight: preset([layer('#000000', 0.2), layer('#FFFFFF', 0.08, { borderRadius: 9999, margin: 48 })]),
  sunflare: preset([layer('#FDE047', 0.16, { width: '55%', height: '55%', borderRadius: 9999 }), layer('#FFFFFF', 0.05)]),
  polaroid: preset([], { borderWidth: 12, borderColor: '#FAFAF9', padding: 8, backgroundColor: '#FAFAF9', borderRadius: 4 }),
  film_frame: preset([], { borderWidth: 14, borderColor: '#1C1917', padding: 6, backgroundColor: '#0C0A09' }),
  seoul: preset([layer('#818CF8', 0.1)], { borderWidth: 8, borderColor: '#6366F1', padding: 4, backgroundColor: '#1E1B4B' }),
  round: preset([], { borderRadius: 9999, borderWidth: 6, borderColor: '#FFFFFF', padding: 4 }),
  white_clean: preset([], { borderWidth: 8, borderColor: '#FFFFFF', padding: 5, backgroundColor: '#FFFFFF', borderRadius: 12 }),
  black_matte: preset([], { borderWidth: 10, borderColor: '#111827', padding: 5, backgroundColor: '#020617', borderRadius: 10 }),
  postcard: preset([layer('#FEF3C7', 0.05)], { borderWidth: 12, borderColor: '#F8FAFC', padding: 10, backgroundColor: '#F8FAFC' }),
  stamp: preset([], { borderWidth: 6, borderColor: '#E11D48', padding: 8, backgroundColor: '#FFF1F2', borderRadius: 8 }),
  neon_pink_frame: preset([layer('#EC4899', 0.05)], { borderWidth: 7, borderColor: '#EC4899', padding: 5, backgroundColor: '#500724' }),
  sky_frame: preset([], { borderWidth: 7, borderColor: '#7DD3FC', padding: 5, backgroundColor: '#E0F2FE' }),
  gold_frame: preset([layer('#FACC15', 0.06)], { borderWidth: 8, borderColor: '#D97706', padding: 5, backgroundColor: '#FEF3C7' }),
  soft_shadow: preset([], { borderWidth: 4, borderColor: '#CBD5E1', padding: 8, backgroundColor: '#F8FAFC', borderRadius: 16 }),
};

export function getPhotoEffectPreset(key?: string | null): PhotoEffectPreset {
  if (!key) return PRESETS.natural;
  return PRESETS[key as PhotoEffectKey] ?? PRESETS.natural;
}

function adjustmentLayer(value: number, positive: string, negative: string, maxOpacity: number) {
  if (value === 0) return null;
  return layer(value > 0 ? positive : negative, Math.min(Math.abs(value) * maxOpacity, maxOpacity));
}

export function getPhotoAdjustmentPreset(values: PhotoAdjustmentValues): PhotoEffectPreset {
  const overlays = [
    adjustmentLayer(values.brightness, '#FFFFFF', '#000000', 0.24),
    adjustmentLayer(values.contrast, '#000000', '#FFFFFF', 0.12),
    adjustmentLayer(values.saturation, '#EC4899', '#64748B', 0.14),
    adjustmentLayer(values.warmth, '#F97316', '#38BDF8', 0.16),
    adjustmentLayer(values.tint, '#D946EF', '#22C55E', 0.14),
    adjustmentLayer(values.fade, '#E7E5E4', '#000000', 0.16),
    adjustmentLayer(values.highlights, '#FFFFFF', '#F59E0B', 0.14),
    adjustmentLayer(values.shadows, '#FEF3C7', '#020617', 0.16),
    values.vignette > 0 ? layer('#000000', values.vignette * 0.32, { borderRadius: 9999 }) : null,
    values.grain > 0 ? layer('#FFFFFF', values.grain * 0.08) : null,
    values.grain > 0 ? layer('#000000', values.grain * 0.06) : null,
  ].filter(Boolean) as PhotoOverlayLayer[];

  return { overlays };
}

function getImageSize(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width: number, height: number) => resolve({ width, height }), reject);
  });
}

function getCenteredCrop(size: { width: number; height: number }, ratio: number) {
  const currentRatio = size.width / size.height;
  if (currentRatio > ratio) {
    const width = Math.floor(size.height * ratio);
    return {
      originX: Math.floor((size.width - width) / 2),
      originY: 0,
      width,
      height: size.height,
    };
  }
  const height = Math.floor(size.width / ratio);
  return {
    originX: 0,
    originY: Math.floor((size.height - height) / 2),
    width: size.width,
    height,
  };
}

export function isPhotoTransformKey(effectKey?: string | null): effectKey is PhotoTransformKey {
  return (
    effectKey === 'rotate' ||
    effectKey === 'flip' ||
    effectKey === 'crop_square' ||
    effectKey === 'crop_portrait' ||
    effectKey === 'crop_story' ||
    effectKey === 'crop_wide'
  );
}

export async function applyPhotoAdjust(uri: string, effectKey: PhotoTransformKey): Promise<string> {
  if (effectKey === 'rotate') {
    const result = await ImageManipulator.manipulateAsync(uri, [{ rotate: 90 }], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  }
  if (effectKey === 'flip') {
    const result = await ImageManipulator.manipulateAsync(uri, [{ flip: ImageManipulator.FlipType.Horizontal }], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  }

  const info = await ImageManipulator.manipulateAsync(uri, [], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
  const size = await getImageSize(info.uri);
  const ratio =
    effectKey === 'crop_portrait'
      ? 4 / 5
      : effectKey === 'crop_story'
        ? 9 / 16
        : effectKey === 'crop_wide'
          ? 16 / 9
          : 1;
  const crop = getCenteredCrop(size, ratio);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop }, { resize: { width: effectKey === 'crop_story' ? 1080 : 1200 } }],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export async function normalizePhotoUri(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], {
    compress: 0.92,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}
