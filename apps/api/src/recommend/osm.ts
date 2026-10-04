import {
  distanceMeters,
  REGION_HUBS,
  resolveRegionCode,
  type RecommendationCategory,
  type RecommendedPlace,
} from '@tingting/shared';
import { cached } from '../cache';
import { config } from '../config';
import { HttpError } from '../http';
import { pointKey, slicePage, type ProviderPage, type SearchPoint } from './types';

const REGION_TTL = 24 * 3600_000;
const NEARBY_TTL = 30 * 60_000;
const MAX_ELEMENTS = 400;

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const FILTERS: Partial<Record<RecommendationCategory, string[]>> = {
  food: ['["amenity"~"^(restaurant|fast_food|food_court)$"]'],
  cafe: ['["amenity"="cafe"]'],
  sight: ['["tourism"~"^(attraction|museum|viewpoint|gallery)$"]', '["historic"~"^(castle|palace|monument|archaeological_site)$"]'],
  activity: [
    '["tourism"~"^(theme_park|zoo|aquarium)$"]',
    '["leisure"~"^(water_park|amusement_arcade|escape_game|bowling_alley|miniature_golf)$"]',
    '["amenity"~"^(cinema|theatre|karaoke_box|arts_centre)$"]',
  ],
  stay: ['["tourism"~"^(hotel|guest_house|hostel|motel|camp_site|chalet)$"]'],
};

const LABELS: Record<string, string> = {
  restaurant: '음식점',
  fast_food: '패스트푸드',
  food_court: '푸드코트',
  cafe: '카페',
  attraction: '명소',
  museum: '박물관',
  viewpoint: '전망대',
  gallery: '갤러리',
  castle: '성곽',
  palace: '궁궐',
  monument: '기념물',
  archaeological_site: '유적지',
  theme_park: '테마파크',
  zoo: '동물원',
  aquarium: '아쿠아리움',
  water_park: '워터파크',
  amusement_arcade: '오락실',
  escape_game: '방탈출',
  bowling_alley: '볼링장',
  miniature_golf: '미니골프',
  cinema: '영화관',
  theatre: '공연장',
  karaoke_box: '노래방',
  arts_centre: '아트센터',
  hotel: '호텔',
  guest_house: '게스트하우스',
  hostel: '호스텔',
  motel: '모텔',
  camp_site: '캠핑장',
  chalet: '펜션',
};

const CUISINES: Record<string, string> = {
  korean: '한식',
  japanese: '일식',
  sushi: '초밥',
  chinese: '중식',
  italian: '이탈리안',
  pizza: '피자',
  burger: '버거',
  chicken: '치킨',
  noodle: '국수',
  barbecue: '고기구이',
  seafood: '해산물',
  coffee_shop: '카페',
};

export function osmSupports(category: RecommendationCategory | undefined): boolean {
  return category === undefined || category in FILTERS;
}

function categoryOf(tags: Record<string, string>): RecommendationCategory {
  if (tags.amenity === 'cafe') return 'cafe';
  if (/^(restaurant|fast_food|food_court)$/.test(tags.amenity ?? '')) return 'food';
  if (/^(hotel|guest_house|hostel|motel|camp_site|chalet)$/.test(tags.tourism ?? '')) return 'stay';
  if (/^(attraction|museum|viewpoint|gallery)$/.test(tags.tourism ?? '') || tags.historic) return 'sight';
  return 'activity';
}

function labelOf(tags: Record<string, string>): string | undefined {
  const cuisine = tags.cuisine?.split(';')[0]?.trim();
  if (cuisine && CUISINES[cuisine]) return CUISINES[cuisine];
  const kind = tags.amenity ?? tags.tourism ?? tags.historic ?? tags.leisure;
  return kind ? LABELS[kind] : undefined;
}

/**
 * Notable places (linked to Wikipedia/Wikidata, with photos or English names) float up in region lists.
 * Chains carry English names and websites too, so brands and fast food sink instead.
 */
function notability(tags: Record<string, string>): number {
  const chain = tags.brand || tags['brand:wikidata'] ? 4 : 0;
  const fastFood = tags.amenity === 'fast_food' ? 1 : 0;
  return (
    (tags.wikidata ? 3 : 0) +
    (tags.wikipedia ? 2 : 0) +
    (tags.image ? 1 : 0) +
    (tags['name:en'] ? 1 : 0) +
    (tags.website ? 0.5 : 0) -
    chain -
    fastFood
  );
}

function toPlace(el: OsmElement, category: RecommendationCategory | undefined, regionCode?: string): RecommendedPlace | null {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const name = tags['name:ko'] ?? tags.name;
  if (lat == null || lng == null || !name) return null;
  const address =
    tags['addr:full'] ??
    ([tags['addr:province'], tags['addr:city'], tags['addr:district'], tags['addr:street'], tags['addr:housenumber']]
      .filter(Boolean)
      .join(' ') ||
      undefined);
  const image = tags.image?.startsWith('https://') ? tags.image : undefined;
  return {
    id: `osm:${el.type}/${el.id}`,
    source: 'osm',
    category: category ?? categoryOf(tags),
    name,
    categoryLabel: labelOf(tags),
    address,
    lat,
    lng,
    phone: tags.phone ?? tags['contact:phone'],
    imageUrl: image,
    thumbnailUrl: image,
    url: tags.website ?? `https://www.openstreetmap.org/${el.type}/${el.id}`,
    regionCode: regionCode ?? resolveRegionCode(address, lat, lng),
  };
}

const MIRRORS = ['https://overpass.private.coffee/api/interpreter'];

async function overpass(filters: string[], point: SearchPoint): Promise<OsmElement[]> {
  const around = `(around:${Math.round(point.radius)},${point.lat},${point.lng})`;
  const query = `[out:json][timeout:10];(${filters.map((f) => `nwr${f}${around};`).join('')});out tags center ${MAX_ELEMENTS};`;
  let status = 0;
  for (const url of [config.overpassUrl, ...MIRRORS.filter((m) => m !== config.overpassUrl)]) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TingTing/1.0 (private couple travel journal)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(12_000),
      });
      status = res.status;
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: OsmElement[] };
      return data.elements ?? [];
    } catch (e) {
      console.warn('[osm] overpass failed', url, e instanceof Error ? e.message : e);
    }
  }
  throw new HttpError(502, `OpenStreetMap 서버가 바빠요${status ? ` (${status})` : ''}. 잠시 후 다시 시도해 주세요`);
}

/** Restaurants and cafes are dense; a wide circle makes Overpass time out. */
const DENSE_RADIUS = 4000;

export async function osmRegion(regionCode: string, category: RecommendationCategory, page: number): Promise<ProviderPage> {
  const hub = REGION_HUBS[regionCode];
  const filters = FILTERS[category];
  if (!hub || !filters) return { items: [], hasMore: false };
  const all = await cached(`osm:region:v2:${regionCode}:${category}`, REGION_TTL, async () => {
    const dense = category === 'food' || category === 'cafe';
    const elements = await overpass(
      filters.map((f) => `${f}["name"]`),
      dense ? { ...hub, radius: Math.min(hub.radius, DENSE_RADIUS) } : hub,
    );
    const fromHub = (p: RecommendedPlace) => distanceMeters(hub.lat, hub.lng, p.lat, p.lng);
    return elements
      .map((el) => ({ place: toPlace(el, category, regionCode), score: notability(el.tags ?? {}) }))
      .filter((x): x is { place: RecommendedPlace; score: number } => x.place !== null)
      .sort((a, b) => b.score - a.score || fromHub(a.place) - fromHub(b.place))
      .map((x) => x.place)
      .filter((p, i, list) => list.findIndex((q) => q.name === p.name) === i);
  });
  return slicePage(all, page);
}

export async function osmNearby(
  point: SearchPoint,
  target: { category: RecommendationCategory } | { query: string },
  page: number,
): Promise<ProviderPage> {
  let filters: string[];
  let category: RecommendationCategory | undefined;
  if ('query' in target) {
    // Overpass regexes: keep letters, digits, Hangul and spaces only.
    const term = target.query.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
    if (!term) return { items: [], hasMore: false };
    filters = [`["name"~"${term}",i]`];
  } else {
    const f = FILTERS[target.category];
    if (!f) return { items: [], hasMore: false };
    filters = f.map((x) => `${x}["name"]`);
    category = target.category;
  }
  const what = 'query' in target ? `q=${target.query}` : `c=${target.category}`;
  const all = await cached(`osm:near:${what}:${pointKey(point)}`, NEARBY_TTL, async () => {
    const elements = await overpass(filters, point);
    return elements
      .map((el) => toPlace(el, category))
      .filter((p): p is RecommendedPlace => p !== null)
      .map((p) => ({ ...p, distanceM: distanceMeters(point.lat, point.lng, p.lat, p.lng) }))
      .sort((a, b) => a.distanceM - b.distanceM);
  });
  return slicePage(all, page);
}
