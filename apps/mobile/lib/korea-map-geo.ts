import { REGIONS, type Region } from '@tingting/shared';
import { KOREA_MAP_REGIONS } from '@/constants/korea-map-paths';
import { METRO_CODES } from '@/lib/korea-map-render';
import { parseSvgPath } from '@/lib/svg-path-parse';

const LNG_SCALE = 22;
const LAT_SCALE = 28;

const REGION_BY_CODE = Object.fromEntries(REGIONS.map((r) => [r.code, r]));

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

const CALIBRATION_BY_CODE = Object.fromEntries(CALIBRATION.map((c) => [c.code, c]));

export type LatLng = { latitude: number; longitude: number };

export type RegionPolygon = {
  code: string;
  region: Region;
  coordinates: LatLng[];
};

export const KOREA_INITIAL_REGION = {
  latitude: 36.15,
  longitude: 127.75,
  latitudeDelta: 5.8,
  longitudeDelta: 4.8,
};

function svgToLatLng(x: number, y: number, code: string): LatLng {
  const anchor = CALIBRATION_BY_CODE[code] ?? CALIBRATION[0];
  return {
    latitude: anchor.lat - (y - anchor.sy) / LAT_SCALE,
    longitude: anchor.lng + (x - anchor.sx) / LNG_SCALE,
  };
}

function buildRegionPolygons(): RegionPolygon[] {
  return KOREA_MAP_REGIONS.map(({ code, d }) => {
    const region = REGION_BY_CODE[code];
    const svgPoints = parseSvgPath(d);
    const coordinates = svgPoints.map(({ x, y }) => svgToLatLng(x, y, code));
    return { code, region, coordinates };
  }).filter((entry): entry is RegionPolygon => !!entry.region && entry.coordinates.length >= 3);
}

export const REGION_POLYGONS = buildRegionPolygons();

const REGION_POLYGON_BY_CODE = Object.fromEntries(REGION_POLYGONS.map((p) => [p.code, p]));

function pointInPolygon(lat: number, lng: number, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const HIT_TEST_ORDER = [
  ...['GGD', 'GWN', 'NCB', 'SCB', 'NJB', 'SJB', 'NGB', 'SGB', 'JEJ'],
  ...['GWJ', 'DJN', 'ICN', 'SEO', 'DAE', 'SJG', 'ULS', 'BUS'],
];

export function findRegionAtLatLng(latitude: number, longitude: number): Region | undefined {
  for (const code of HIT_TEST_ORDER) {
    const polygon = REGION_POLYGON_BY_CODE[code];
    if (!polygon) continue;
    if (pointInPolygon(latitude, longitude, polygon.coordinates)) {
      return polygon.region;
    }
  }
  return undefined;
}

export function regionFocusRegion(code: string, zoomLevel = 1): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const anchor = CALIBRATION_BY_CODE[code] ?? CALIBRATION[0];
  const isMetro = METRO_CODES.has(code);
  const baseLat = isMetro ? 0.55 : 1.1;
  const baseLng = isMetro ? 0.45 : 0.9;
  const scale = 1 / Math.max(zoomLevel, 0.5);
  return {
    latitude: anchor.lat,
    longitude: anchor.lng,
    latitudeDelta: baseLat * scale,
    longitudeDelta: baseLng * scale,
  };
}

export function placeFocusRegion(lat: number, lng: number, zoomLevel = 5.5): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  const scale = 6 / Math.max(zoomLevel, 1);
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.35 * scale,
    longitudeDelta: 0.35 * scale,
  };
}
