import { FEATURED_PLACE_IDS } from './constants';
import type { Place } from './types';

/** 추천 여행지 목록 구성 (홈·API 공통) */
export function pickRecommendedPlaces(
  places: Place[],
  limit = 6,
  visitedRegionCodes: string[] = [],
): Place[] {
  const byId = new Map(places.map((p) => [p.id, p]));
  const picked: Place[] = [];
  const usedIds = new Set<string>();

  for (const id of FEATURED_PLACE_IDS) {
    if (picked.length >= limit) break;
    const place = byId.get(id);
    if (!place || usedIds.has(place.id)) continue;
    usedIds.add(place.id);
    picked.push(place);
  }

  if (picked.length >= limit) return picked;

  const visited = new Set(visitedRegionCodes);
  const unvisitedPool = places.filter((p) => !visited.has(p.regionCode));
  const pool = unvisitedPool.length > 0 ? unvisitedPool : places;
  const usedRegions = new Set(picked.map((p) => p.regionCode));

  for (const place of pool) {
    if (picked.length >= limit) break;
    if (usedIds.has(place.id)) continue;
    if (usedRegions.has(place.regionCode)) continue;
    usedIds.add(place.id);
    usedRegions.add(place.regionCode);
    picked.push(place);
  }

  if (picked.length < limit) {
    for (const place of places) {
      if (picked.length >= limit) break;
      if (usedIds.has(place.id)) continue;
      usedIds.add(place.id);
      picked.push(place);
    }
  }

  return picked;
}
