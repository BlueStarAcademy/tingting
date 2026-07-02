import {
  PLACE_CATEGORY_BY_MENU,
  getRegion,
  type Place,
  type PublicExperiencePost,
  type RegionMenuCategory,
} from '@tingting/shared';

export type RecommendCategoryFilter = Exclude<RegionMenuCategory, 'event'>;

export const RECOMMEND_CATEGORY_FILTERS: RecommendCategoryFilter[] = ['food', 'sight', 'play', 'stay'];

export type RecommendSortMode = 'latest' | 'recommended';

export interface RecommendFilterState {
  query: string;
  regionCode: string | null;
  categories: RecommendCategoryFilter[];
  includeEvents: boolean;
  sort: RecommendSortMode;
}

export const DEFAULT_RECOMMEND_FILTERS: RecommendFilterState = {
  query: '',
  regionCode: null,
  categories: [],
  includeEvents: false,
  sort: 'latest',
};

function placeCategory(placeById: Map<string, Place>, placeId: string): string {
  return placeById.get(placeId)?.category ?? '';
}

function matchesCategory(category: string, filter: RecommendCategoryFilter): boolean {
  return PLACE_CATEGORY_BY_MENU[filter]?.includes(category) ?? false;
}

function isEventPlace(category: string): boolean {
  return PLACE_CATEGORY_BY_MENU.event.includes(category);
}

export function hasActiveRecommendFilters(filters: RecommendFilterState): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.regionCode !== null ||
    filters.categories.length > 0 ||
    filters.includeEvents
  );
}

export function sortRecommendFeed(
  posts: PublicExperiencePost[],
  sort: RecommendSortMode,
): PublicExperiencePost[] {
  const copy = [...posts];
  if (sort === 'recommended') {
    copy.sort((a, b) => {
      const diff = (b.recommendCount ?? 0) - (a.recommendCount ?? 0);
      if (diff !== 0) return diff;
      return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
    });
    return copy;
  }
  copy.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
  return copy;
}

export function filterRecommendFeed(
  posts: PublicExperiencePost[],
  placeById: Map<string, Place>,
  filters: RecommendFilterState,
  regionLabel: (code: string) => string,
): PublicExperiencePost[] {
  const query = filters.query.trim().toLowerCase();

  const filtered = posts.filter((post) => {
    if (filters.regionCode && post.regionCode !== filters.regionCode) return false;

    const category = placeCategory(placeById, post.placeId);
    const eventPlace = isEventPlace(category);

    if (filters.categories.length > 0) {
      const inSelectedCategory = filters.categories.some((item) => matchesCategory(category, item));
      const includeAsEvent = filters.includeEvents && eventPlace;
      if (!inSelectedCategory && !includeAsEvent) return false;
    } else if (eventPlace && !filters.includeEvents) {
      return false;
    }

    if (!query) return true;

    const regionName = regionLabel(post.regionCode).toLowerCase();
    const haystack = [post.displayName, post.placeName, post.note ?? '', regionName];
    return haystack.some((value) => value.toLowerCase().includes(query));
  });

  return sortRecommendFeed(filtered, filters.sort);
}

export function buildPlaceLookup(places: Place[]): Map<string, Place> {
  return new Map(places.map((place) => [place.id, place]));
}

export function getRegionLabel(code: string, locale: string): string {
  const region = getRegion(code);
  if (!region) return code;
  return locale === 'en' && region.nameEn ? region.nameEn : region.name;
}
