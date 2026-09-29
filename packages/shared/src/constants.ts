import type { PlaceCategory } from './types';

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

export function categoryFromKakao(groupCode: string | undefined, categoryName: string | undefined): PlaceCategory {
  if (groupCode && KAKAO_GROUP_TO_CATEGORY[groupCode]) return KAKAO_GROUP_TO_CATEGORY[groupCode];
  const name = categoryName ?? '';
  if (/음식점|카페|제과|디저트/.test(name)) return 'food';
  if (/숙박|호텔|펜션|모텔|게스트하우스|캠핑/.test(name)) return 'stay';
  if (/축제|행사|공연/.test(name)) return 'event';
  return 'play';
}
