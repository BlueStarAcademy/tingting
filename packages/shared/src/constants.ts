import type { PlaceCategory, RecommendationCategory, RecommendationSource } from './types';

export const TOTAL_REGIONS = 17;

export interface PlaceCategoryInfo {
  id: PlaceCategory;
  label: string;
  icon: string;
  color: string;
}

export const PLACE_CATEGORIES: PlaceCategoryInfo[] = [
  { id: 'food', label: '맛집', icon: 'restaurant', color: '#E07A5F' },
  { id: 'play', label: '놀거리', icon: 'sparkles', color: '#5B8DEF' },
  { id: 'event', label: '행사', icon: 'calendar', color: '#B07CD8' },
  { id: 'stay', label: '숙소', icon: 'bed', color: '#4FA38C' },
];

export function getPlaceCategory(id: string): PlaceCategoryInfo {
  return PLACE_CATEGORIES.find((c) => c.id === id) ?? PLACE_CATEGORIES[1];
}

export function isPlaceCategory(value: unknown): value is PlaceCategory {
  return PLACE_CATEGORIES.some((c) => c.id === value);
}

/** Kakao Local `category_group_code` → app category */
const KAKAO_GROUP_TO_CATEGORY: Record<string, PlaceCategory> = {
  FD6: 'food',
  CE7: 'food',
  AD5: 'stay',
  AT4: 'play',
  CT1: 'play',
};

export interface RecommendationCategoryInfo {
  id: RecommendationCategory;
  label: string;
  icon: string;
  color: string;
  /** Category used when the place is saved to our list */
  placeCategory: PlaceCategory;
}

export const RECOMMENDATION_CATEGORIES: RecommendationCategoryInfo[] = [
  { id: 'food', label: '맛집', icon: 'restaurant', color: '#E07A5F', placeCategory: 'food' },
  { id: 'cafe', label: '카페', icon: 'cafe', color: '#B5835A', placeCategory: 'food' },
  { id: 'sight', label: '볼거리', icon: 'camera', color: '#3FA7A0', placeCategory: 'play' },
  { id: 'activity', label: '놀거리', icon: 'sparkles', color: '#5B8DEF', placeCategory: 'play' },
  { id: 'stay', label: '숙소', icon: 'bed', color: '#4FA38C', placeCategory: 'stay' },
  { id: 'event', label: '행사', icon: 'calendar', color: '#B07CD8', placeCategory: 'event' },
];

export function getRecommendationCategory(id: string): RecommendationCategoryInfo {
  return RECOMMENDATION_CATEGORIES.find((c) => c.id === id) ?? RECOMMENDATION_CATEGORIES[0];
}

export function isRecommendationCategory(value: unknown): value is RecommendationCategory {
  return RECOMMENDATION_CATEGORIES.some((c) => c.id === value);
}

export const RECOMMENDATION_SOURCE_LABELS: Record<RecommendationSource, string> = {
  tour: '한국관광공사',
  kakao: '카카오',
  osm: 'OpenStreetMap',
};

/** Radius choices for nearby search, in meters */
export const NEARBY_RADII = [500, 1000, 3000, 5000] as const;

export function categoryFromKakao(groupCode: string | undefined, categoryName: string | undefined): PlaceCategory {
  if (groupCode && KAKAO_GROUP_TO_CATEGORY[groupCode]) return KAKAO_GROUP_TO_CATEGORY[groupCode];
  const name = categoryName ?? '';
  if (/음식점|카페|제과|디저트/.test(name)) return 'food';
  if (/숙박|호텔|펜션|모텔|게스트하우스|캠핑/.test(name)) return 'stay';
  if (/축제|행사|공연/.test(name)) return 'event';
  return 'play';
}
