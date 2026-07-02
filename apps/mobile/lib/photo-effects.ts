import type { ViewStyle } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

export type PhotoEffectKey =
  | 'natural'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'film'
  | 'jeju_sea'
  | 'vivid'
  | 'mono'
  | 'sunset'
  | 'bbosyap'
  | 'sky'
  | 'portrait'
  | 'cinematic'
  | 'travel_pop'
  | 'night_fix'
  | 'vignette'
  | 'grain'
  | 'polaroid'
  | 'film_frame'
  | 'seoul'
  | 'round';

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

const PRESETS: Record<PhotoEffectKey, PhotoEffectPreset> = {
  natural: { overlays: [] },
  warm: { overlays: [{ backgroundColor: '#F59E0B', opacity: 0.14 }] },
  cool: { overlays: [{ backgroundColor: '#38BDF8', opacity: 0.16 }] },
  vintage: {
    overlays: [
      { backgroundColor: '#92400E', opacity: 0.18 },
      { backgroundColor: '#1C1917', opacity: 0.08 },
    ],
  },
  film: {
    overlays: [{ backgroundColor: '#44403C', opacity: 0.12 }],
    frame: { borderWidth: 10, borderColor: '#1C1917', padding: 4, backgroundColor: '#0C0A09' },
  },
  jeju_sea: {
    overlays: [
      { backgroundColor: '#0EA5E9', opacity: 0.2 },
      { backgroundColor: '#FFFFFF', opacity: 0.06 },
    ],
  },
  vivid: { overlays: [{ backgroundColor: '#EC4899', opacity: 0.12 }, { backgroundColor: '#FACC15', opacity: 0.08 }] },
  mono: { overlays: [{ backgroundColor: '#64748B', opacity: 0.45 }], imageOpacity: 0.88 },
  sunset: { overlays: [{ backgroundColor: '#F97316', opacity: 0.22 }, { backgroundColor: '#EC4899', opacity: 0.1 }] },
  bbosyap: {
    overlays: [
      { backgroundColor: '#FFF7ED', opacity: 0.2 },
      { backgroundColor: '#FDE68A', opacity: 0.08 },
    ],
  },
  sky: {
    overlays: [
      { backgroundColor: '#0EA5E9', opacity: 0.24, style: { height: '42%', alignSelf: 'stretch' } },
      { backgroundColor: '#FFFFFF', opacity: 0.05 },
    ],
  },
  portrait: {
    overlays: [
      { backgroundColor: '#FDF2F8', opacity: 0.12 },
      { backgroundColor: '#000000', opacity: 0.18, style: { borderRadius: 9999 } },
    ],
  },
  cinematic: {
    overlays: [
      { backgroundColor: '#1E1B4B', opacity: 0.22 },
      { backgroundColor: '#000000', opacity: 0.35, style: { height: '12%', alignSelf: 'stretch' } },
      { backgroundColor: '#000000', opacity: 0.35, style: { height: '12%', alignSelf: 'stretch', marginTop: 'auto' } },
    ],
    frame: { borderWidth: 2, borderColor: '#312E81', padding: 2 },
  },
  travel_pop: {
    overlays: [
      { backgroundColor: '#22C55E', opacity: 0.1 },
      { backgroundColor: '#3B82F6', opacity: 0.12 },
      { backgroundColor: '#F97316', opacity: 0.1 },
    ],
  },
  night_fix: {
    overlays: [
      { backgroundColor: '#FEF3C7', opacity: 0.18 },
      { backgroundColor: '#FFFFFF', opacity: 0.08 },
    ],
  },
  vignette: {
    overlays: [{ backgroundColor: '#000000', opacity: 0.28, style: { borderRadius: 9999 } }],
  },
  grain: { overlays: [{ backgroundColor: '#FFFFFF', opacity: 0.06 }, { backgroundColor: '#000000', opacity: 0.05 }] },
  polaroid: {
    overlays: [],
    frame: { borderWidth: 12, borderColor: '#FAFAF9', padding: 8, backgroundColor: '#FAFAF9', borderRadius: 4 },
  },
  film_frame: {
    overlays: [],
    frame: { borderWidth: 14, borderColor: '#1C1917', padding: 6, backgroundColor: '#0C0A09' },
  },
  seoul: {
    frame: { borderWidth: 8, borderColor: '#6366F1', padding: 4, backgroundColor: '#1E1B4B' },
    overlays: [{ backgroundColor: '#818CF8', opacity: 0.1 }],
  },
  round: {
    overlays: [],
    frame: { borderRadius: 9999, borderWidth: 6, borderColor: '#FFFFFF', padding: 4 },
  },
};

export function getPhotoEffectPreset(key?: string | null): PhotoEffectPreset {
  if (!key) return PRESETS.natural;
  return PRESETS[key as PhotoEffectKey] ?? PRESETS.natural;
}

export async function applyPhotoAdjust(
  uri: string,
  effectKey: 'rotate' | 'flip' | 'crop_square',
): Promise<string> {
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
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const { Image } = require('react-native');
    Image.getSize(info.uri, (width: number, height: number) => resolve({ width, height }), reject);
  });
  const side = Math.min(size.width, size.height);
  const originX = Math.floor((size.width - side) / 2);
  const originY = Math.floor((size.height - side) / 2);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop: { originX, originY, width: side, height: side } }, { resize: { width: 1080 } }],
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
