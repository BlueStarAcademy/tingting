import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svg = fs.readFileSync(path.join(__dirname, '../assets/korea-map.svg'), 'utf8');

const KR_TO_CODE = {
  KR11: 'SEO',
  KR26: 'BUS',
  KR27: 'DAE',
  KR28: 'ICN',
  KR29: 'GWJ',
  KR30: 'DJN',
  KR31: 'ULS',
  KR41: 'GGD',
  KR42: 'GWN',
  KR43: 'NCB',
  KR44: 'SCB',
  KR45: 'NJB',
  KR46: 'SJB',
  KR47: 'NGB',
  KR48: 'SGB',
  KR49: 'JEJ',
  KR50: 'SJG',
};

const pathRe = /<path d="([^"]+)" id="(KR\d+)" name="([^"]+)"/g;
const labelRe = /<circle[^>]+cx="([^"]+)" cy="([^"]+)" id="(KR\d+)"/g;

const paths = {};
let m;
while ((m = pathRe.exec(svg))) paths[m[2]] = m[1];

const labels = {};
while ((m = labelRe.exec(svg))) labels[m[3]] = { cx: +m[1], cy: +m[2] };

const regions = Object.entries(KR_TO_CODE).map(([kr, code]) => ({
  code,
  d: paths[kr],
  label: labels[kr],
}));

const out = `/** Auto-generated from assets/korea-map.svg (Simplemaps, CC BY 4.0) */
export const KOREA_MAP_VIEWBOX = '0 0 1000 1000';

export type KoreaMapRegionPath = {
  code: string;
  d: string;
  label: { cx: number; cy: number };
};

export const KOREA_MAP_REGIONS: KoreaMapRegionPath[] = ${JSON.stringify(regions, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../constants/korea-map-paths.ts'), out);
console.log('Wrote', regions.length, 'regions');
