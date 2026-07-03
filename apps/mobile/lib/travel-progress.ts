import {
  REGIONS,
  PLACE_CATEGORY_BY_MENU,
  GROUP_REGION_REVIEW_PROGRESS_TARGET,
  type Place,
  type Visit,
  type RegionMenuCategory,
} from '@tingting/shared';

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

export function isPhotoReviewVisit(visit: Visit): boolean {
  return Boolean((visit.editedPhotoUri ?? visit.photoUri) && visit.note?.trim());
}

export function getGroupRegionReviewProgress(
  regionCode: string,
  places: Place[],
  visits: Visit[],
) {
  const regionPlaceIds = new Set(places.filter((p) => p.regionCode === regionCode).map((p) => p.id));
  const reviewCount = visits.filter(
    (visit) => visit.groupId && regionPlaceIds.has(visit.placeId) && isPhotoReviewVisit(visit),
  ).length;
  const total = GROUP_REGION_REVIEW_PROGRESS_TARGET;
  return {
    total,
    visited: Math.min(reviewCount, total),
    reviewCount,
    ratio: Math.min(1, reviewCount / total),
  };
}

/** 지역 내 장소 1곳 방문 시 기여 진행도 (0~1) */
export function getPlaceProgressShare(regionCode: string, places: Place[]): number {
  const total = places.filter((p) => p.regionCode === regionCode).length;
  return total > 0 ? 1 / total : 0;
}

/** 지역 내 장소 1곳 방문 시 기여 진행도 (%) — 정수 */
export function getPlaceProgressPercent(regionCode: string, places: Place[]): number {
  return Math.round(getPlaceProgressShare(regionCode, places) * 100);
}

/** @deprecated 그룹 정보 탭 진행도에는 더 이상 사용하지 않음. 레거시 화면 호환용. */
export function getCategoryMaxProgressPercent(
  regionCode: string,
  menuKey: RegionMenuCategory,
  places: Place[],
): number {
  const regionTotal = places.filter((p) => p.regionCode === regionCode).length;
  if (regionTotal === 0) return 0;
  const categoryCount = places.filter(
    (p) => p.regionCode === regionCode && PLACE_CATEGORY_BY_MENU[menuKey]?.includes(p.category),
  ).length;
  return Math.round((categoryCount / regionTotal) * 100);
}
