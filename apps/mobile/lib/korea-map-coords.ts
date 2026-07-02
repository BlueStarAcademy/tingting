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

export type SvgPoint = { x: number; y: number };
export type MapPin = SvgPoint & { label?: string };

/** Map WGS84 coordinates to SVG viewBox (0–1000) using inverse-distance weighting */
export function latLngToSvg(lat: number, lng: number): SvgPoint {
  let wx = 0;
  let wy = 0;
  let w = 0;
  for (const p of CALIBRATION) {
    const d = Math.sqrt((lat - p.lat) ** 2 + (lng - p.lng) ** 2) + 0.02;
    const weight = 1 / (d * d);
    wx += p.sx * weight;
    wy += p.sy * weight;
    w += weight;
  }
  const x = wx / w;
  const y = wy / w;
  const fineX = x + (lng - CALIBRATION.reduce((s, p) => s + p.lng, 0) / CALIBRATION.length) * 18;
  const fineY = y - (lat - CALIBRATION.reduce((s, p) => s + p.lat, 0) / CALIBRATION.length) * 22;
  return {
    x: Math.max(20, Math.min(980, fineX)),
    y: Math.max(20, Math.min(980, fineY)),
  };
}
