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

/** Web: Skia native module is unavailable during static export. */
export async function isSkiaAvailable(): Promise<boolean> {
  return false;
}

export function isSkiaAvailableSync(): boolean {
  return false;
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

export async function exportSkiaCanvasToJpeg(
  _canvasRef: { current: unknown },
  _filename?: string,
): Promise<string> {
  throw new Error('Skia export is not available on web');
}
