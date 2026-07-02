import { KOREA_MAP_REGIONS } from '@/constants/korea-map-paths';

/** Region center lat/lng paired with SVG label positions for interpolation */
const CALIBRATION = [
  { code: 'SEO', lat: 37.5665, lng: 126.978 },
  { code: 'BUS', lat: 35.1796, lng: 129.0756 },
  { code: 'DAE', lat: 35.8714, lng: 128.6014 },
  { code: 'ICN', lat: 37.4563, lng: 126.7052 },
  { code: 'GWJ', lat: 35.1595, lng: 126.8526 },
  { code: 'DJN', lat: 36.3504, lng: 127.3845 },
  { code: 'ULS', lat: 35.5384, lng: 129.3114 },
  { code: 'SJG', lat: 36.48, lng: 127.289 },
  { code: 'GGD', lat: 37.2636, lng: 127.0286 },
  { code: 'GWN', lat: 37.8228, lng: 128.1555 },
  { code: 'NCB', lat: 36.6357, lng: 127.4917 },
  { code: 'SCB', lat: 36.5184, lng: 126.8 },
  { code: 'NJB', lat: 35.8242, lng: 127.148 },
  { code: 'SJB', lat: 34.8679, lng: 126.991 },
  { code: 'NGB', lat: 36.4919, lng: 128.8889 },
  { code: 'SGB', lat: 35.4606, lng: 128.2132 },
  { code: 'JEJ', lat: 33.4996, lng: 126.5312 },
].map((c) => {
  const label = KOREA_MAP_REGIONS.find((r) => r.code === c.code)?.label;
  return { ...c, sx: label?.cx ?? 500, sy: label?.cy ?? 500 };
});

const LNG_SCALE = 22;
const LAT_SCALE = 28;

export type SvgPoint = { x: number; y: number };
export type MapPin = SvgPoint & { label?: string };

function roundSvg(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Valid SVG path for map pin marker (web DOM requires complete cubic segments). */
export function mapPinPathD(x: number, y: number): string {
  const px = roundSvg(x);
  const py = roundSvg(y);
  const top = roundSvg(py - 16);
  const bottom = roundSvg(py + 12);
  return [
    `M ${px} ${top}`,
    `C ${roundSvg(px - 11)} ${roundSvg(py - 7)} ${roundSvg(px - 11)} ${roundSvg(py + 5)} ${px} ${bottom}`,
    `C ${roundSvg(px + 11)} ${roundSvg(py + 5)} ${roundSvg(px + 11)} ${roundSvg(py - 7)} ${px} ${top}`,
    'Z',
  ].join(' ');
}

function clampSvg(value: number): number {
  return Math.max(20, Math.min(980, value));
}

function anchorFromRegionCode(regionCode?: string) {
  if (!regionCode) return undefined;
  return CALIBRATION.find((p) => p.code === regionCode);
}

function nearestAnchor(lat: number, lng: number) {
  let nearest = CALIBRATION[0];
  let best = Infinity;
  for (const p of CALIBRATION) {
    const d = (lat - p.lat) ** 2 + (lng - p.lng) ** 2;
    if (d < best) {
      best = d;
      nearest = p;
    }
  }
  return nearest;
}

/** Map WGS84 coordinates to SVG viewBox (0–1000) using region-anchored offsets */
export function latLngToSvg(lat: number, lng: number, regionCode?: string): SvgPoint {
  const anchor = anchorFromRegionCode(regionCode) ?? nearestAnchor(lat, lng);
  const x = anchor.sx + (lng - anchor.lng) * LNG_SCALE;
  const y = anchor.sy - (lat - anchor.lat) * LAT_SCALE;
  return { x: clampSvg(x), y: clampSvg(y) };
}
