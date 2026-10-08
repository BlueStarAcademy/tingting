import { Router } from 'express';
import { getCity, getRegion, REGION_CENTERS, type CityPinCategory, type GeoPlace, type GeoSearchResult } from '@tingting/shared';
import { cached } from '../cache';
import { config } from '../config';
import { handle, HttpError, optionalString } from '../http';
import { kakaoGet, type KakaoKeywordDoc } from '../kakao';

/** Place search and reverse geocoding for city-folder pins: Kakao Local with a key, OSM Nominatim without. */
export const geoRouter = Router();

const SEARCH_TTL = 7 * 24 * 3600_000;
const REVERSE_TTL = 30 * 24 * 3600_000;
const NOMINATIM = 'https://nominatim.openstreetmap.org';
// Nominatim's usage policy: identify the app, at most one request per second, cache results.
const USER_AGENT = 'TingTing/1.0 (private couple travel journal; +https://github.com/BlueStarAcademy/tingting)';
const NOMINATIM_GAP_MS = 1100;

type Bbox = [number, number, number, number];

let nominatimChain: Promise<unknown> = Promise.resolve();
let nominatimLast = 0;

/** Serializes Nominatim calls process-wide so we never exceed its rate limit. */
function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
  const task = nominatimChain.then(async () => {
    const wait = nominatimLast + NOMINATIM_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    nominatimLast = Date.now();
    const url = new URL(`${NOMINATIM}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ko,en;q=0.5' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new HttpError(502, `지도 검색 오류 (${res.status})`);
    return (await res.json()) as T;
  });
  nominatimChain = task.catch(() => undefined);
  return task;
}

interface NominatimItem {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  category?: string;
  class?: string;
  type?: string;
  namedetails?: Record<string, string>;
  address?: Record<string, string>;
}

const OSM_CATEGORY: [RegExp, CityPinCategory][] = [
  [/^amenity:(cafe|ice_cream)$|^shop:(bakery|coffee|pastry)$/, 'cafe'],
  [/^amenity:(restaurant|fast_food|food_court|pub|bar|biergarten)$|^shop:(deli|seafood)$/, 'food'],
  [/^tourism:(hotel|motel|guest_house|hostel|chalet|apartment|camp_site|caravan_site)$/, 'stay'],
  [/^tourism:|^historic:|^natural:(beach|peak|bay|cape|cliff|waterfall)$|^leisure:(park|garden|beach_resort|water_park)$|^amenity:(arts_centre|theatre)$/, 'sight'],
];

function osmCategory(cls: string | undefined, type: string | undefined): CityPinCategory {
  const key = `${cls ?? ''}:${type ?? ''}`;
  return OSM_CATEGORY.find(([re]) => re.test(key))?.[1] ?? 'etc';
}

/** "중앙시장, 중앙로, 속초시, 강원특별자치도, 24829, 대한민국" -> "강원특별자치도 속초시 중앙로" */
function koreanAddress(display: string, name: string): string | undefined {
  const parts = display
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '대한민국' && s !== 'South Korea' && !/^\d{5}$/.test(s));
  if (parts[0] === name) parts.shift();
  return parts.length ? parts.reverse().join(' ') : undefined;
}

/** Streets named after a place ("중앙시장로") go after the places themselves. */
function placesFirst(items: NominatimItem[]): GeoPlace[] {
  const isRoad = (i: NominatimItem) => (i.category ?? i.class) === 'highway';
  return [...items.filter((i) => !isRoad(i)), ...items.filter(isRoad)].map(mapNominatim);
}

function mapNominatim(item: NominatimItem): GeoPlace {
  const name = item.namedetails?.['name:ko'] || item.namedetails?.name || item.name || item.display_name.split(',')[0].trim();
  const cls = item.category ?? item.class;
  return {
    id: `osm:${item.osm_type ?? ''}${item.osm_id ?? item.place_id}`,
    source: 'osm',
    name,
    address: koreanAddress(item.display_name, name),
    lat: Number(item.lat),
    lng: Number(item.lon),
    category: osmCategory(cls, item.type),
    categoryLabel: item.type && item.type !== 'yes' ? item.type : undefined,
  };
}

const KAKAO_GROUP: Record<string, CityPinCategory> = { FD6: 'food', CE7: 'cafe', AD5: 'stay', AT4: 'sight', CT1: 'sight' };

function mapKakao(doc: KakaoKeywordDoc): GeoPlace {
  const label = doc.category_name.split('>').map((s) => s.trim()).filter(Boolean).pop();
  return {
    id: `kakao:${doc.id}`,
    source: 'kakao',
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name || undefined,
    lat: Number(doc.y),
    lng: Number(doc.x),
    category: (doc.category_group_code && KAKAO_GROUP[doc.category_group_code]) || (/카페|디저트|제과/.test(doc.category_name) ? 'cafe' : 'etc'),
    categoryLabel: label,
    kakaoPlaceId: doc.id,
  };
}

/** City bbox (padded), else a box around the province center. */
function searchBox(cityCode: string | null, regionCode: string | null): Bbox | null {
  const city = getCity(cityCode);
  if (city) {
    const [w, s, e, n] = city.bbox;
    const px = Math.max(0.02, (e - w) * 0.15);
    const py = Math.max(0.02, (n - s) * 0.15);
    return [w - px, s - py, e + px, n + py];
  }
  const center = regionCode ? REGION_CENTERS[regionCode] : undefined;
  return center ? [center.lng - 0.6, center.lat - 0.5, center.lng + 0.6, center.lat + 0.5] : null;
}

async function searchKakao(q: string, box: Bbox | null): Promise<GeoPlace[]> {
  const params: Record<string, string> = { query: q, size: '15' };
  if (box) params.rect = box.map((v) => v.toFixed(5)).join(',');
  let data = await kakaoGet<{ documents: KakaoKeywordDoc[] }>('/v2/local/search/keyword.json', params);
  if (!data.documents?.length && box) data = await kakaoGet('/v2/local/search/keyword.json', { query: q, size: '15' });
  return (data.documents ?? []).map(mapKakao);
}

async function searchNominatim(q: string, box: Bbox | null, hint: string | null): Promise<GeoPlace[]> {
  const base = { format: 'jsonv2', countrycodes: 'kr', limit: '12', namedetails: '1', 'accept-language': 'ko' };
  if (box) {
    const viewbox = [box[0], box[3], box[2], box[1]].map((v) => v.toFixed(5)).join(',');
    const inside = await nominatim<NominatimItem[]>('/search', { ...base, q, viewbox, bounded: '1' });
    if (inside.length) return placesFirst(inside);
  }
  const query = hint && !q.includes(hint) ? `${hint} ${q}` : q;
  const anywhere = await nominatim<NominatimItem[]>('/search', { ...base, q: query });
  return placesFirst(anywhere);
}

geoRouter.get(
  '/search',
  handle(async (req, res) => {
    const q = optionalString(req.query.q);
    if (!q) throw new HttpError(400, '검색어를 입력해 주세요');
    if (q.length > 80) throw new HttpError(400, '검색어가 너무 길어요');
    const cityCode = optionalString(req.query.cityCode);
    const regionCode = optionalString(req.query.regionCode);
    const city = getCity(cityCode);
    const box = searchBox(cityCode, regionCode);
    const source = config.kakaoRestApiKey ? 'kakao' : 'osm';
    const key = `geo:search:${source}:${city?.code ?? regionCode ?? ''}:${q.toLowerCase()}`;
    const hint = city ? city.name : regionCode ? getRegion(regionCode)?.name ?? null : null;
    const items = await cached(key, SEARCH_TTL, () => (source === 'kakao' ? searchKakao(q, box) : searchNominatim(q, box, hint)));
    const result: GeoSearchResult = { items, source };
    res.json(result);
  }),
);

interface KakaoAddressDoc {
  address?: { address_name: string };
  road_address?: { address_name: string; building_name?: string } | null;
}

geoRouter.get(
  '/reverse',
  handle(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 32 || lat > 39.5 || lng < 124 || lng > 132.5) {
      throw new HttpError(400, '위치가 올바르지 않아요');
    }
    const source = config.kakaoRestApiKey ? 'kakao' : 'osm';
    const key = `geo:reverse:${source}:${lat.toFixed(5)},${lng.toFixed(5)}`;
    const place = await cached(key, REVERSE_TTL, async (): Promise<{ name?: string; address?: string }> => {
      if (source === 'kakao') {
        const data = await kakaoGet<{ documents: KakaoAddressDoc[] }>('/v2/local/geo/coord2address.json', { x: String(lng), y: String(lat) });
        const doc = data.documents?.[0];
        return {
          name: doc?.road_address?.building_name || undefined,
          address: doc?.road_address?.address_name ?? doc?.address?.address_name,
        };
      }
      const item = await nominatim<NominatimItem & { error?: string }>('/reverse', {
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
        zoom: '18',
        namedetails: '1',
        'accept-language': 'ko',
      });
      if (item.error) return {};
      const mapped = mapNominatim(item);
      const named = Boolean(item.name || item.namedetails?.name);
      return { name: named ? mapped.name : undefined, address: mapped.address };
    });
    res.json(place);
  }),
);
