import { KOREA_MAP_REGIONS, type KoreaMapRegionPath } from '@/constants/korea-map-paths';

/** Draw large provinces first; metros last so small cities stay clickable. */
const RENDER_ORDER: string[] = [
  'GGD',
  'GWN',
  'NCB',
  'SCB',
  'NJB',
  'SJB',
  'NGB',
  'SGB',
  'JEJ',
  'GWJ',
  'DJN',
  'ICN',
  'SEO',
  'DAE',
  'SJG',
  'ULS',
  'BUS',
];

/** Extra tap target (viewBox units) for compact metro shapes */
export const METRO_HIT_STROKE = 22;
export const METRO_CODES = new Set(['SEO', 'BUS', 'DAE', 'ICN', 'GWJ', 'DJN', 'ULS', 'SJG']);

const byCode = new Map(KOREA_MAP_REGIONS.map((r) => [r.code, r]));

export function getMapRegionsForRender(): KoreaMapRegionPath[] {
  const ordered: KoreaMapRegionPath[] = [];
  for (const code of RENDER_ORDER) {
    const region = byCode.get(code);
    if (region) ordered.push(region);
  }
  for (const region of KOREA_MAP_REGIONS) {
    if (!RENDER_ORDER.includes(region.code)) ordered.push(region);
  }
  return ordered;
}

/** Hit-test layer: metros on top (BUS last). */
export function getMapRegionsForHitTest(): KoreaMapRegionPath[] {
  const metros = RENDER_ORDER.filter((c) => METRO_CODES.has(c))
    .map((c) => byCode.get(c))
    .filter((r): r is KoreaMapRegionPath => !!r);
  return metros;
}
