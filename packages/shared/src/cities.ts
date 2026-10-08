import { CITY_TUPLES } from './city-data';
import type { CityFolder, CityPinCategory } from './types';

/** A 시/군/구 (세종: 읍/면/동) inside one of our 17 province albums. */
export interface CityInfo {
  code: string;
  /** Official name, e.g. "속초시" */
  name: string;
  /** Map label, e.g. "속초" */
  short: string;
  regionCode: string;
  /** Label point (inside the area) */
  lat: number;
  lng: number;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
}

export const CITIES: CityInfo[] = CITY_TUPLES.map(([code, name, short, regionCode, lat, lng, bbox]) => ({
  code,
  name,
  short,
  regionCode,
  lat,
  lng,
  bbox,
}));

const BY_CODE = new Map(CITIES.map((c) => [c.code, c]));

export function getCity(code: string | null | undefined): CityInfo | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

export function citiesOf(regionCode: string): CityInfo[] {
  return CITIES.filter((c) => c.regionCode === regionCode);
}

export const CITY_FOLDER_TITLE_MAX = 40;
export const CITY_FOLDER_MEMO_MAX = 60;
export const CITY_PIN_NAME_MAX = 60;
export const CITY_PIN_MEMO_MAX = 100;

export interface CityPinCategoryInfo {
  id: CityPinCategory;
  label: string;
  emoji: string;
  icon: string;
  color: string;
}

export const CITY_PIN_CATEGORIES: CityPinCategoryInfo[] = [
  { id: 'food', label: '맛집', emoji: '🍚', icon: 'restaurant', color: '#E07A5F' },
  { id: 'cafe', label: '카페', emoji: '☕', icon: 'cafe', color: '#B5835A' },
  { id: 'sight', label: '관광', emoji: '📸', icon: 'camera', color: '#3FA7A0' },
  { id: 'stay', label: '숙소', emoji: '🛏️', icon: 'bed', color: '#5B8DEF' },
  { id: 'etc', label: '기타', emoji: '📍', icon: 'location', color: '#B07CD8' },
];

export function getCityPinCategory(id: string): CityPinCategoryInfo {
  return CITY_PIN_CATEGORIES.find((c) => c.id === id) ?? CITY_PIN_CATEGORIES[CITY_PIN_CATEGORIES.length - 1];
}

export function isCityPinCategory(value: unknown): value is CityPinCategory {
  return CITY_PIN_CATEGORIES.some((c) => c.id === value);
}

function dotDate(key: string): string {
  return key.slice(0, 10).replace(/-/g, '.');
}

/** "2026.10.03" or "2026.10.03 – 10.05" (the year/month repeat only when they change). */
export function formatTripDates(start: string, end?: string | null): string {
  if (!end || end === start) return dotDate(start);
  const [sy, sm] = start.split('-');
  const [ey, em, ed] = end.split('-');
  const tail = ey !== sy ? dotDate(end) : em !== sm ? `${em}.${ed}` : ed;
  return `${dotDate(start)} – ${tail}`;
}

/** Custom title, or e.g. "속초 · 2026.10" from the city and the trip's first day. */
export function cityFolderTitle(folder: Pick<CityFolder, 'title' | 'cityCode' | 'cityName' | 'startDate'>): string {
  if (folder.title) return folder.title;
  const short = getCity(folder.cityCode)?.short ?? folder.cityName;
  return `${short} · ${folder.startDate.slice(0, 7).replace('-', '.')}`;
}
