import { FEATURED_PLACE_IDS, GPS_QUEST_RADIUS_METERS, PLACE_CATEGORY_BY_MENU } from './constants';
import { REGION_MAIN_STATIONS } from './region-stations';
import type { Place } from './types';

const TRAVEL_INFO_CATEGORIES = new Set(Object.values(PLACE_CATEGORY_BY_MENU).flat());
const STATION_PLACE_IDS = new Set(REGION_MAIN_STATIONS.map((s) => s.placeId));

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 여행 정보(장소 탭)에 노출되는 추천 장소 */
export function getRegionTravelInfoPlaces(places: Place[], regionCode: string): Place[] {
  return places
    .filter(
      (p) =>
        p.regionCode === regionCode &&
        TRAVEL_INFO_CATEGORIES.has(p.category) &&
        !STATION_PLACE_IDS.has(p.id),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/** GPS 좌표 기준 가장 가까운 미방문 추천 장소 */
export function findNearbyUnvisitedRecommendedPlace(
  places: Place[],
  regionCode: string,
  lat: number,
  lng: number,
  visitedPlaceIds: Iterable<string>,
  radiusMeters = GPS_QUEST_RADIUS_METERS,
): Place | null {
  const visited = new Set(visitedPlaceIds);
  const candidates = getRegionTravelInfoPlaces(places, regionCode)
    .filter((place) => !visited.has(place.id))
    .map((place) => ({ place, dist: distanceMeters(lat, lng, place.lat, place.lng) }))
    .filter((item) => item.dist <= radiusMeters)
    .sort((a, b) => a.dist - b.dist);
  return candidates[0]?.place ?? null;
}

/** GPS 좌표 기준 가장 가까운 추천 장소 (방문 여부 무관) */
export function findNearbyRecommendedPlace(
  places: Place[],
  regionCode: string,
  lat: number,
  lng: number,
  radiusMeters = GPS_QUEST_RADIUS_METERS,
): Place | null {
  const candidates = getRegionTravelInfoPlaces(places, regionCode)
    .map((place) => ({ place, dist: distanceMeters(lat, lng, place.lat, place.lng) }))
    .filter((item) => item.dist <= radiusMeters)
    .sort((a, b) => a.dist - b.dist);
  return candidates[0]?.place ?? null;
}

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
