import { REGIONS, type Region } from '@tingting/shared';
import { KOREA_MAP_REGIONS, KOREA_MAP_VIEWBOX } from '@/constants/korea-map-paths';
import { METRO_CODES } from '@/lib/korea-map-render';

const REGION_BY_CODE = Object.fromEntries(REGIONS.map((r) => [r.code, r]));
const VB_SIZE = Number(KOREA_MAP_VIEWBOX.split(' ')[3]) || 1000;

const METRO_HIT_RADIUS = 52;
const PROVINCE_HIT_RADIUS = 78;

/** Map pixel coords → nearest region (metros prioritized when close). */
export function findRegionAtPoint(mapX: number, mapY: number, mapSize: number): Region | undefined {
  const svgX = (mapX / mapSize) * VB_SIZE;
  const svgY = (mapY / mapSize) * VB_SIZE;

  let best: Region | undefined;
  let bestScore = Infinity;

  for (const { code, label } of KOREA_MAP_REGIONS) {
    const region = REGION_BY_CODE[code];
    if (!region) continue;
    const dx = label.cx - svgX;
    const dy = label.cy - svgY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = METRO_CODES.has(code) ? METRO_HIT_RADIUS : PROVINCE_HIT_RADIUS;
    if (dist > radius) continue;
    const score = dist + (METRO_CODES.has(code) ? 0 : 12);
    if (score < bestScore) {
      bestScore = score;
      best = region;
    }
  }

  return best;
}
