import { REGIONS, type Place, type Visit } from '@tingting/shared';

export function getNationalTravelProgress(visitedRegionCodes: string[]) {
  const total = REGIONS.length;
  const visited = visitedRegionCodes.length;
  return {
    total,
    visited,
    ratio: total > 0 ? visited / total : 0,
  };
}

export function getRegionTravelProgress(
  regionCode: string,
  places: Place[],
  visits: Visit[],
  visitedRegionCodes: string[] = [],
) {
  const regionPlaces = places.filter((p) => p.regionCode === regionCode);
  const visitedPlaceIds = new Set(visits.map((v) => v.placeId));

  if (regionPlaces.length === 0) {
    const visited = visitedRegionCodes.includes(regionCode);
    return { total: 0, visited: visited ? 1 : 0, ratio: visited ? 1 : 0 };
  }

  const visited = regionPlaces.filter((p) => visitedPlaceIds.has(p.id)).length;
  const total = regionPlaces.length;
  const ratioFromPlaces = visited / total;
  const regionMarked = visitedRegionCodes.includes(regionCode);
  const ratio = regionMarked ? Math.max(ratioFromPlaces, 1 / total) : ratioFromPlaces;

  return { total, visited, ratio: Math.min(1, ratio) };
}
