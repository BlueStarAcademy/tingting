import type { Region } from './types';

/** Refined palette for visited regions on the map */
export const REGIONS: Region[] = [
  { code: 'SEO', name: '서울', nameEn: 'Seoul', color: '#E0607E' },
  { code: 'BUS', name: '부산', nameEn: 'Busan', color: '#F08A5D' },
  { code: 'DAE', name: '대구', nameEn: 'Daegu', color: '#E8A33D' },
  { code: 'ICN', name: '인천', nameEn: 'Incheon', color: '#C77DBA' },
  { code: 'GWJ', name: '광주', nameEn: 'Gwangju', color: '#4FA38C' },
  { code: 'DJN', name: '대전', nameEn: 'Daejeon', color: '#5B8DEF' },
  { code: 'ULS', name: '울산', nameEn: 'Ulsan', color: '#E9A23B' },
  { code: 'SJG', name: '세종', nameEn: 'Sejong', color: '#9C89D9' },
  { code: 'GGD', name: '경기', nameEn: 'Gyeonggi', color: '#EF7C8E' },
  { code: 'GWN', name: '강원', nameEn: 'Gangwon', color: '#3FA7A0' },
  { code: 'NCB', name: '충북', nameEn: 'North Chungcheong', color: '#8FB35B' },
  { code: 'SCB', name: '충남', nameEn: 'South Chungcheong', color: '#E6905A' },
  { code: 'NJB', name: '전북', nameEn: 'North Jeolla', color: '#6FB38F' },
  { code: 'SJB', name: '전남', nameEn: 'South Jeolla', color: '#D8739A' },
  { code: 'NGB', name: '경북', nameEn: 'North Gyeongsang', color: '#B98AD9' },
  { code: 'SGB', name: '경남', nameEn: 'South Gyeongsang', color: '#F29E6D' },
  { code: 'JEJ', name: '제주', nameEn: 'Jeju', color: '#3DB5C7' },
];

export function getRegion(code: string): Region | undefined {
  return REGIONS.find((r) => r.code === code);
}

/** Representative city-hall coordinates, used when an address can't be parsed. */
export const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  SEO: { lat: 37.5665, lng: 126.978 },
  BUS: { lat: 35.1796, lng: 129.0756 },
  DAE: { lat: 35.8714, lng: 128.6014 },
  ICN: { lat: 37.4563, lng: 126.7052 },
  GWJ: { lat: 35.1595, lng: 126.8526 },
  DJN: { lat: 36.3504, lng: 127.3845 },
  ULS: { lat: 35.5384, lng: 129.3114 },
  SJG: { lat: 36.48, lng: 127.289 },
  GGD: { lat: 37.2636, lng: 127.0286 },
  GWN: { lat: 37.8228, lng: 128.1555 },
  NCB: { lat: 36.6357, lng: 127.4917 },
  SCB: { lat: 36.5184, lng: 126.8 },
  NJB: { lat: 35.8242, lng: 127.148 },
  SJB: { lat: 34.8679, lng: 126.991 },
  NGB: { lat: 36.4919, lng: 128.8889 },
  SGB: { lat: 35.4606, lng: 128.2132 },
  JEJ: { lat: 33.4996, lng: 126.5312 },
};

/**
 * 법정동 시도 codes used by TourAPI KorService2 (`lDongRegnCd`). Gangwon and Jeollabuk-do
 * became special self-governing provinces (51, 52); the old codes are kept as fallbacks.
 */
export const REGION_LDONG_CODES: Record<string, string[]> = {
  SEO: ['11'],
  BUS: ['26'],
  DAE: ['27'],
  ICN: ['28'],
  GWJ: ['29'],
  DJN: ['30'],
  ULS: ['31'],
  SJG: ['36'],
  GGD: ['41'],
  GWN: ['51', '42'],
  NCB: ['43'],
  SCB: ['44'],
  NJB: ['52', '45'],
  SJB: ['46'],
  NGB: ['47'],
  SGB: ['48'],
  JEJ: ['50'],
};

/**
 * Travel hub per region with a search radius (m), for providers that can only search around a
 * point. Metros use city hall; provinces use their best-known tourist city.
 */
export const REGION_HUBS: Record<string, { lat: number; lng: number; radius: number }> = {
  SEO: { lat: 37.5665, lng: 126.978, radius: 12000 },
  BUS: { lat: 35.1631, lng: 129.0636, radius: 14000 },
  DAE: { lat: 35.8714, lng: 128.6014, radius: 12000 },
  ICN: { lat: 37.4563, lng: 126.7052, radius: 15000 },
  GWJ: { lat: 35.1595, lng: 126.8526, radius: 10000 },
  DJN: { lat: 36.3504, lng: 127.3845, radius: 10000 },
  ULS: { lat: 35.5384, lng: 129.3114, radius: 14000 },
  SJG: { lat: 36.48, lng: 127.289, radius: 10000 },
  GGD: { lat: 37.2636, lng: 127.0286, radius: 20000 },
  GWN: { lat: 37.7519, lng: 128.8761, radius: 25000 },
  NCB: { lat: 36.6424, lng: 127.489, radius: 20000 },
  SCB: { lat: 36.4465, lng: 127.119, radius: 25000 },
  NJB: { lat: 35.8155, lng: 127.1532, radius: 20000 },
  SJB: { lat: 34.7604, lng: 127.6622, radius: 25000 },
  NGB: { lat: 35.8562, lng: 129.2247, radius: 20000 },
  SGB: { lat: 34.8544, lng: 128.4331, radius: 25000 },
  JEJ: { lat: 33.4996, lng: 126.5312, radius: 30000 },
};

/** Great-circle distance in meters. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(a)));
}

const ADDRESS_PREFIXES: [string, string][] = [
  ['서울', 'SEO'],
  ['부산', 'BUS'],
  ['대구', 'DAE'],
  ['인천', 'ICN'],
  ['광주', 'GWJ'],
  ['대전', 'DJN'],
  ['울산', 'ULS'],
  ['세종', 'SJG'],
  ['경기', 'GGD'],
  ['강원', 'GWN'],
  ['충북', 'NCB'],
  ['충청북', 'NCB'],
  ['충남', 'SCB'],
  ['충청남', 'SCB'],
  ['전북', 'NJB'],
  ['전라북', 'NJB'],
  ['전남', 'SJB'],
  ['전라남', 'SJB'],
  ['경북', 'NGB'],
  ['경상북', 'NGB'],
  ['경남', 'SGB'],
  ['경상남', 'SGB'],
  ['제주', 'JEJ'],
];

export function regionCodeFromAddress(address: string | undefined | null): string | null {
  const first = (address ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first) return null;
  const hit = ADDRESS_PREFIXES.find(([prefix]) => first.startsWith(prefix));
  return hit ? hit[1] : null;
}

export function nearestRegionCode(lat: number, lng: number): string {
  let best = 'SEO';
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [code, center] of Object.entries(REGION_CENTERS)) {
    const d = (center.lat - lat) ** 2 + (center.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = code;
    }
  }
  return best;
}

export function resolveRegionCode(address: string | undefined | null, lat: number, lng: number): string {
  return regionCodeFromAddress(address) ?? nearestRegionCode(lat, lng);
}
