import {
  distanceMeters,
  nearestRegionCode,
  REGION_LDONG_CODES,
  resolveRegionCode,
  type RecommendationCategory,
  type RecommendedPlace,
} from '@tingting/shared';
import { cached } from '../cache';
import { config } from '../config';
import { HttpError } from '../http';
import { PAGE_SIZE, pointKey, slicePage, type ProviderPage, type SearchPoint } from './types';

/** 한국관광공사 국문 관광정보 서비스 (TourAPI 4.0, KorService2) */
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';
const TTL = 12 * 3600_000;
const FESTIVAL_TTL = 3 * 3600_000;
const NEARBY_TTL = 30 * 60_000;

interface TourItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
  firstimage?: string;
  firstimage2?: string;
  /** Meters, location-based list only */
  dist?: string;
  /** YYYYMMDD, festivals only */
  eventstartdate?: string;
  eventenddate?: string;
}

/** contentTypeId per category: 12 관광지, 14 문화시설, 28 레포츠, 32 숙박, 39 음식점 (15 행사 is separate) */
const CONTENT_TYPES: Partial<Record<RecommendationCategory, string[]>> = {
  food: ['39'],
  sight: ['12', '14'],
  activity: ['28'],
  stay: ['32'],
};

const TYPE_LABELS: Record<string, string> = {
  '12': '관광지',
  '14': '문화시설',
  '15': '축제·행사',
  '28': '레포츠',
  '32': '숙박',
  '39': '음식점',
};

export function tourSupports(category: RecommendationCategory | undefined): boolean {
  return category === 'event' || (category !== undefined && category in CONTENT_TYPES);
}

async function tourGet(operation: string, params: Record<string, string>): Promise<{ items: TourItem[]; totalCount: number }> {
  if (!config.tourApiKey) throw new HttpError(503, '서버에 TOUR_API_KEY가 설정되지 않았어요');
  const url = new URL(`${BASE_URL}/${operation}`);
  url.searchParams.set('serviceKey', config.tourApiKey);
  url.searchParams.set('MobileOS', 'ETC');
  url.searchParams.set('MobileApp', 'TingTing');
  url.searchParams.set('_type', 'json');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  const text = await res.text();
  let data: {
    response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: TourItem | TourItem[] } | ''; totalCount?: number } };
    resultMsg?: string;
  };
  try {
    data = JSON.parse(text);
  } catch {
    // Key and quota errors come back as XML even when JSON was requested.
    const reason = /<returnAuthMsg>([^<]+)/.exec(text)?.[1] ?? /<resultMsg>([^<]+)/.exec(text)?.[1] ?? `HTTP ${res.status}`;
    throw new HttpError(502, `관광공사 API 오류 (${reason.trim()})`);
  }
  const header = data.response?.header;
  if (!header || header.resultCode !== '0000') {
    throw new HttpError(502, `관광공사 API 오류 (${header?.resultMsg ?? data.resultMsg ?? `HTTP ${res.status}`})`);
  }
  const body = data.response?.body;
  const raw = body && typeof body.items === 'object' ? body.items.item : undefined;
  return { items: Array.isArray(raw) ? raw : raw ? [raw] : [], totalCount: Number(body?.totalCount ?? 0) };
}

const https = (url: string | undefined) => (url ? url.replace(/^http:\/\//i, 'https://') : undefined);
const ymd = (v: string | undefined) => (v && /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : undefined);
const compactDate = (d: Date) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '');

function toPlace(item: TourItem, category: RecommendationCategory): RecommendedPlace | null {
  const lat = Number(item.mapy);
  const lng = Number(item.mapx);
  if (!lat || !lng) return null;
  const image = https(item.firstimage);
  return {
    id: `tour:${item.contentid}`,
    source: 'tour',
    category,
    name: item.title.trim(),
    categoryLabel: TYPE_LABELS[item.contenttypeid],
    address: [item.addr1, item.addr2].filter(Boolean).join(' ') || undefined,
    lat,
    lng,
    distanceM: item.dist ? Math.round(Number(item.dist)) : undefined,
    phone: item.tel?.replace(/<[^>]+>/g, ' ').trim() || undefined,
    imageUrl: image,
    thumbnailUrl: https(item.firstimage2) ?? image,
    regionCode: resolveRegionCode(item.addr1, lat, lng),
    eventStart: ymd(item.eventstartdate),
    eventEnd: ymd(item.eventenddate),
  };
}

/** Tries each 법정동 code of the region until one returns rows (old codes for renamed provinces). */
async function byRegion(operation: string, regionCode: string, params: Record<string, string>) {
  const codes = REGION_LDONG_CODES[regionCode] ?? [];
  let last = { items: [] as TourItem[], totalCount: 0 };
  for (const code of codes) {
    last = await tourGet(operation, { ...params, lDongRegnCd: code });
    if (last.totalCount > 0) break;
  }
  return last;
}

/** Ongoing and upcoming festivals in the region, soonest first. */
async function regionFestivals(regionCode: string): Promise<RecommendedPlace[]> {
  const today = compactDate(new Date());
  return cached(`tour:festivals:${regionCode}:${today}`, FESTIVAL_TTL, async () => {
    const { items } = await byRegion('searchFestival2', regionCode, {
      // Starting a while back keeps festivals that began earlier but are still running.
      eventStartDate: compactDate(new Date(Date.now() - 120 * 86400_000)),
      numOfRows: '200',
      pageNo: '1',
      arrange: 'A',
    });
    return items
      .filter((it) => (it.eventenddate ?? '') >= today)
      .sort((a, b) => (a.eventstartdate ?? '').localeCompare(b.eventstartdate ?? ''))
      .map((it) => toPlace(it, 'event'))
      .filter((p): p is RecommendedPlace => p !== null);
  });
}

async function listByTypes(
  types: string[],
  page: number,
  fetchType: (contentTypeId: string, rows: number) => Promise<{ items: TourItem[]; totalCount: number }>,
  category: RecommendationCategory,
): Promise<ProviderPage> {
  const rows = Math.ceil(PAGE_SIZE / types.length);
  const results = await Promise.all(types.map((t) => fetchType(t, rows)));
  const items: RecommendedPlace[] = [];
  for (let i = 0; i < rows; i++) {
    for (const r of results) {
      const place = r.items[i] ? toPlace(r.items[i], category) : null;
      if (place) items.push(place);
    }
  }
  return { items, hasMore: results.some((r) => r.totalCount > page * rows) };
}

export async function tourRegion(regionCode: string, category: RecommendationCategory, page: number): Promise<ProviderPage> {
  if (category === 'event') return slicePage(await regionFestivals(regionCode), page);
  const types = CONTENT_TYPES[category];
  if (!types) return { items: [], hasMore: false };
  return cached(`tour:region:${regionCode}:${category}:${page}`, TTL, () =>
    listByTypes(
      types,
      page,
      (contentTypeId, rows) =>
        // Q = most recently updated, only entries with a photo
        byRegion('areaBasedList2', regionCode, { contentTypeId, numOfRows: String(rows), pageNo: String(page), arrange: 'Q' }),
      category,
    ),
  );
}

export async function tourNearby(point: SearchPoint, category: RecommendationCategory, page: number): Promise<ProviderPage> {
  if (category === 'event') {
    // The location list has no event dates, so show the current festivals of the region we're in instead.
    const festivals = await regionFestivals(nearestRegionCode(point.lat, point.lng));
    const sorted = festivals
      .map((p) => ({ ...p, distanceM: distanceMeters(point.lat, point.lng, p.lat, p.lng) }))
      .sort((a, b) => a.distanceM - b.distanceM);
    return slicePage(sorted, page);
  }
  const types = CONTENT_TYPES[category];
  if (!types) return { items: [], hasMore: false };
  return cached(`tour:near:${category}:${pointKey(point)}:${page}`, NEARBY_TTL, () =>
    listByTypes(
      types,
      page,
      (contentTypeId, rows) =>
        tourGet('locationBasedList2', {
          contentTypeId,
          mapX: String(point.lng),
          mapY: String(point.lat),
          radius: String(Math.min(point.radius, 20000)),
          numOfRows: String(rows),
          pageNo: String(page),
          arrange: 'E',
        }),
      category,
    ),
  );
}
