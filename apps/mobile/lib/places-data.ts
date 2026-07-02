import type { Place } from '@tingting/shared';
import PLACES_JSON from '@/constants/places.json';

/** Bundled seed places (food/stay/play/sight/event per region). */
export const BUNDLED_PLACES: Place[] = PLACES_JSON as Place[];

/** Merge API/local places with bundled defaults so category menus always have data. */
export function mergePlacesWithBundled(remote: Place[]): Place[] {
  const byId = new Map<string, Place>();
  for (const p of BUNDLED_PLACES) byId.set(p.id, p);
  for (const p of remote) {
    const bundled = byId.get(p.id);
    byId.set(
      p.id,
      bundled
        ? {
            ...bundled,
            ...p,
            name: p.name || bundled.name,
            description: p.description || bundled.description,
            category: p.category || bundled.category,
            imageUrl: p.imageUrl ?? bundled.imageUrl,
          }
        : p,
    );
  }
  return Array.from(byId.values());
}

export function filterPlacesByRegion(places: Place[], regionCode?: string): Place[] {
  if (!regionCode) return places;
  return places.filter((p) => p.regionCode === regionCode);
}
