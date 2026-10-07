// Renders one face photo through the live camera shader (its SkSL twin, same body as the GLSL
// program) for every camera filter, makeup look and beauty preset, and writes comparison grids.
// Uniforms come from the app's own modules (cameraLookUniforms, faceUniforms), so the grids show
// exactly what the camera sends to the GPU. Rendering is CPU CanvasKit, at the live buffer width.
//
// Usage:
//   node apps/mobile/scripts/render-looks.mjs --face <face.json> --out <dir> [--tag after] [--only strength,filters,looks]
// face.json: { "photo": "<path relative to the json>", "width", "height", "face": FaceGeom }
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
if (!args.face || !args.out) {
  console.error('usage: render-looks.mjs --face <face.json> --out <dir> [--tag name]');
  process.exit(1);
}
const tag = args.tag ?? 'current';
const facePath = resolve(args.face);
const spec = JSON.parse(readFileSync(facePath, 'utf8'));
const outDir = resolve(args.out);
mkdirSync(outDir, { recursive: true });

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, '..');

// --- bundle the app modules the camera uses to build its uniforms --------------------------------
const work = mkdtempSync(join(tmpdir(), 'tt-looks-'));
const bundlePath = join(work, 'looks.mjs');
const stub = (contents) => ({ contents, loader: 'js' });
await esbuild.build({
  stdin: {
    contents: `
      export { cameraLookUniforms } from '@/lib/editor/camera-uniforms';
      export { CAMERA_SKSL_CHECK_SOURCE, CAMERA_MAX_FACES } from '@/lib/editor/camera-shader-source';
      export { CAMERA_FILTERS, presetLook } from '@/lib/editor/look';
      export { MAKEUP_LOOKS, withMakeupLook } from '@/lib/editor/makeup-looks';
      export { faceUniforms } from '@/lib/editor/faces';
      export { BEAUTY_PRESETS, EMPTY_BEAUTY } from '@/lib/editor/types';
    `,
    resolveDir: appDir,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundlePath,
  tsconfig: join(appDir, 'tsconfig.json'),
  loader: { '.png': 'empty', '.jpg': 'empty' },
  logLevel: 'error',
  plugins: [
    {
      name: 'rn-stubs',
      setup(build) {
        build.onResolve({ filter: /^(react-native|@react-native-async-storage\/async-storage|@react-native-ml-kit\/.*|expo-.*)$/ }, (a) => ({
          path: a.path,
          namespace: 'stub',
        }));
        build.onLoad({ filter: /.*/, namespace: 'stub' }, () =>
          stub(`const noop = async () => null;
            export const Platform = { OS: 'web', select: (o) => o.default };
            export const NativeModules = {};
            export default { getItem: noop, setItem: noop, removeItem: noop };`),
        );
      },
    },
  ],
});
const app = await import(pathToFileURL(bundlePath).href);
rmSync(work, { recursive: true, force: true });

// --- CanvasKit -----------------------------------------------------------------------------------
const CanvasKit = await CanvasKitInit({
  locateFile: (f) => join(dirname(require.resolve('canvaskit-wasm/bin/full/canvaskit.js')), f),
});
const fontPath = ['C:/Windows/Fonts/malgunbd.ttf', 'C:/Windows/Fonts/malgun.ttf', '/System/Library/Fonts/AppleSDGothicNeo.ttc'].find(
  (p) => existsSync(p),
);
const typeface = fontPath ? CanvasKit.Typeface.MakeTypefaceFromData(readFileSync(fontPath)) : null;

const effect = CanvasKit.RuntimeEffect.Make(app.CAMERA_SKSL_CHECK_SOURCE, (e) => {
  throw new Error(`camera SkSL failed to compile: ${e}`);
});
const layout = [];
for (let i = 0; i < effect.getUniformCount(); i += 1) {
  const u = effect.getUniform(i);
  layout.push({ name: effect.getUniformName(i), slot: u.slot, size: u.columns * u.rows });
}

// the live drawing buffer is at most 720 px wide; render at that width so blur radii match
const W = Math.min(720, spec.width);
const H = Math.round((spec.height * W) / spec.width);
const s = W / spec.width;
const scaleVec = (v) => ({ x: v.x * s, y: v.y * s });
const f = spec.face;
const face = {
  ...f,
  center: scaleVec(f.center),
  radius: scaleVec(f.radius),
  leftEye: scaleVec(f.leftEye),
  rightEye: scaleVec(f.rightEye),
  nose: scaleVec(f.nose),
  noseHalfWidth: f.noseHalfWidth * s,
  mouth: scaleVec(f.mouth),
  mouthHalfWidth: f.mouthHalfWidth * s,
  lipHalfHeight: f.lipHalfHeight * s,
  chin: scaleVec(f.chin),
  leftJaw: scaleVec(f.leftJaw),
  rightJaw: scaleVec(f.rightJaw),
  leftCheek: scaleVec(f.leftCheek),
  rightCheek: scaleVec(f.rightCheek),
  eyeRadius: f.eyeRadius * s,
};

const photoBytes = readFileSync(resolve(dirname(facePath), spec.photo));
const photo = CanvasKit.MakeImageFromEncoded(photoBytes);
const srcSurface = CanvasKit.MakeSurface(W, H);
srcSurface.getCanvas().drawImageRectOptions(
  photo,
  CanvasKit.XYWHRect(0, 0, photo.width(), photo.height()),
  CanvasKit.XYWHRect(0, 0, W, H),
  CanvasKit.FilterMode.Linear,
  CanvasKit.MipmapMode.Linear,
  null,
);
const source = srcSurface.makeImageSnapshot();
const child = source.makeShaderOptions(CanvasKit.TileMode.Clamp, CanvasKit.TileMode.Clamp, CanvasKit.FilterMode.Linear, CanvasKit.MipmapMode.None);

// grid cells show the face area; only those pixels are shaded (the shader reads absolute coords)
const crop = {
  x: Math.max(0, face.center.x - face.radius.x * 1.75),
  y: Math.max(0, face.center.y - face.radius.y * 1.35),
};
crop.w = Math.min(W - crop.x, face.radius.x * 3.5);
crop.h = Math.min(H - crop.y, crop.w * 1.3);

function render(look) {
  const values = {
    ...app.cameraLookUniforms(look, [W, H]),
    ...app.faceUniforms([face], app.CAMERA_MAX_FACES),
    uFaceCount: 1,
  };
  const floats = new Float32Array(effect.getUniformFloatCount());
  for (const u of layout) {
    const v = values[u.name];
    if (v === undefined) throw new Error(`no value for uniform ${u.name}`);
    const arr = typeof v === 'number' ? [v] : v;
    if (arr.length !== u.size) throw new Error(`uniform ${u.name}: expected ${u.size} floats, got ${arr.length}`);
    floats.set(arr, u.slot);
  }
  const shader = effect.makeShaderWithChildren(floats, [child]);
  const surface = CanvasKit.MakeSurface(W, H);
  const paint = new CanvasKit.Paint();
  paint.setShader(shader);
  surface.getCanvas().drawRect(CanvasKit.XYWHRect(crop.x, crop.y, crop.w, crop.h), paint);
  const image = surface.makeImageSnapshot();
  paint.delete();
  shader.delete();
  surface.delete();
  return image;
}

/** cells: { label, look } — writes a labelled grid, `cols` wide, each cell cropped to the face area */
const only = args.only ? args.only.split(',') : null;

function grid(name, title, cells, cols = 6, view = crop) {
  if (only && !only.includes(name)) return;
  const cw = 260;
  const ch = Math.round((cw * view.h) / view.w);
  const labelH = 34;
  const headH = 44;
  const rows = Math.ceil(cells.length / cols);
  const gw = cols * cw;
  const gh = headH + rows * (ch + labelH);
  const surface = CanvasKit.MakeSurface(gw, gh);
  const canvas = surface.getCanvas();
  canvas.clear(CanvasKit.Color(24, 24, 27, 1));
  const text = new CanvasKit.Paint();
  text.setColor(CanvasKit.Color(240, 240, 240, 1));
  text.setAntiAlias(true);
  const font = new CanvasKit.Font(typeface, 18);
  const titleFont = new CanvasKit.Font(typeface, 22);
  canvas.drawText(`${title}  [${tag}]`, 12, 30, text, titleFont);
  cells.forEach((cell, i) => {
    const x = (i % cols) * cw;
    const y = headH + Math.floor(i / cols) * (ch + labelH);
    const image = render(cell.look);
    canvas.drawImageRectOptions(
      image,
      CanvasKit.XYWHRect(view.x, view.y, view.w, view.h),
      CanvasKit.XYWHRect(x, y, cw, ch),
      CanvasKit.FilterMode.Linear,
      CanvasKit.MipmapMode.Linear,
      null,
    );
    image.delete();
    canvas.drawText(cell.label, x + 8, y + ch + 24, text, font);
  });
  const png = surface.makeImageSnapshot().encodeToBytes();
  const file = join(outDir, `${name}-${tag}.png`);
  writeFileSync(file, png);
  surface.delete();
  console.log(file);
}

const NONE = { beauty: { ...app.EMPTY_BEAUTY }, lip: 0, blush: 0, filterId: null, filterIntensity: 0.8, effectId: null };
const withBeauty = (v, extra = {}) => ({ ...NONE, beauty: { ...app.EMPTY_BEAUTY, ...v }, ...extra });

grid('strength', 'Beauty strength (live shader, 720 px buffer)', [
  { label: '원본', look: NONE },
  { label: '자동 (기본값)', look: app.presetLook('auto') },
  { label: '피부 보정 100', look: withBeauty({ smooth: 1 }) },
  { label: '미백 100', look: withBeauty({ whiten: 1 }) },
  { label: '피부 선명 100', look: withBeauty({ clarity: 1 }) },
  { label: '얼굴 슬림 100', look: withBeauty({ slim: 1 }) },
  { label: 'V라인 100', look: withBeauty({ jaw: 1 }) },
  { label: '눈 확대 100', look: withBeauty({ eyes: 1 }) },
  { label: '코 슬림 100', look: withBeauty({ nose: 1 }) },
  { label: '광대 100', look: withBeauty({ cheek: 1 }) },
  { label: '립 100', look: withBeauty({}, { lip: 1 }) },
  { label: '블러셔 100', look: withBeauty({}, { blush: 1 }) },
  ...app.BEAUTY_PRESETS.filter((p) => p.id !== 'none' && p.id !== 'auto').map((p) => ({ label: `프리셋 ${p.label}`, look: app.presetLook(p.id) })),
]);

const cheek = { x: face.leftCheek.x - face.radius.x * 0.45, y: face.leftCheek.y - face.radius.x * 0.45, w: face.radius.x * 0.9, h: face.radius.x * 0.9 };
grid(
  'skin',
  'Skin close-up (cheek, ~1.6x)',
  [
    { label: '원본', look: NONE },
    { label: '피부 보정 50', look: withBeauty({ smooth: 0.5 }) },
    { label: '피부 보정 100', look: withBeauty({ smooth: 1 }) },
    { label: '자동 (기본값)', look: app.presetLook('auto') },
  ],
  4,
  cheek,
);

const jaw = { x: face.leftJaw.x - face.radius.x * 0.55, y: face.leftEye.y, w: face.radius.x * 1.1, h: face.chin.y - face.leftEye.y + face.radius.x * 0.25 };
grid(
  'contour',
  'Jaw contour close-up (left side)',
  [
    { label: '원본', look: NONE },
    { label: '얼굴 슬림 45', look: withBeauty({ slim: 0.45 }) },
    { label: '얼굴 슬림 100', look: withBeauty({ slim: 1 }) },
    { label: 'V라인 100', look: withBeauty({ jaw: 1 }) },
    { label: '자동 (기본값)', look: app.presetLook('auto') },
    { label: '프리셋 인형', look: app.presetLook('doll') },
  ],
  6,
  jaw,
);

grid(
  'filters',
  'Camera filters at default intensity (80%), no beauty',
  [{ label: '원본', look: NONE }, ...app.CAMERA_FILTERS.map((flt) => ({ label: flt.label, look: { ...NONE, filterId: flt.id } }))],
);

grid('looks', 'Makeup looks (one tap)', [
  { label: '원본', look: NONE },
  ...app.MAKEUP_LOOKS.map((l) => ({ label: l.label, look: app.withMakeupLook(NONE, l.id) })),
], 5);
