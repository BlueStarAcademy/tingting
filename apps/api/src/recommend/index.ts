import type { RecommendationCategory, RecommendationPage, RecommendationSource } from '@tingting/shared';
import { config } from '../config';
import { kakaoNearby, kakaoRegion, kakaoSupports } from './kakao';
import { osmNearby, osmRegion, osmSupports } from './osm';
import { tourNearby, tourRegion, tourSupports } from './tour';
import type { ProviderPage, SearchPoint } from './types';

export type { SearchPoint } from './types';

const TOUR_KEY_NOTICE = {
  code: 'tour_key_required' as const,
  message: '행사 정보를 보려면 관광공사 API 키가 필요해요',
};

function enabled(source: RecommendationSource): boolean {
  if (source === 'tour') return Boolean(config.tourApiKey);
  if (source === 'kakao') return Boolean(config.kakaoRestApiKey);
  return true;
}

function supports(source: RecommendationSource, category: RecommendationCategory | undefined): boolean {
  if (source === 'tour') return tourSupports(category);
  if (source === 'kakao') return kakaoSupports(category);
  return osmSupports(category);
}

/**
 * Asks providers in order and returns the first non-empty first page. Later pages pass
 * `pinned` so paging stays on the provider that produced page 1.
 */
async function runChain(
  order: RecommendationSource[],
  category: RecommendationCategory | undefined,
  page: number,
  pinned: RecommendationSource | undefined,
  call: (source: RecommendationSource) => Promise<ProviderPage>,
): Promise<RecommendationPage> {
  const candidates = order.filter((s) => supports(s, category));
  const usable = candidates.filter(enabled).filter((s) => !pinned || s === pinned);
  if (usable.length === 0) {
    if (category === 'event' && !config.tourApiKey) return { items: [], hasMore: false, notice: TOUR_KEY_NOTICE };
    return {
      items: [],
      hasMore: false,
      notice: { code: 'no_provider', message: '추천 장소를 제공할 서비스가 설정되지 않았어요' },
    };
  }
  let lastError: unknown;
  for (const [i, source] of usable.entries()) {
    try {
      const result = await call(source);
      if (result.items.length === 0 && page === 1 && i < usable.length - 1) continue;
      return { ...result, source };
    } catch (e) {
      lastError = e;
      console.warn(`[recommend] ${source} failed:`, e instanceof Error ? e.message : e);
    }
  }
  if (lastError) {
    return {
      items: [],
      hasMore: false,
      notice: { code: 'provider_error', message: lastError instanceof Error ? lastError.message : '추천 장소를 불러오지 못했어요' },
    };
  }
  return { items: [], hasMore: false, source: usable[usable.length - 1] };
}

/** TourAPI has curated entries with photos, so it leads for region lists. */
const REGION_ORDER: RecommendationSource[] = ['tour', 'kakao', 'osm'];
/** Kakao has the densest POI coverage around a point. */
const NEARBY_ORDER: RecommendationSource[] = ['kakao', 'tour', 'osm'];

export function recommendForRegion(
  regionCode: string,
  category: RecommendationCategory,
  page: number,
  pinned?: RecommendationSource,
): Promise<RecommendationPage> {
  return runChain(REGION_ORDER, category, page, pinned, (source) => {
    if (source === 'tour') return tourRegion(regionCode, category, page);
    if (source === 'kakao') return kakaoRegion(regionCode, category as Exclude<RecommendationCategory, 'event'>, page);
    return osmRegion(regionCode, category, page);
  });
}

export function searchNearby(
  point: SearchPoint,
  target: { category: RecommendationCategory } | { query: string },
  page: number,
  pinned?: RecommendationSource,
): Promise<RecommendationPage> {
  if ('query' in target) {
    return runChain(['kakao', 'osm'], undefined, page, pinned, (source) =>
      source === 'kakao' ? kakaoNearby(point, target, page) : osmNearby(point, target, page),
    );
  }
  const { category } = target;
  return runChain(NEARBY_ORDER, category, page, pinned, (source) => {
    if (source === 'tour') return tourNearby(point, category, page);
    if (source === 'kakao') return kakaoNearby(point, { category: category as Exclude<RecommendationCategory, 'event'> }, page);
    return osmNearby(point, target, page);
  });
}
