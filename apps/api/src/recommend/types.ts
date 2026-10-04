import type { RecommendedPlace } from '@tingting/shared';

export const PAGE_SIZE = 15;

export interface ProviderPage {
  items: RecommendedPlace[];
  hasMore: boolean;
}

export interface SearchPoint {
  lat: number;
  lng: number;
  /** Meters */
  radius: number;
}

/** ~110 m grid so nearby searches from almost the same spot share a cache entry. */
export function pointKey({ lat, lng, radius }: SearchPoint): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
}

export function slicePage<T>(all: T[], page: number): { items: T[]; hasMore: boolean } {
  const start = (page - 1) * PAGE_SIZE;
  return { items: all.slice(start, start + PAGE_SIZE), hasMore: all.length > start + PAGE_SIZE };
}
