import { getProvinceMap, layoutLabels, cityFill, pinPath, PIN_PX, textWidth, type CityStat, type Viewport } from '@/lib/city-map';
import { theme } from '@/constants/theme';

/** Flat drawing list in map units, rendered by react-native-svg (native) or DOM svg (web). */
export type SceneNode =
  | { t: 'path'; k: string; d: string; fill: string; stroke?: string; sw?: number; dash?: string }
  | { t: 'rect'; k: string; x: number; y: number; w: number; h: number; rx: number; fill: string; stroke?: string; sw?: number; dash?: string }
  | { t: 'circle'; k: string; cx: number; cy: number; r: number; fill: string; stroke?: string; sw?: number }
  | { t: 'text'; k: string; x: number; y: number; text: string; size: number; fill: string; weight: '700' | '800' | '900' };

export const SEA_GRADIENT_ID = 'cityMapSea';
export const SEA_STOPS = [theme.colors.mapSeaStart, theme.colors.mapSeaEnd];

const LAND = theme.colors.mapUnvisited;
const LAND_STROKE = theme.colors.mapStroke;

export function buildCityScene(opts: {
  regionCode: string;
  viewport: Viewport;
  /** Screen px per map unit */
  scale: number;
  stats: Map<string, CityStat>;
  selected?: string | null;
  showLabels?: boolean;
}): SceneNode[] {
  const { regionCode, viewport: vp, scale, stats, selected, showLabels = true } = opts;
  const map = getProvinceMap(regionCode);
  if (!map) return [];
  const px = (n: number) => n / scale;
  const nodes: SceneNode[] = [];
  const bleed = Math.max(vp.w, vp.h);
  nodes.push({ t: 'rect', k: 'sea', x: vp.x - bleed, y: vp.y - bleed, w: vp.w + bleed * 2, h: vp.h + bleed * 2, rx: 0, fill: `url(#${SEA_GRADIENT_ID})` });

  if (map.inset) {
    const [x, y, w, h] = map.inset;
    nodes.push({ t: 'rect', k: 'inset', x, y, w, h, rx: px(8), fill: 'rgba(255,255,255,0.45)', stroke: theme.colors.borderStrong, sw: px(1), dash: `${px(4)} ${px(3)}` });
  }

  for (const c of map.cities) {
    nodes.push({
      t: 'path',
      k: `c${c.c}`,
      d: c.d,
      fill: cityFill(stats.get(c.c), theme.colors.mapHeat, LAND),
      stroke: LAND_STROKE,
      sw: px(1.3),
    });
  }
  const sel = selected ? map.cities.find((c) => c.c === selected) : undefined;
  if (sel) nodes.push({ t: 'path', k: 'sel', d: sel.d, fill: 'none', stroke: theme.colors.mapSelectedOutline, sw: px(2.6) });

  for (const lb of map.labels ?? []) {
    nodes.push({ t: 'text', k: `x${lb.t}`, x: lb.x, y: lb.y + px(3.5), text: lb.t, size: px(9.5), fill: theme.colors.textMuted, weight: '700' });
  }

  if (!showLabels) return nodes;
  const labels = layoutLabels({ regionCode, viewport: vp, scale, stats, selected });
  // Plain labels first so pins and their badges sit on top.
  for (const lb of labels.filter((l) => !l.featured)) {
    const isSel = lb.code === selected;
    const w = px(textWidth(lb.text, lb.fontPx) + 12);
    const h = px(lb.fontPx + 7);
    nodes.push({
      t: 'rect',
      k: `lp${lb.code}`,
      x: lb.x - w / 2,
      y: lb.y - h / 2,
      w,
      h,
      rx: h / 2,
      fill: isSel ? theme.colors.mapSelectedOutline : 'rgba(255,255,255,0.9)',
      stroke: isSel ? 'rgba(255,255,255,0.7)' : theme.colors.borderStrong,
      sw: px(1),
    });
    nodes.push({
      t: 'text',
      k: `lt${lb.code}`,
      x: lb.x,
      y: lb.y + px(lb.fontPx * 0.36),
      text: lb.text,
      size: px(lb.fontPx),
      fill: isSel ? '#FFFFFF' : theme.colors.textMuted,
      weight: '700',
    });
  }
  for (const lb of labels.filter((l) => l.featured)) {
    const isSel = lb.code === selected;
    const w = px(textWidth(lb.text, lb.fontPx) + 12);
    const h = px(lb.fontPx + 7);
    nodes.push({ t: 'rect', k: `lp${lb.code}`, x: lb.lx - w / 2, y: lb.ly - h / 2, w, h, rx: h / 2, fill: isSel ? theme.colors.mapSelectedOutline : theme.colors.primaryDark, stroke: 'rgba(255,255,255,0.75)', sw: px(1) });
    nodes.push({ t: 'text', k: `lt${lb.code}`, x: lb.lx, y: lb.ly + px(lb.fontPx * 0.36), text: lb.text, size: px(lb.fontPx), fill: '#FFFFFF', weight: '800' });
    nodes.push({ t: 'path', k: `pin${lb.code}`, d: pinPath(lb.x, lb.y, px(PIN_PX.w), px(PIN_PX.h)), fill: theme.colors.primary, stroke: '#FFFFFF', sw: px(2) });
    const cy = lb.y - px(PIN_PX.h) + px(PIN_PX.w / 2);
    nodes.push({ t: 'circle', k: `pd${lb.code}`, cx: lb.x, cy, r: px(4), fill: '#FFFFFF' });
    const label = lb.count > 9 ? '9+' : String(lb.count);
    const bx = lb.x + px(PIN_PX.w / 2);
    const by = lb.y - px(PIN_PX.h) + px(2);
    nodes.push({ t: 'circle', k: `pb${lb.code}`, cx: bx, cy: by, r: px(7.5), fill: theme.colors.accentDark, stroke: '#FFFFFF', sw: px(1.5) });
    nodes.push({ t: 'text', k: `pc${lb.code}`, x: bx, y: by + px(3.4), text: label, size: px(9.5), fill: '#FFFFFF', weight: '900' });
  }
  return nodes;
}
