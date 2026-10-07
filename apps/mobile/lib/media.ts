import { PixelRatio } from 'react-native';

const FILES_PATH = '/media/files/';
/** Must match SIZES in apps/api/src/media-thumbs.ts. */
const SIZES = [160, 320, 480, 720, 1080, 1440];

/**
 * A server-resized JPEG for an uploaded photo, at least `layoutSize` dp on its short edge.
 * Grids must never decode the full-size originals: Android's <Image> only downsamples local files,
 * so every remote original is decoded at full resolution (~20 MB per 2560px bitmap).
 * Non-API URIs (device files, external images) are returned unchanged.
 */
export function thumbUri(uri: string, layoutSize: number): string;
export function thumbUri(uri: string | null | undefined, layoutSize: number): string | undefined;
export function thumbUri(uri: string | null | undefined, layoutSize: number): string | undefined {
  if (!uri) return undefined;
  const idx = uri.indexOf(FILES_PATH);
  if (idx < 0 || !/^https?:\/\//i.test(uri) || uri.includes('?')) return uri;
  const px = PixelRatio.getPixelSizeForLayoutSize(layoutSize);
  const size = SIZES.find((s) => s >= px) ?? SIZES[SIZES.length - 1];
  const name = uri.slice(idx + FILES_PATH.length);
  return `${uri.slice(0, idx)}/media/thumb/${name}?s=${size}`;
}
