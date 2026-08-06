import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { PhotoAdjustmentValues } from '@/lib/photo-effects';
import type { BeautyParams, FaceLandmarks, MakeupParams } from './types';
import { buildFilterColorMatrix, type ColorMatrix20 } from './filter-luts';

export type SkiaToneParams = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  warmth?: number;
};

export type SkiaComposeInput = {
  filterEffectKey?: string | null;
  beauty: BeautyParams;
  makeup: MakeupParams;
  adjustments: PhotoAdjustmentValues;
  face: FaceLandmarks | null;
  lensId?: string | null;
};

let skiaLoadAttempted = false;
let skiaAvailableCache: boolean | null = null;

export async function isSkiaAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (skiaAvailableCache != null) return skiaAvailableCache;
  if (skiaLoadAttempted) return false;
  skiaLoadAttempted = true;
  try {
    await import('@shopify/react-native-skia');
    skiaAvailableCache = true;
    return true;
  } catch {
    skiaAvailableCache = false;
    return false;
  }
}

export function isSkiaAvailableSync(): boolean {
  if (Platform.OS === 'web') return false;
  if (skiaAvailableCache != null) return skiaAvailableCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@shopify/react-native-skia');
    skiaAvailableCache = true;
    return true;
  } catch {
    skiaAvailableCache = false;
    return false;
  }
}

export function buildComposeColorMatrix(input: SkiaComposeInput): ColorMatrix20 {
  return buildFilterColorMatrix(input.filterEffectKey, input.beauty, input.adjustments);
}

export function describeSkiaTonePipeline(params: SkiaToneParams): string {
  const parts = Object.entries(params)
    .filter(([, v]) => typeof v === 'number' && Math.abs(v) > 0.01)
    .map(([k, v]) => `${k}:${Number(v).toFixed(2)}`);
  return parts.length ? `skia:${parts.join(',')}` : 'skia:identity';
}

type SnapshotCapable = {
  makeImageSnapshot?: () => { encodeToBase64?: (fmt?: unknown, quality?: number) => string } | null;
  makeImageSnapshotAsync?: () => Promise<{ encodeToBase64?: (fmt?: unknown, quality?: number) => string } | null>;
};

/** Encode a Skia canvas snapshot to a cache JPEG file URI. */
export async function exportSkiaCanvasToJpeg(
  canvasRef: { current: SnapshotCapable | null },
  filename = `tingting_skia_${Date.now()}.jpg`,
): Promise<string> {
  const canvas = canvasRef.current;
  if (!canvas) throw new Error('Skia canvas missing');

  let snapshot =
    typeof canvas.makeImageSnapshotAsync === 'function'
      ? await canvas.makeImageSnapshotAsync()
      : canvas.makeImageSnapshot?.() ?? null;

  if (!snapshot?.encodeToBase64) throw new Error('Skia snapshot failed');

  let ImageFormat: { JPEG?: unknown } | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ImageFormat = require('@shopify/react-native-skia').ImageFormat;
  } catch {
    ImageFormat = undefined;
  }

  const base64 = ImageFormat?.JPEG
    ? snapshot.encodeToBase64(ImageFormat.JPEG, 92)
    : snapshot.encodeToBase64();

  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error('No cache directory');
  const path = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}
