/**
 * Builds the 시/군/구 outlines behind the province detail map in 지역별 앨범.
 *
 * Source: vuski/admdongkor `HangJeongDong_ver20260701.geojson` (행정동 boundaries as of 2026-07-01).
 *   이 데이터는 통계청 SGIS(https://sgis.kostat.go.kr)에서 공공누리 제1유형으로 제공한 행정동 경계를
 *   가공한 것이며(가공: vuski/admdongkor, https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다.
 *   Derived from Statistics Korea SGIS boundaries (KOGL Type 1), modified by vuski/admdongkor,
 *   distributed under CC BY 4.0. Our dissolved/simplified output keeps that license and attribution.
 *
 * Grouping:
 *   - 특별·광역시 (서울/부산/대구/인천/광주/대전/울산): 구/군. 군위군 is part of 대구 since 2023.
 *   - 도: 시/군; a 시's 일반구 (수원 장안구, 부천 원미구, 화성 동탄구 …) merge into the 시.
 *   - 세종: it has no 구, so its 읍/면/동 are used instead.
 *   - The 2026 data files 광주 and 전남 under one 전남광주통합특별시 (sido 12); the app keeps them
 *     apart, so 광주's five 구 go to GWJ and the rest to SJB.
 *   - Far-off islands that would shrink the mainland are dropped (백령·대청·연평, 흑산·가거, 격렬비열,
 *     어청, 추자) and 울릉도·독도 are drawn as an enlarged inset off the 경북 coast.
 *
 * Output (both committed):
 *   apps/mobile/lib/city-map-data.ts   per-province outlines in a 1000-wide local frame
 *   packages/shared/src/city-data.ts   code, name, province, label point and bbox per municipality
 *
 * Usage: node scripts/build-city-map.mjs [path/to/HangJeongDong.geojson]
 * Downloads the source to the OS temp dir when no path is given; runs mapshaper through npx.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_URL = 'https://raw.githubusercontent.com/vuski/admdongkor/master/ver20260701/HangJeongDong_ver20260701.geojson';
const SOURCE_VERSION = '20260701';
const MAPSHAPER = 'mapshaper@0.6.121';
const WIDTH = 1000;
/** Simplification tolerance and smallest kept ring, in output units (WIDTH = province width). */
const SIMPLIFY_UNITS = 1.6;
const MIN_RING_AREA = 9;

const OUT_MOBILE = path.join(__dirname, '../lib/city-map-data.ts');
const OUT_SHARED = path.join(__dirname, '../../../packages/shared/src/city-data.ts');
const WORK = path.join(os.tmpdir(), 'tingting-city-map');

const SIDO = {
  11: 'SEO', 26: 'BUS', 27: 'DAE', 28: 'ICN', 29: 'GWJ', 30: 'DJN', 31: 'ULS', 36: 'SJG',
  41: 'GGD', 42: 'GWN', 51: 'GWN', 43: 'NCB', 44: 'SCB', 45: 'NJB', 52: 'NJB', 46: 'SJB',
  47: 'NGB', 48: 'SGB', 50: 'JEJ',
};
const GWANGJU_GU = new Set(['동구', '서구', '남구', '북구', '광산구']);
const METROS = new Set(['SEO', 'BUS', 'DAE', 'ICN', 'GWJ', 'DJN', 'ULS']);

/**
 * keep: rings whose bbox center falls outside [w, s, e, n] are dropped.
 * shift: rings starting inside `box` move so the box center lands on `to`, scaled by `scale`;
 * shifted rings are framed as an inset and never dropped for being small.
 */
const PROVINCE_CONFIG = {
  ICN: { keep: [126.0, 36.5, 127.5, 38.5] },
  SJB: { keep: [125.85, 33.5, 128.5, 36] },
  SCB: { keep: [125.9, 35.5, 128, 37.5] },
  NJB: { keep: [126.0, 35, 128.5, 36.5] },
  JEJ: { keep: [125.5, 33, 127.5, 33.7] },
  NGB: {
    shift: [
      { box: [130.7, 37.4, 131.0, 37.6], to: [129.66, 36.97], scale: 1.5 },
      { box: [131.8, 37.2, 131.95, 37.3], to: [129.84, 36.86], scale: 4 },
    ],
    labels: [{ text: '독도', at: [129.84, 36.86], dy: 14 }],
  },
};

function run(args) {
  const res = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', MAPSHAPER, ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) throw new Error(`mapshaper failed: ${args.join(' ')}`);
}

async function loadSource() {
  const given = process.argv[2];
  if (given) return JSON.parse(fs.readFileSync(given, 'utf8'));
  const cached = path.join(WORK, `HangJeongDong_ver${SOURCE_VERSION}.geojson`);
  if (!fs.existsSync(cached)) {
    console.log('Downloading', SOURCE_URL);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    fs.writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(cached, 'utf8'));
}

function provinceOf(p) {
  if (String(p.sido) === '12') return GWANGJU_GU.has(p.sggnm) ? 'GWJ' : 'SJB';
  return SIDO[p.sido];
}

/** Group key and display name for one 행정동. */
function cityOf(p, prov) {
  if (prov === 'SJG') return { key: String(p.adm_cd2), name: String(p.adm_nm).split(' ').pop() };
  if (METROS.has(prov)) return { key: String(p.sgg), name: p.sggnm };
  const m = /^(.+?시)(.+구)$/.exec(p.sggnm);
  if (m) return { key: `${String(p.sgg).slice(0, 4)}0`, name: m[1] };
  return { key: String(p.sgg), name: p.sggnm };
}

/** "속초시" -> "속초", but "중구" stays (one-letter names read badly). */
function shortName(name) {
  const m = /^(.+)(시|군|구|읍|면|동)$/.exec(name);
  return m && m[1].length >= 2 ? m[1] : name;
}

const ringBox = (ring) => {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of ring) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [w, s, e, n];
};
const inBox = ([x, y], b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

function shiftFor(prov, ring) {
  return PROVINCE_CONFIG[prov]?.shift?.find((s) => inBox(ring[0], s.box));
}

function applyShift(ring, s) {
  const cx = (s.box[0] + s.box[2]) / 2;
  const cy = (s.box[1] + s.box[3]) / 2;
  return ring.map(([x, y]) => [s.to[0] + (x - cx) * s.scale, s.to[1] + (y - cy) * s.scale]);
}

function prepare(source) {
  const features = [];
  /** Real-world bbox per city (before any inset shift), for map centering and search bias. */
  const realBox = new Map();
  for (const f of source.features) {
    const p = f.properties;
    const prov = provinceOf(p);
    if (!prov) throw new Error(`unknown sido ${p.sido} ${p.sidonm}`);
    const { key, name } = cityOf(p, prov);
    const keep = PROVINCE_CONFIG[prov]?.keep;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const out = [];
    for (const poly of polys) {
      const box = ringBox(poly[0]);
      const center = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
      if (keep && !inBox(center, keep)) continue;
      const rb = realBox.get(key) ?? [Infinity, Infinity, -Infinity, -Infinity];
      realBox.set(key, [Math.min(rb[0], box[0]), Math.min(rb[1], box[1]), Math.max(rb[2], box[2]), Math.max(rb[3], box[3])]);
      const shift = shiftFor(prov, poly[0]);
      out.push(shift ? poly.map((ring) => applyShift(ring, shift)) : poly);
    }
    if (!out.length) continue;
    features.push({
      type: 'Feature',
      properties: { key, prov, name },
      geometry: { type: 'MultiPolygon', coordinates: out },
    });
  }
  return { collection: { type: 'FeatureCollection', features }, realBox };
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return a / 2;
}

/** Compact SVG path: absolute move, relative integer lines ("M12 34l3-2 5 1z"). */
function encodeRing(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}l`;
  let px = pts[0][0];
  let py = pts[0][1];
  const nums = [];
  for (let i = 1; i < pts.length; i++) {
    nums.push(pts[i][0] - px, pts[i][1] - py);
    px = pts[i][0];
    py = pts[i][1];
  }
  d += nums.map((n, i) => (i === 0 || n < 0 ? String(n) : ` ${n}`)).join('');
  return `${d}z`;
}

function quantizeRing(ring, project) {
  const pts = [];
  for (const [lng, lat] of ring) {
    const [x, y] = project(lng, lat);
    const q = [Math.round(x), Math.round(y)];
    const last = pts[pts.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) pts.push(q);
  }
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  return pts;
}

const round = (n, digits) => Number(n.toFixed(digits));

async function main() {
  fs.mkdirSync(WORK, { recursive: true });
  const source = await loadSource();
  const { collection, realBox } = prepare(source);
  const prepped = path.join(WORK, 'prepped.json');
  fs.writeFileSync(prepped, JSON.stringify(collection));

  const dissolved = path.join(WORK, 'dissolved.json');
  run(['-i', prepped, '-dissolve2', 'key', 'copy-fields=prov,name', '-o', dissolved, 'format=geojson']);
  const all = JSON.parse(fs.readFileSync(dissolved, 'utf8')).features;

  const provinces = [...new Set(all.map((f) => f.properties.prov))].sort();
  const mobile = {};
  const shared = [];

  for (const prov of provinces) {
    const feats = all.filter((f) => f.properties.prov === prov);
    let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const f of feats) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const poly of polys) {
        const b = ringBox(poly[0]);
        [w, s, e, n] = [Math.min(w, b[0]), Math.min(s, b[1]), Math.max(e, b[2]), Math.max(n, b[3])];
      }
    }
    const cos = Math.cos((((s + n) / 2) * Math.PI) / 180);
    const widthM = (e - w) * 111320 * cos;
    const interval = Math.max(8, (widthM / WIDTH) * SIMPLIFY_UNITS);

    const input = path.join(WORK, `in_${prov}.json`);
    const shapesFile = path.join(WORK, `shapes_${prov}.json`);
    const labelsFile = path.join(WORK, `labels_${prov}.json`);
    fs.writeFileSync(input, JSON.stringify({ type: 'FeatureCollection', features: feats }));
    run(['-i', input, '-simplify', `interval=${interval.toFixed(1)}`, 'keep-shapes', '-o', shapesFile, 'format=geojson',
      '-points', 'inner', '-o', labelsFile, 'format=geojson']);
    const shapes = JSON.parse(fs.readFileSync(shapesFile, 'utf8')).features;
    const labels = new Map(JSON.parse(fs.readFileSync(labelsFile, 'utf8')).features.map((f) => [f.properties.key, f.geometry.coordinates]));

    const k = WIDTH / ((e - w) * cos);
    const kx = k * cos;
    const ky = k;
    const pad = 12;
    const project = (lng, lat) => [pad + (lng - w) * kx * ((WIDTH - 2 * pad) / WIDTH), pad + (n - lat) * ky * ((WIDTH - 2 * pad) / WIDTH)];
    const height = Math.round(pad * 2 + (n - s) * ky * ((WIDTH - 2 * pad) / WIDTH));
    const shifts = PROVINCE_CONFIG[prov]?.shift ?? [];
    const insetBoxes = shifts.map((sh) => {
      const cx = (sh.box[0] + sh.box[2]) / 2;
      const cy = (sh.box[1] + sh.box[3]) / 2;
      const hw = ((sh.box[2] - sh.box[0]) / 2) * sh.scale;
      const hh = ((sh.box[3] - sh.box[1]) / 2) * sh.scale;
      return { sh, cx, cy, box: [sh.to[0] - hw, sh.to[1] - hh, sh.to[0] + hw, sh.to[1] + hh] };
    });
    const isInset = (ring) => insetBoxes.some((ib) => inBox(ring[0], ib.box));

    const cities = [];
    let insetFrame = null;
    for (const f of shapes.sort((a, b) => a.properties.key.localeCompare(b.properties.key))) {
      const { key, name } = f.properties;
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      const rings = [];
      let area = 0;
      for (const poly of polys) {
        const outer = quantizeRing(poly[0], project);
        const inset = isInset(poly[0]);
        const a = Math.abs(ringArea(outer));
        if (outer.length < 3 || (a < MIN_RING_AREA && !inset)) continue;
        if (inset) {
          const b = ringBox(outer);
          insetFrame = insetFrame
            ? [Math.min(insetFrame[0], b[0]), Math.min(insetFrame[1], b[1]), Math.max(insetFrame[2], b[2]), Math.max(insetFrame[3], b[3])]
            : b;
        }
        area += a;
        rings.push(encodeRing(outer));
        for (const hole of poly.slice(1)) {
          const h = quantizeRing(hole, project);
          const ha = Math.abs(ringArea(h));
          if (h.length < 3 || ha < MIN_RING_AREA) continue;
          area -= ha;
          rings.push(encodeRing(h));
        }
      }
      if (!rings.length) {
        console.warn(`  ${prov} ${name}: every ring dropped`);
        continue;
      }
      const lp = labels.get(key);
      const [lx, ly] = project(lp[0], lp[1]);
      // Inset label points are in shifted coordinates; map them back for the real-world center.
      let real = lp;
      const ib = insetBoxes.find((b) => inBox(lp, b.box));
      if (ib) real = [ib.cx + (lp[0] - ib.sh.to[0]) / ib.sh.scale, ib.cy + (lp[1] - ib.sh.to[1]) / ib.sh.scale];
      const rb = realBox.get(key);
      cities.push({ c: key, d: rings.join(''), l: [Math.round(lx), Math.round(ly)], a: Math.round(area) });
      shared.push([key, name, shortName(name), prov, round(real[1], 4), round(real[0], 4), rb.map((v) => round(v, 3))]);
    }

    const extraLabels = (PROVINCE_CONFIG[prov]?.labels ?? []).map((lb) => {
      const [x, y] = project(lb.at[0], lb.at[1]);
      return { t: lb.text, x: Math.round(x), y: Math.round(y + (lb.dy ?? 0)) };
    });
    const entry = { w: WIDTH, h: height, proj: [round(w, 5), round(n, 5), round(kx * ((WIDTH - 2 * pad) / WIDTH), 4), round(ky * ((WIDTH - 2 * pad) / WIDTH), 4), pad], cities };
    if (insetFrame) {
      const m = 14;
      entry.inset = [insetFrame[0] - m, insetFrame[1] - m, insetFrame[2] - insetFrame[0] + 2 * m, insetFrame[3] - insetFrame[1] + 2 * m + (extraLabels.length ? 10 : 0)];
    }
    if (extraLabels.length) entry.labels = extraLabels;
    mobile[prov] = entry;
    const bytes = JSON.stringify(entry).length;
    console.log(`${prov}: ${cities.length} areas, ${WIDTH}x${height}, interval ${interval.toFixed(0)} m, ${(bytes / 1024).toFixed(1)} KB`);
  }

  const header = `/**
 * Generated by apps/mobile/scripts/build-city-map.mjs — do not edit by hand.
 * 행정동 경계 출처: 통계청 SGIS (공공누리 제1유형), 가공: vuski/admdongkor ver${SOURCE_VERSION}, CC BY 4.0.
 * Boundaries: Statistics Korea SGIS (KOGL Type 1) via vuski/admdongkor ver${SOURCE_VERSION}, CC BY 4.0;
 * dissolved to 시/군/구 and simplified for TingTing.
 */`;

  const mobileTs = `${header}

/** One municipality: compact SVG path (absolute M, relative integer l), label point, area in map units². */
export type CityShape = { c: string; d: string; l: [number, number]; a: number };

export type CityMapProvince = {
  w: number;
  h: number;
  /** [west lng, north lat, x units per degree lng, y units per degree lat, padding] */
  proj: [number, number, number, number, number];
  cities: CityShape[];
  /** Frame [x, y, w, h] around islands drawn enlarged out of place (울릉도·독도) */
  inset?: [number, number, number, number];
  labels?: { t: string; x: number; y: number }[];
};

export const CITY_MAP_DATA: Record<string, CityMapProvince> = ${JSON.stringify(mobile)};
`;
  fs.writeFileSync(OUT_MOBILE, mobileTs);

  shared.sort((a, b) => a[3].localeCompare(b[3]) || a[0].localeCompare(b[0]));
  const sharedTs = `${header}

/** [code, name, short label, province code, lat, lng, [west, south, east, north]] */
export type CityTuple = [string, string, string, string, number, number, [number, number, number, number]];

export const CITY_DATA_VERSION = '${SOURCE_VERSION}';

export const CITY_TUPLES: CityTuple[] = [
${shared.map((row) => `  ${JSON.stringify(row)},`).join('\n')}
];
`;
  fs.writeFileSync(OUT_SHARED, sharedTs);
  console.log(`Wrote ${OUT_MOBILE} (${(fs.statSync(OUT_MOBILE).size / 1024).toFixed(0)} KB)`);
  console.log(`Wrote ${OUT_SHARED} (${(fs.statSync(OUT_SHARED).size / 1024).toFixed(0)} KB, ${shared.length} areas)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
