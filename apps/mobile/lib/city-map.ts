import { getCity } from '@tingting/shared';
import { CITY_MAP_DATA, type CityMapProvince } from '@/lib/city-map-data';

export type { CityMapProvince } from '@/lib/city-map-data';

/** Map units are the generated 1000-wide frame of one province. */
export type Viewport = { x: number; y: number; w: number; h: number };

export type CityStat = { folders: number; photos: number };

export const CITY_MAP_ATTRIBUTION = '경계: 통계청 SGIS · vuski/admdongkor (CC BY 4.0)';

export function getProvinceMap(regionCode: string): CityMapProvince | undefined {
  return CITY_MAP_DATA[regionCode];
}

type Decoded = { code: string; rings: number[][]; bbox: [number, number, number, number]; area: number };

const decodedCache = new Map<string, Decoded[]>();

/** "M12 34l3-2 5 1z…" -> flat [x0, y0, x1, y1, …] rings. */
export function decodeRings(d: string): number[][] {
  const rings: number[][] = [];
  const re = /[Mlz]|-?\d+/g;
  let ring: number[] = [];
  let mode: 'M' | 'l' = 'M';
  let x = 0;
  let y = 0;
  let pending: number | null = null;
  for (let m = re.exec(d); m; m = re.exec(d)) {
    const tok = m[0];
    if (tok === 'M') {
      mode = 'M';
      ring = [];
      continue;
    }
    if (tok === 'l') {
      mode = 'l';
      continue;
    }
    if (tok === 'z') {
      if (ring.length >= 6) rings.push(ring);
      ring = [];
      continue;
    }
    const n = Number(tok);
    if (pending === null) {
      pending = n;
      continue;
    }
    if (mode === 'M') {
      x = pending;
      y = n;
    } else {
      x += pending;
      y += n;
    }
    ring.push(x, y);
    pending = null;
  }
  return rings;
}

function decoded(regionCode: string): Decoded[] {
  const hit = decodedCache.get(regionCode);
  if (hit) return hit;
  const map = getProvinceMap(regionCode);
  const out = (map?.cities ?? []).map((c) => {
    const rings = decodeRings(c.d);
    let w = Infinity;
    let s = Infinity;
    let e = -Infinity;
    let n = -Infinity;
    for (const r of rings) {
      for (let i = 0; i < r.length; i += 2) {
        if (r[i] < w) w = r[i];
        if (r[i] > e) e = r[i];
        if (r[i + 1] < s) s = r[i + 1];
        if (r[i + 1] > n) n = r[i + 1];
      }
    }
    return { code: c.c, rings, bbox: [w, s, e, n] as [number, number, number, number], area: c.a };
  });
  decodedCache.set(regionCode, out);
  return out;
}

function insideRings(rings: number[][], x: number, y: number): boolean {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const yi = r[i + 1];
      const yj = r[j + 1];
      if (yi > y !== yj > y && x < ((r[j] - r[i]) * (y - yi)) / (yj - yi) + r[i]) inside = !inside;
    }
  }
  return inside;
}

/**
 * The municipality under a map point; the smallest one wins where outlines overlap after
 * simplification. Misses within `tolerance` units of a label point still count, so tiny areas
 * stay tappable.
 */
export function cityAt(regionCode: string, x: number, y: number, tolerance = 0): string | null {
  let best: Decoded | null = null;
  for (const c of decoded(regionCode)) {
    const [w, s, e, n] = c.bbox;
    if (x < w || x > e || y < s || y > n) continue;
    if (insideRings(c.rings, x, y) && (!best || c.area < best.area)) best = c;
  }
  if (best) return best.code;
  if (tolerance <= 0) return null;
  const map = getProvinceMap(regionCode);
  let nearest: string | null = null;
  let bestDist = tolerance * tolerance;
  for (const c of map?.cities ?? []) {
    const d = (c.l[0] - x) ** 2 + (c.l[1] - y) ** 2;
    if (d <= bestDist) {
      bestDist = d;
      nearest = c.c;
    }
  }
  return nearest;
}

/** WGS84 -> province map units (ignores the 울릉도 inset shift). */
export function latLngToMap(regionCode: string, lat: number, lng: number): { x: number; y: number } | null {
  const map = getProvinceMap(regionCode);
  if (!map) return null;
  const [west, north, kx, ky, pad] = map.proj;
  return { x: pad + (lng - west) * kx, y: pad + (north - lat) * ky };
}

/** The city's outline as [lat, lng] rings, for drawing it on the street map. Empty for inset islands. */
export function cityOutlineLatLng(regionCode: string, cityCode: string): [number, number][][] {
  const map = getProvinceMap(regionCode);
  const city = decoded(regionCode).find((c) => c.code === cityCode);
  if (!map || !city) return [];
  const [west, north, kx, ky, pad] = map.proj;
  const inset = map.inset;
  return city.rings
    .filter((r) => !inset || !(r[0] >= inset[0] && r[0] <= inset[0] + inset[2] && r[1] >= inset[1] && r[1] <= inset[1] + inset[3]))
    .map((r) => {
      const out: [number, number][] = [];
      for (let i = 0; i < r.length; i += 2) {
        out.push([Number((north - (r[i + 1] - pad) / ky).toFixed(5)), Number((west + (r[i] - pad) / kx).toFixed(5))]);
      }
      return out;
    });
}

/** Whole province fitted into a `width`×`height` view (letterboxed with sea). */
export function fitViewport(map: CityMapProvince, width: number, height: number): Viewport {
  const scale = Math.min(width / map.w, height / map.h);
  const w = width / scale;
  const h = height / scale;
  return { x: (map.w - w) / 2, y: (map.h - h) / 2, w, h };
}

/** Keeps a zoomed viewport between 1× and `maxZoom`× of `base` and inside it. */
export function clampViewport(v: Viewport, base: Viewport, maxZoom = 6): Viewport {
  const w = Math.min(base.w, Math.max(base.w / maxZoom, v.w));
  const h = (w / v.w) * v.h;
  const x = Math.min(base.x + base.w - w, Math.max(base.x, v.x + (v.w - w) / 2));
  const y = Math.min(base.y + base.h - h, Math.max(base.y, v.y + (v.h - h) / 2));
  return { x, y, w, h };
}

/** Rough on-screen width of bold Korean label text. */
export function textWidth(text: string, fontPx: number): number {
  let w = 0;
  for (const ch of text) w += /[\u3131-\uD79D]/.test(ch) ? fontPx * 1.0 : fontPx * 0.62;
  return w;
}

export type MapLabel = {
  code: string;
  text: string;
  /** Pin tip (featured) or label center, in map units */
  x: number;
  y: number;
  /** Featured label pill center, in map units */
  lx: number;
  ly: number;
  fontPx: number;
  featured: boolean;
  count: number;
};

type Rect = [number, number, number, number];

const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export const PIN_PX = { w: 22, h: 28, labelGap: 4 };

/** Screen-px nudges tried for a featured pin when its spot is taken; kept only if still inside the city. */
const PIN_NUDGES: [number, number][] = [
  [0, 0],
  [0, 26],
  [0, -22],
  [24, 8],
  [-24, 8],
  [20, 30],
  [-20, 30],
  [0, 46],
  [30, -14],
  [-30, -14],
];

/**
 * Labels that fit at the current zoom without colliding: the selected city and cities with
 * folders always show (with a pin); the rest go largest first and hide when they would overlap.
 */
export function layoutLabels(opts: {
  regionCode: string;
  viewport: Viewport;
  /** Screen px per map unit */
  scale: number;
  stats: Map<string, CityStat>;
  selected?: string | null;
}): MapLabel[] {
  const { regionCode, viewport: vp, scale, stats, selected } = opts;
  const map = getProvinceMap(regionCode);
  if (!map) return [];
  const toScreen = (x: number, y: number) => [(x - vp.x) * scale, (y - vp.y) * scale];
  const viewW = vp.w * scale;
  const viewH = vp.h * scale;

  const candidates = map.cities
    .map((c) => {
      const info = getCity(c.c);
      const stat = stats.get(c.c);
      const featured = Boolean(stat && stat.folders > 0);
      const screenSide = Math.sqrt(c.a) * scale;
      const fontPx = featured || c.c === selected ? 12 : screenSide > 70 ? 11.5 : screenSide > 38 ? 10.5 : 9.5;
      return { c, text: info?.short ?? c.c, featured, count: stat?.folders ?? 0, fontPx };
    })
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.c.c === selected ? 2 : x.featured ? 1 : 0);
      return rank(b) - rank(a) || b.count - a.count || b.c.a - a.c.a;
    });

  const pad = 2;
  const placed: Rect[] = [];
  const out: MapLabel[] = [];
  const free = (rects: Rect[]) =>
    !rects.some((r) => placed.some((p) => overlaps([r[0] - pad, r[1] - pad, r[2] + pad, r[3] + pad], p)));

  for (const cand of candidates) {
    const [sx, sy] = toScreen(cand.c.l[0], cand.c.l[1]);
    if (sx < -20 || sy < -20 || sx > viewW + 20 || sy > viewH + 20) continue;
    const w = textWidth(cand.text, cand.fontPx) + 12;
    const h = cand.fontPx + 7;
    if (!cand.featured) {
      const rect: Rect = [sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2];
      if (!free([rect]) && cand.c.c !== selected) continue;
      placed.push(rect);
      out.push({ code: cand.c.c, text: cand.text, x: cand.c.l[0], y: cand.c.l[1], lx: cand.c.l[0], ly: cand.c.l[1], fontPx: cand.fontPx, featured: false, count: 0 });
      continue;
    }
    // Pin with its label below, beside or above it; nudge the pin within the city if needed.
    const layouts = (px: number, py: number): { rects: Rect[]; lx: number; ly: number }[] => {
      const pin: Rect = [px - PIN_PX.w / 2, py - PIN_PX.h, px + PIN_PX.w / 2 + 6, py];
      const below = { lx: px, ly: py + PIN_PX.labelGap + h / 2 };
      const right = { lx: px + PIN_PX.w / 2 + 8 + w / 2, ly: py - PIN_PX.h / 2 };
      const left = { lx: px - PIN_PX.w / 2 - 4 - w / 2, ly: py - PIN_PX.h / 2 };
      const above = { lx: px, ly: py - PIN_PX.h - 10 - h / 2 };
      return [below, right, left, above].map((l) => ({
        rects: [pin, [l.lx - w / 2, l.ly - h / 2, l.lx + w / 2, l.ly + h / 2] as Rect],
        lx: l.lx,
        ly: l.ly,
      }));
    };
    let chosen: { rects: Rect[]; px: number; py: number; lx: number; ly: number } | null = null;
    for (const [dx, dy] of PIN_NUDGES) {
      const px = sx + dx;
      const py = sy + dy;
      if ((dx || dy) && cityAt(regionCode, vp.x + px / scale, vp.y + py / scale) !== cand.c.c) continue;
      const fit = layouts(px, py).find((l) => free(l.rects));
      if (fit) {
        chosen = { ...fit, px, py };
        break;
      }
    }
    if (!chosen) chosen = { ...layouts(sx, sy)[0], px: sx, py: sy };
    placed.push(...chosen.rects);
    out.push({
      code: cand.c.c,
      text: cand.text,
      x: vp.x + chosen.px / scale,
      y: vp.y + chosen.py / scale,
      lx: vp.x + chosen.lx / scale,
      ly: vp.y + chosen.ly / scale,
      fontPx: cand.fontPx,
      featured: true,
      count: cand.count,
    });
  }
  return out;
}

/** Fill for a municipality: rose heat by how much was recorded there, like the national map. */
export function cityFill(stat: CityStat | undefined, heat: string[], empty: string): string {
  if (!stat || stat.folders <= 0) return empty;
  const score = stat.folders + stat.photos;
  const level = score <= 2 ? 0 : score <= 9 ? 1 : score <= 29 ? 2 : 3;
  return heat[Math.min(level, heat.length - 1)];
}

/** Teardrop pin with its tip at (x, y), sized in map units. */
export function pinPath(x: number, y: number, w: number, h: number): string {
  const r = w / 2;
  const cy = y - h + r;
  const f = (n: number) => Math.round(n * 100) / 100;
  return [
    `M${f(x)} ${f(y)}`,
    `C${f(x - r * 0.35)} ${f(y - h * 0.28)} ${f(x - r)} ${f(cy + r * 0.55)} ${f(x - r)} ${f(cy)}`,
    `A${f(r)} ${f(r)} 0 1 1 ${f(x + r)} ${f(cy)}`,
    `C${f(x + r)} ${f(cy + r * 0.55)} ${f(x + r * 0.35)} ${f(y - h * 0.28)} ${f(x)} ${f(y)}`,
    'Z',
  ].join(' ');
}
