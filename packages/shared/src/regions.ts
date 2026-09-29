import type { Region } from './types';

/** Refined palette for visited regions on the map */
export const REGIONS: Region[] = [
  { code: 'SEO', name: '서울', nameEn: 'Seoul', color: '#4A6FA5' },
  { code: 'BUS', name: '부산', nameEn: 'Busan', color: '#3D8BCE' },
  { code: 'DAE', name: '대구', nameEn: 'Daegu', color: '#6B7FD7' },
  { code: 'ICN', name: '인천', nameEn: 'Incheon', color: '#5B7C99' },
  { code: 'GWJ', name: '광주', nameEn: 'Gwangju', color: '#5E8F8B' },
  { code: 'DJN', name: '대전', nameEn: 'Daejeon', color: '#6A7F9B' },
  { code: 'ULS', name: '울산', nameEn: 'Ulsan', color: '#4E7A9C' },
  { code: 'SJG', name: '세종', nameEn: 'Sejong', color: '#7A8FA6' },
  { code: 'GGD', name: '경기', nameEn: 'Gyeonggi', color: '#567BA8' },
  { code: 'GWN', name: '강원', nameEn: 'Gangwon', color: '#3E6F8F' },
  { code: 'NCB', name: '충북', nameEn: 'North Chungcheong', color: '#6289A0' },
  { code: 'SCB', name: '충남', nameEn: 'South Chungcheong', color: '#5C85A8' },
  { code: 'NJB', name: '전북', nameEn: 'North Jeolla', color: '#6B8F7A' },
  { code: 'SJB', name: '전남', nameEn: 'South Jeolla', color: '#4F8F9A' },
  { code: 'NGB', name: '경북', nameEn: 'North Gyeongsang', color: '#7A6B9A' },
  { code: 'SGB', name: '경남', nameEn: 'South Gyeongsang', color: '#5A82B0' },
  { code: 'JEJ', name: '제주', nameEn: 'Jeju', color: '#4A9B8E' },
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
