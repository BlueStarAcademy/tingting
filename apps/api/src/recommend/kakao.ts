import { getRegion, resolveRegionCode, type RecommendationCategory, type RecommendedPlace } from '@tingting/shared';
import { cached } from '../cache';
import { kakaoGet, type KakaoKeywordDoc, type KakaoMeta } from '../kakao';
import { PAGE_SIZE, pointKey, type ProviderPage, type SearchPoint } from './types';

type KakaoCategory = Exclude<RecommendationCategory, 'event'>;
type KakaoResponse = { documents: KakaoKeywordDoc[]; meta: KakaoMeta };

const TTL = 6 * 3600_000;
const NEARBY_TTL = 30 * 60_000;
/** Kakao serves at most 45 pages */
const MAX_PAGE = 45;

/** Region searches are "<region> <keyword>" limited to a Kakao category group when one fits. */
const REGION_QUERY: Record<KakaoCategory, { keyword: string; group?: string }> = {
  food: { keyword: '맛집', group: 'FD6' },
  cafe: { keyword: '카페', group: 'CE7' },
  sight: { keyword: '관광명소', group: 'AT4' },
  activity: { keyword: '체험' },
  stay: { keyword: '숙소', group: 'AD5' },
};

/** Kakao has no "activity" group, so activity results are keyword hits minus food/cafe/lodging. */
const NOT_ACTIVITY = new Set(['FD6', 'CE7', 'AD5']);

export function kakaoSupports(category: RecommendationCategory | undefined): boolean {
  return category !== 'event';
}

export function categoryFromKakaoDoc(group: string | undefined, name: string): RecommendationCategory {
  switch (group) {
    case 'FD6':
      return 'food';
    case 'CE7':
      return 'cafe';
    case 'AD5':
      return 'stay';
    case 'AT4':
      return 'sight';
    case 'CT1':
      return 'activity';
  }
  if (/카페|디저트|제과/.test(name)) return 'cafe';
  if (/음식점/.test(name)) return 'food';
  if (/숙박|호텔|펜션|모텔|게스트하우스|캠핑/.test(name)) return 'stay';
  if (/관광|명소|박물관|미술관|공원/.test(name)) return 'sight';
  return 'activity';
}

function toPlace(doc: KakaoKeywordDoc, category?: RecommendationCategory): RecommendedPlace {
  const lat = parseFloat(doc.y);
  const lng = parseFloat(doc.x);
  const address = doc.road_address_name || doc.address_name;
  const label = doc.category_name.split('>').map((s) => s.trim()).filter(Boolean).pop();
  return {
    id: `kakao:${doc.id}`,
    source: 'kakao',
    category: category ?? categoryFromKakaoDoc(doc.category_group_code, doc.category_name),
    name: doc.place_name,
    categoryLabel: label,
    address: address || undefined,
    lat,
    lng,
    distanceM: doc.distance ? Number(doc.distance) : undefined,
    phone: doc.phone || undefined,
    kakaoPlaceId: doc.id,
    url: doc.place_url || undefined,
    regionCode: resolveRegionCode(doc.address_name || address, lat, lng),
  };
}

async function search(endpoint: 'keyword' | 'category', params: Record<string, string>, page: number): Promise<KakaoResponse> {
  const data = await kakaoGet<KakaoResponse>(`/v2/local/search/${endpoint}.json`, {
    ...params,
    size: String(PAGE_SIZE),
    page: String(page),
  });
  return { documents: data.documents ?? [], meta: data.meta ?? { is_end: true, pageable_count: 0, total_count: 0 } };
}

export async function kakaoRegion(regionCode: string, category: KakaoCategory, page: number): Promise<ProviderPage> {
  const region = getRegion(regionCode);
  if (!region || page > MAX_PAGE) return { items: [], hasMore: false };
  const q = REGION_QUERY[category];
  return cached(`kakao:region:${regionCode}:${category}:${page}`, TTL, async () => {
    const data = await search(
      'keyword',
      { query: `${region.name} ${q.keyword}`, ...(q.group ? { category_group_code: q.group } : {}) },
      page,
    );
    const docs = category === 'activity' ? data.documents.filter((d) => !NOT_ACTIVITY.has(d.category_group_code ?? '')) : data.documents;
    return {
      items: docs.map((d) => toPlace(d, category)).filter((p) => p.regionCode === regionCode),
      hasMore: !data.meta.is_end && page < MAX_PAGE,
    };
  });
}

const POINT_GROUP: Partial<Record<KakaoCategory, string>> = { food: 'FD6', cafe: 'CE7', sight: 'AT4', stay: 'AD5' };

export async function kakaoNearby(
  point: SearchPoint,
  target: { category: KakaoCategory } | { query: string },
  page: number,
): Promise<ProviderPage> {
  if (page > MAX_PAGE) return { items: [], hasMore: false };
  const around = {
    x: String(point.lng),
    y: String(point.lat),
    radius: String(Math.min(point.radius, 20000)),
    sort: 'distance',
  };
  const what = 'query' in target ? `q=${target.query}` : `c=${target.category}`;
  return cached(`kakao:near:${what}:${pointKey(point)}:${page}`, NEARBY_TTL, async () => {
    if ('query' in target) {
      const data = await search('keyword', { ...around, query: target.query }, page);
      return { items: data.documents.map((d) => toPlace(d)), hasMore: !data.meta.is_end };
    }
    const group = POINT_GROUP[target.category];
    if (group) {
      const data = await search('category', { ...around, category_group_code: group }, page);
      return { items: data.documents.map((d) => toPlace(d, target.category)), hasMore: !data.meta.is_end };
    }
    const data = await search('keyword', { ...around, query: REGION_QUERY.activity.keyword }, page);
    return {
      items: data.documents.filter((d) => !NOT_ACTIVITY.has(d.category_group_code ?? '')).map((d) => toPlace(d, 'activity')),
      hasMore: !data.meta.is_end,
    };
  });
}
