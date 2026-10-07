// Renders the fun pack and the lip tracking through the live camera shader (its SkSL twin) plus the
// AR sticker layout, using the app's own modules, and writes review grids and picker thumbnails.
//
// Usage:
//   node apps/mobile/scripts/render-fun.mjs --closed <face.json> --open <face.json> --out <dir>
//        [--legacy <apps/mobile of an older checkout>] [--thumbs <assets/ar dir>] [--only lips,fun,couple]
// face.json: { photo, width, height, contour: MlFace, landmarks: MlFace } in the photo's width x height
// space (ML Kit result shape: contours only, as live single-face rounds return, and landmarks only).
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
if (!args.closed || !args.open || !args.out) {
  console.error('usage: render-fun.mjs --closed <face.json> --open <face.json> --out <dir> [--legacy <appDir>] [--thumbs <dir>]');
  process.exit(1);
}
const outDir = resolve(args.out);
mkdirSync(outDir, { recursive: true });
const only = args.only ? args.only.split(',') : null;
const want = (name) => !only || only.includes(name);

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, '..');
const repoRoot = join(appDir, '..', '..');

// --- bundle app modules ------------------------------------------------------------------------
async function bundle(dir, entry, legacy = false) {
  const work = mkdtempSync(join(tmpdir(), 'tt-fun-'));
  const out = join(work, 'app.mjs');
  await esbuild.build({
    stdin: { contents: entry, resolveDir: dir, loader: 'ts' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: out,
    tsconfig: join(dir, 'tsconfig.json'),
    nodePaths: [join(appDir, 'node_modules'), join(repoRoot, 'node_modules')],
    loader: { '.png': 'empty', '.jpg': 'empty' },
    logLevel: 'error',
    plugins: [
      {
        name: 'rn-stubs',
        setup(build) {
          build.onResolve(
            { filter: /^(react-native|@react-native-async-storage\/async-storage|@react-native-ml-kit\/.*|expo-.*|@shopify\/react-native-skia)$/ },
            (a) => ({ path: a.path, namespace: 'stub' }),
          );
          // thumbnails may not exist yet (this script makes them)
          build.onResolve({ filter: /\.(png|jpg)$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
          build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents: `const noop = async () => null;
              export const Platform = { OS: 'web', select: (o) => o.default };
              export const NativeModules = {};
              export const AppState = { currentState: 'active', addEventListener: () => ({ remove() {} }) };
              export const Skia = {};
              export default { getItem: noop, setItem: noop, removeItem: noop };`,
            loader: 'js',
          }));
          if (legacy) {
            // older checkouts kept toGeom private
            build.onLoad({ filter: /lib[\\/]editor[\\/]faces\.ts$/ }, (a) => ({
              contents: `${readFileSync(a.path, 'utf8')}\nexport { toGeom };\n`,
              loader: 'ts',
            }));
          }
        },
      },
    ],
  });
  const mod = await import(pathToFileURL(out).href);
  rmSync(work, { recursive: true, force: true });
  return mod;
}

const app = await bundle(
  appDir,
  `
  export { cameraLookUniforms } from '@/lib/editor/camera-uniforms';
  export { CAMERA_SKSL_CHECK_SOURCE, CAMERA_MAX_FACES } from '@/lib/editor/camera-shader-source';
  export { faceUniforms, toGeom } from '@/lib/editor/faces';
  export { faceDebugPaths } from '@/lib/editor/face-debug';
  export { EMPTY_BEAUTY, createEditState } from '@/lib/editor/types';
  export { AR_EFFECTS, STILL_TIME, applyArWarp, getArEffect, layoutArEffect, triggerLevel } from '@/lib/ar/effects';
  export { buildUniforms } from '@/lib/editor/shader';
  export { EDITOR_SHADER_SOURCE, MAX_FACES } from '@/lib/editor/shader-source';
  `,
);
const legacy = args.legacy
  ? await bundle(
      resolve(args.legacy),
      `
      export { cameraLookUniforms } from '@/lib/editor/camera-uniforms';
      export { CAMERA_SKSL_CHECK_SOURCE, CAMERA_MAX_FACES } from '@/lib/editor/camera-shader-source';
      export { faceUniforms, toGeom } from '@/lib/editor/faces';
      `,
      true,
    )
  : null;

// --- CanvasKit -----------------------------------------------------------------------------------
const CK = await CanvasKitInit({
  locateFile: (f) => join(dirname(require.resolve('canvaskit-wasm/bin/full/canvaskit.js')), f),
});
const fontPath = ['C:/Windows/Fonts/malgunbd.ttf', 'C:/Windows/Fonts/malgun.ttf', '/System/Library/Fonts/AppleSDGothicNeo.ttc'].find((p) =>
  existsSync(p),
);
const typeface = fontPath ? CK.Typeface.MakeTypefaceFromData(readFileSync(fontPath)) : null;

function compile(mod, source = mod.CAMERA_SKSL_CHECK_SOURCE) {
  const effect = CK.RuntimeEffect.Make(source, (e) => {
    throw new Error(`SkSL failed to compile: ${e}`);
  });
  const layout = [];
  for (let i = 0; i < effect.getUniformCount(); i += 1) {
    const u = effect.getUniform(i);
    layout.push({ name: effect.getUniformName(i), slot: u.slot, size: u.columns * u.rows });
  }
  return { mod, effect, layout };
}
const cur = compile(app);
const old = legacy ? compile(legacy) : null;

const spriteCache = new Map();
function sprite(id) {
  if (!spriteCache.has(id)) {
    const file = join(appDir, 'assets', 'ar', `${id}.png`);
    spriteCache.set(id, existsSync(file) ? CK.MakeImageFromEncoded(readFileSync(file)) : null);
  }
  return spriteCache.get(id);
}

function loadPhoto(path, W, H, rotate = 0, flipCopy = false) {
  const img = CK.MakeImageFromEncoded(readFileSync(path));
  const surf = CK.MakeSurface(flipCopy ? W * 2 : W, H);
  const c = surf.getCanvas();
  const draw = () =>
    c.drawImageRectOptions(img, CK.XYWHRect(0, 0, img.width(), img.height()), CK.XYWHRect(0, 0, W, H), CK.FilterMode.Linear, CK.MipmapMode.Linear, null);
  c.save();
  if (rotate) c.rotate((rotate * 180) / Math.PI, W / 2, H / 2);
  draw();
  c.restore();
  if (flipCopy) {
    c.save();
    c.translate(W * 2, 0);
    c.scale(-1, 1);
    draw();
    c.restore();
  }
  const snap = surf.makeImageSnapshot();
  surf.delete();
  return snap;
}

/** Shader pass + AR stickers over a source image; returns a CanvasKit image. */
function renderFrame({ shader = cur, image, faces, look, time, rect, debug = false, presence = 1, uniforms }) {
  const W = image.width();
  const H = image.height();
  const values = uniforms ?? {
    ...shader.mod.cameraLookUniforms(look, [W, H]),
    ...shader.mod.faceUniforms(faces, shader.mod.CAMERA_MAX_FACES),
    uFaceCount: Math.min(faces.length, shader.mod.CAMERA_MAX_FACES),
  };
  if (values.uFun && !uniforms) values.uFun = [values.uFun[0], values.uFun[1], time, values.uFun[3]];
  const floats = new Float32Array(shader.effect.getUniformFloatCount());
  for (const u of shader.layout) {
    const v = values[u.name];
    if (v === undefined) throw new Error(`no value for uniform ${u.name}`);
    const arr = typeof v === 'number' ? [v] : v;
    if (arr.length !== u.size) throw new Error(`uniform ${u.name}: expected ${u.size} floats, got ${arr.length}`);
    floats.set(arr, u.slot);
  }
  const child = image.makeShaderOptions(CK.TileMode.Clamp, CK.TileMode.Clamp, CK.FilterMode.Linear, CK.MipmapMode.None);
  const sh = shader.effect.makeShaderWithChildren(floats, [child]);
  const surface = CK.MakeSurface(W, H);
  const canvas = surface.getCanvas();
  const paint = new CK.Paint();
  paint.setShader(sh);
  const r = rect ?? { x: 0, y: 0, w: W, h: H };
  canvas.drawRect(CK.XYWHRect(r.x, r.y, r.w, r.h), paint);
  if (look.effectId && shader !== old) {
    const ops = app.layoutArEffect(look.effectId, { width: W, height: H, time, faces: faces.map((face) => ({ face, presence })) });
    const sp = new CK.Paint();
    sp.setAntiAlias(true);
    for (const op of ops) {
      const img = sprite(op.sprite);
      if (!img) throw new Error(`missing sprite ${op.sprite}`);
      sp.setAlphaf(Math.min(1, op.alpha));
      canvas.save();
      canvas.translate(op.x, op.y);
      canvas.rotate((op.rot * 180) / Math.PI, 0, 0);
      canvas.drawImageRectOptions(img, CK.XYWHRect(0, 0, img.width(), img.height()), CK.XYWHRect(-op.w / 2, -op.h / 2, op.w, op.h), CK.FilterMode.Linear, CK.MipmapMode.Linear, sp);
      canvas.restore();
    }
    sp.delete();
  }
  if (debug) drawDebug(canvas, faces, debug === true ? 1.5 : debug);
  const out = surface.makeImageSnapshot();
  paint.delete();
  sh.delete();
  child.delete();
  surface.delete();
  return out;
}

function drawDebug(canvas, faces, width) {
  const p = new CK.Paint();
  p.setAntiAlias(true);
  p.setStyle(CK.PaintStyle.Stroke);
  p.setStrokeWidth(width);
  for (const f of faces) {
    if (f.lipCorner === undefined) {
      // older geometry: its lip tint was an ellipse of (0.95 mw, 1.05 lh) around `mouth`
      const lh = f.lipHalfHeight > 0.5 ? f.lipHalfHeight : f.mouthHalfWidth * 0.42;
      const b = new CK.PathBuilder();
      for (let i = 0; i <= 40; i += 1) {
        const a = (Math.PI * 2 * i) / 40;
        const u = Math.cos(a) * f.mouthHalfWidth * 0.95;
        const v = Math.sin(a) * lh * 1.05;
        const x = f.mouth.x + f.ax.x * u + f.up.x * v;
        const y = f.mouth.y + f.ax.y * u + f.up.y * v;
        if (i) b.lineTo(x, y);
        else b.moveTo(x, y);
      }
      p.setColor(CK.parseColorString('#FF4FA3'));
      canvas.drawPath(b.snapshot(), p);
      continue;
    }
    for (const path of app.faceDebugPaths(f)) {
      const b = new CK.PathBuilder();
      path.pts.forEach((pt, i) => (i ? b.lineTo(pt.x, pt.y) : b.moveTo(pt.x, pt.y)));
      if (path.closed) b.close();
      p.setColor(CK.parseColorString(path.color));
      canvas.drawPath(b.snapshot(), p);
    }
  }
  p.delete();
}

function grid(name, title, cells, cols, cw = 300) {
  const labelH = 34;
  const headH = 44;
  const heights = cells.map((c) => Math.round((cw * c.view.h) / c.view.w));
  const rows = Math.ceil(cells.length / cols);
  const rowH = Array.from({ length: rows }, (_, r) => Math.max(...heights.slice(r * cols, r * cols + cols)));
  const gw = cols * cw;
  const gh = headH + rowH.reduce((a, b) => a + b + labelH, 0);
  const surface = CK.MakeSurface(gw, gh);
  const canvas = surface.getCanvas();
  canvas.clear(CK.Color(24, 24, 27, 1));
  const text = new CK.Paint();
  text.setColor(CK.Color(240, 240, 240, 1));
  text.setAntiAlias(true);
  const font = new CK.Font(typeface, 17);
  canvas.drawText(title, 12, 30, text, new CK.Font(typeface, 22));
  let y = headH;
  for (let r = 0; r < rows; r += 1) {
    for (let k = 0; k < cols; k += 1) {
      const cell = cells[r * cols + k];
      if (!cell) break;
      const x = k * cw;
      const h = heights[r * cols + k];
      const img = cell.image;
      canvas.drawImageRectOptions(img, CK.XYWHRect(cell.view.x, cell.view.y, cell.view.w, cell.view.h), CK.XYWHRect(x, y, cw, h), CK.FilterMode.Linear, CK.MipmapMode.Linear, null);
      canvas.drawText(cell.label, x + 8, y + rowH[r] + 24, text, font);
    }
    y += rowH[r] + labelH;
  }
  const file = join(outDir, `${name}.png`);
  writeFileSync(file, surface.makeImageSnapshot().encodeToBytes());
  surface.delete();
  console.log(file);
}

// --- inputs --------------------------------------------------------------------------------------
function loadSpec(path) {
  const spec = JSON.parse(readFileSync(resolve(path), 'utf8'));
  spec.photoPath = resolve(dirname(resolve(path)), spec.photo);
  return spec;
}
const closed = loadSpec(args.closed);
const open = loadSpec(args.open);
const W = closed.width;
const H = closed.height;
const closedImg = loadPhoto(closed.photoPath, W, H);
const openImg = loadPhoto(open.photoPath, W, H);
const geom = (mod, ml) => mod.toGeom(JSON.parse(JSON.stringify(ml)));
const closedFace = geom(app, closed.contour);
const openFace = geom(app, open.contour);

const NONE = { beauty: { ...app.EMPTY_BEAUTY }, lip: 0, blush: 0, filterId: null, filterIntensity: 0.8, effectId: null };
const LIP = { ...NONE, lip: 1 };

// --- lips: before / after ------------------------------------------------------------------------
if (want('lips')) {
  const cells = [];
  for (const [tag, spec, image] of [
    ['다문 입', closed, closedImg],
    ['벌린 입', open, openImg],
  ]) {
    const fNew = geom(app, spec.contour);
    const fLm = geom(app, spec.landmarks);
    const fOld = legacy ? geom(legacy, spec.landmarks) : null;
    const view = { x: fNew.mouth.x - fNew.mouthHalfWidth * 1.7, w: fNew.mouthHalfWidth * 3.4 };
    view.h = view.w * 0.78;
    view.y = fNew.mouth.y - view.h * 0.5;
    if (fOld) {
      cells.push({ label: `${tag} · 이전 인식(랜드마크)`, view, image: renderFrame({ image, faces: [fOld], look: NONE, time: 0, debug: 1, rect: view }) });
      cells.push({ label: `${tag} · 이전 립 100`, view, image: renderFrame({ shader: old, image, faces: [fOld], look: LIP, time: 0, rect: view }) });
    }
    cells.push({ label: `${tag} · 새 인식(윤곽선)`, view, image: renderFrame({ image, faces: [fNew], look: NONE, time: 0, debug: 1, rect: view }) });
    cells.push({ label: `${tag} · 새 립 100`, view, image: renderFrame({ image, faces: [fNew], look: LIP, time: 0, rect: view }) });
    cells.push({ label: `${tag} · 여러 명 모드(랜드마크)`, view, image: renderFrame({ image, faces: [fLm], look: NONE, time: 0, debug: 1, rect: view }) });
    cells.push({ label: `${tag} · 여러 명 모드 립 100`, view, image: renderFrame({ image, faces: [fLm], look: LIP, time: 0, rect: view }) });
  }
  grid('lips-before-after', 'Lips: tracker outline + lip tint 100 (mouth close-up)', cells, legacy ? 6 : 4, 300);

  const full = { x: closedFace.center.x - closedFace.radius.x * 1.5, y: closedFace.center.y - closedFace.radius.y * 1.3 };
  full.w = closedFace.radius.x * 3;
  full.h = closedFace.radius.y * 2.6;
  grid(
    'landmarks-overlay',
    'Tracker outline (new contour rounds): lips, eyes, face oval, anchors',
    [
      { label: '다문 입', view: full, image: renderFrame({ image: closedImg, faces: [closedFace], look: NONE, time: 0, debug: 2 }) },
      { label: '벌린 입', view: full, image: renderFrame({ image: openImg, faces: [openFace], look: NONE, time: 0, debug: 2 }) },
    ],
    2,
    420,
  );
}

// --- fun effects ----------------------------------------------------------------------------------
const head = { x: closedFace.center.x - closedFace.radius.x * 1.85, y: Math.max(0, closedFace.center.y - closedFace.radius.y * 2.25) };
head.w = closedFace.radius.x * 3.7;
head.h = Math.min(H - head.y, head.w * 1.45);
const fullView = { x: 0, y: 0, w: W, h: H };
const ids = args.ids ? args.ids.split(',') : null;
const newEffects = app.AR_EFFECTS.filter((e) => e.isNew && (!ids || ids.includes(e.id)));

function rotatedFace(spec, ang) {
  const cx = W / 2;
  const cy = H / 2;
  const rot = (p) => ({
    x: cx + (p.x - cx) * Math.cos(ang) - (p.y - cy) * Math.sin(ang),
    y: cy + (p.x - cx) * Math.sin(ang) + (p.y - cy) * Math.cos(ang),
  });
  const ml = JSON.parse(JSON.stringify(spec.contour));
  for (const c of Object.values(ml.contours)) c.points = c.points.map(rot);
  return app.toGeom(ml);
}

if (want('fun')) {
  const T = app.STILL_TIME;
  const cells = [];
  for (const e of newEffects) {
    const look = { ...NONE, effectId: e.id };
    const view = e.ambient ? fullView : head;
    cells.push({ label: app.getArEffect(e.id) ? `${e.id}` : e.id, view, image: renderFrame({ image: closedImg, faces: [closedFace], look, time: T, rect: view }) });
    if (e.trigger === 'mouth') {
      cells.push({ label: `${e.id} · 입 벌림`, view, image: renderFrame({ image: openImg, faces: [openFace], look, time: T, rect: view }) });
    }
    if (e.trigger === 'tilt') {
      const ang = 0.38;
      const tilted = loadPhoto(closed.photoPath, W, H, ang);
      cells.push({ label: `${e.id} · 갸웃`, view, image: renderFrame({ image: tilted, faces: [rotatedFace(closed, ang)], look, time: T, rect: view }) });
    }
  }
  if (!ids || ids.includes('alien')) {
    cells.push({ label: 'alien (업그레이드)', view: head, image: renderFrame({ image: closedImg, faces: [closedFace], look: { ...NONE, effectId: 'alien' }, time: T, rect: head }) });
  }
  grid(ids ? 'fun-effects-subset' : 'fun-effects', `Fun pack at STILL_TIME ${T}s (live shader + stickers; captured photos use the same time)`, cells, 6, 300);

  const anim = ['swirl', 'jelly', 'glitch', 'vhs', 'cool_shades', 'fire_breath', 'bubbles', 'rainbow'].filter((id) => !ids || ids.includes(id));
  const aCells = [];
  for (const id of anim) {
    const e = app.getArEffect(id);
    for (const t of [0.3, 1.1, 1.9]) {
      const mouth = e.trigger === 'mouth';
      aCells.push({
        label: `${id} t=${t}`,
        view: e.ambient ? fullView : head,
        image: renderFrame({
          image: mouth ? openImg : closedImg,
          faces: [mouth ? openFace : closedFace],
          look: { ...NONE, effectId: id },
          time: t,
          rect: e.ambient ? fullView : head,
        }),
      });
    }
  }
  if (aCells.length) grid(ids ? 'fun-animation-subset' : 'fun-animation', 'Animated effects over time (live)', aCells, 6, 260);
}

if (want('couple')) {
  const pair = loadPhoto(closed.photoPath, W, H, 0, true);
  const mirrorMl = JSON.parse(JSON.stringify(closed.contour));
  for (const c of Object.values(mirrorMl.contours)) c.points = c.points.map((p) => ({ x: W * 2 - p.x, y: p.y }));
  const faces = [closedFace, app.toGeom(mirrorMl)];
  const ids = ['tiger', 'chef', 'nerd', 'vampire', 'frog', 'shy', 'big_head', 'puffy', 'pop_art', 'color_pop'];
  const view = { x: 0, y: head.y, w: W * 2, h: head.h };
  grid(
    'fun-two-faces',
    'Two faces (mirrored copy)',
    ids.map((id) => ({ label: id, view, image: renderFrame({ image: pair, faces, look: { ...NONE, effectId: id }, time: app.STILL_TIME, rect: view }) })),
    2,
    600,
  );
}

// --- capture parity: editor shader on a 2x photo vs the live camera shader ----------------------
if (want('capture')) {
  const editor = compile(app, app.EDITOR_SHADER_SOURCE);
  const K = 2;
  const scaleMl = (v) => {
    if (Array.isArray(v)) return v.map(scaleMl);
    if (!v || typeof v !== 'object') return v;
    const o = {};
    for (const [k, x] of Object.entries(v)) {
      o[k] = typeof x === 'number' && ['x', 'y', 'left', 'top', 'width', 'height'].includes(k) ? x * K : scaleMl(x);
    }
    return o;
  };
  const big = { closed: loadPhoto(closed.photoPath, W * K, H * K), open: loadPhoto(open.photoPath, W * K, H * K) };
  const bigFace = { closed: app.toGeom(scaleMl(closed.contour)), open: app.toGeom(scaleMl(open.contour)) };
  const scaleView = (v) => ({ x: v.x * K, y: v.y * K, w: v.w * K, h: v.h * K });
  const capIds = ['big_head', 'duck_lips', 'hippo', 'baby', 'mirror', 'kaleido', 'pop_art', 'pixel', 'comic', 'glitch', 'vhs', 'color_pop', 'nerd', 'rainbow'];
  const cells = [];
  for (const id of capIds.filter((x) => !ids || ids.includes(x))) {
    const e = app.getArEffect(id);
    const which = e.trigger === 'mouth' ? 'open' : 'closed';
    const view = e.ambient ? fullView : head;
    const look = { ...NONE, effectId: id };
    cells.push({
      label: `${id} · 라이브`,
      view,
      image: renderFrame({ image: which === 'open' ? openImg : closedImg, faces: [which === 'open' ? openFace : closedFace], look, time: app.STILL_TIME, rect: view }),
    });
    const state = { ...app.createEditState({ uri: '', width: W * K, height: H * K }), arId: id };
    const uniforms = app.buildUniforms({ ...state, beauty: app.applyArWarp(state.beauty, id) }, [bigFace[which]], undefined);
    const bigView = scaleView(view);
    cells.push({
      label: `${id} · 촬영본(2x)`,
      view: bigView,
      image: renderFrame({ shader: editor, image: big[which], faces: [bigFace[which]], look, time: app.STILL_TIME, rect: bigView, uniforms }),
    });
  }
  grid(ids ? 'capture-parity-subset' : 'capture-parity', `Live preview vs captured photo (editor shader, 2x resolution, t=${app.STILL_TIME}s)`, cells, 6, 260);
}

// --- picker thumbnails: a drawn face through the real effect ------------------------------------------
if (args.thumbs) {
  const thumbDir = resolve(args.thumbs);
  const S = 512;
  const hex = (h, a = 1) => {
    const n = parseInt(h.replace('#', ''), 16);
    return CK.Color4f(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a);
  };
  const fill = (color) => {
    const p = new CK.Paint();
    p.setAntiAlias(true);
    p.setColor(color);
    return p;
  };
  const stroke = (color, w) => {
    const p = fill(color);
    p.setStyle(CK.PaintStyle.Stroke);
    p.setStrokeWidth(w);
    p.setStrokeCap(CK.StrokeCap.Round);
    return p;
  };
  // the mirror reflects below the chin, so its thumbnail uses a smaller face higher up
  const SMALL = { s: 0.5, x: 256, y: 182 };
  const cartoon = (mouthOpen, tf = null) => {
    const surf = CK.MakeSurface(S, S);
    const c = surf.getCanvas();
    const bg = CK.Shader.MakeLinearGradient([0, 0], [S, S], [hex('#FFD6E7'), hex('#D9E8FF')], null, CK.TileMode.Clamp);
    const bgp = fill(hex('#fff'));
    bgp.setShader(bg);
    c.drawRect(CK.XYWHRect(0, 0, S, S), bgp);
    for (const [x, y, r, col] of [[70, 90, 18, '#FFFFFF'], [440, 120, 14, '#FFF3A8'], [90, 420, 12, '#B9F2D0'], [450, 400, 20, '#FFFFFF'], [400, 60, 9, '#FFB5CF']]) {
      c.drawCircle(x, y, r, fill(hex(col, 0.9)));
    }
    if (tf) {
      c.translate(tf.x, tf.y);
      c.scale(tf.s, tf.s);
      c.translate(-256, -280);
    }
    c.drawRRect(CK.RRectXY(CK.XYWHRect(150, 440, 212, 120), 70, 70), fill(hex('#7FB7FF')));
    c.drawOval(CK.XYWHRect(131, 130, 250, 300), fill(hex('#FFDCC6')));
    const hair = new CK.PathBuilder();
    hair.moveTo(124, 270);
    hair.cubicTo(110, 120, 200, 92, 256, 96);
    hair.cubicTo(330, 92, 404, 130, 388, 270);
    hair.cubicTo(370, 200, 330, 176, 300, 168);
    hair.cubicTo(270, 200, 200, 196, 150, 210);
    hair.cubicTo(136, 230, 130, 250, 124, 270);
    hair.close();
    c.drawPath(hair.snapshot(), fill(hex('#5B3A2E')));
    for (const x of [208, 304]) {
      c.drawOval(CK.XYWHRect(x - 17, 256, 34, 42), fill(hex('#2B1E1E')));
      c.drawCircle(x + 6, 268, 7, fill(hex('#FFFFFF')));
    }
    c.drawCircle(186, 324, 20, fill(hex('#FF9BB3', 0.55)));
    c.drawCircle(326, 324, 20, fill(hex('#FF9BB3', 0.55)));
    c.drawOval(CK.XYWHRect(244, 292, 24, 18), fill(hex('#F4B79E')));
    c.drawArc(CK.XYWHRect(244, 296, 24, 16), 20, 140, false, stroke(hex('#C98C74'), 4));
    if (mouthOpen) {
      c.drawOval(CK.XYWHRect(226, 338, 60, 52), fill(hex('#8E2C3A')));
      c.drawOval(CK.XYWHRect(238, 366, 36, 20), fill(hex('#FF7C93')));
      c.drawOval(CK.XYWHRect(226, 338, 60, 52), stroke(hex('#E0607E'), 6));
    } else {
      const m = new CK.PathBuilder();
      m.moveTo(224, 348);
      m.cubicTo(240, 372, 272, 372, 288, 348);
      m.cubicTo(272, 360, 240, 360, 224, 348);
      m.close();
      c.drawPath(m.snapshot(), fill(hex('#E0607E')));
      c.drawPath(m.snapshot(), stroke(hex('#E0607E'), 5));
    }
    const img = surf.makeImageSnapshot();
    surf.delete();
    return img;
  };
  const cartoonFace = (mouthOpen) => ({
    center: { x: 256, y: 280 },
    radius: { x: 125, y: 150 },
    leftEye: { x: 208, y: 277 },
    rightEye: { x: 304, y: 277 },
    nose: { x: 256, y: 306 },
    noseHalfWidth: 14,
    mouth: { x: 256, y: mouthOpen ? 364 : 356 },
    mouthHalfWidth: 32,
    lipHalfHeight: mouthOpen ? 26 : 9,
    lipCorner: mouthOpen ? 4 : 4,
    lipInnerTop: mouthOpen ? 18 : 2,
    lipInnerBottom: mouthOpen ? -20 : 2,
    lipShaped: true,
    chin: { x: 256, y: 428 },
    leftJaw: { x: 160, y: 372 },
    rightJaw: { x: 352, y: 372 },
    leftCheek: { x: 190, y: 322 },
    rightCheek: { x: 322, y: 322 },
    eyeRadius: 20,
    ax: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    angle: 0,
    yaw: 0,
    mouthOpen: mouthOpen ? 1 : 0,
    smile: -1,
    eyesOpen: -1,
    contoured: true,
  });
  const shrinkFace = (f, tf) => {
    const o = {};
    for (const [k, v] of Object.entries(f)) {
      if (v && typeof v === 'object' && k !== 'ax' && k !== 'up') {
        o[k] = k === 'radius' ? { x: v.x * tf.s, y: v.y * tf.s } : { x: tf.x + (v.x - 256) * tf.s, y: tf.y + (v.y - 280) * tf.s };
      } else if (typeof v === 'number' && !['angle', 'yaw', 'mouthOpen', 'smile', 'eyesOpen'].includes(k)) {
        o[k] = v * tf.s;
      } else {
        o[k] = v;
      }
    }
    return o;
  };
  const sharp = createRequire(join(repoRoot, 'package.json'))('sharp');
  const T = 112;
  const mask = Buffer.from(
    `<svg width="${T}" height="${T}"><rect x="0" y="0" width="${T}" height="${T}" rx="26" ry="26" fill="#fff"/></svg>`,
  );
  const cells = [];
  for (const e of newEffects.filter((x) => x.thumb.startsWith('th_'))) {
    const openMouth = e.trigger === 'mouth';
    const tf = e.id === 'mirror' ? SMALL : null;
    const face = tf ? shrinkFace(cartoonFace(openMouth), tf) : cartoonFace(openMouth);
    const img = renderFrame({ image: cartoon(openMouth, tf), faces: [face], look: { ...NONE, effectId: e.id }, time: 1.6 });
    const pad = e.ambient ? 0 : 56;
    const px = img.readPixels(pad, pad, {
      width: S - pad * 2,
      height: S - pad * 2,
      colorType: CK.ColorType.RGBA_8888,
      alphaType: CK.AlphaType.Unpremul,
      colorSpace: CK.ColorSpace.SRGB,
    });
    const size = S - pad * 2;
    const buf = await sharp(Buffer.from(px), { raw: { width: size, height: size, channels: 4 } })
      .resize(T, T, { kernel: 'lanczos3' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
      .toBuffer();
    writeFileSync(join(thumbDir, `${e.thumb}.png`), buf);
    cells.push({ label: e.id, view: { x: pad, y: pad, w: size, h: size }, image: img });
  }
  grid('thumbs-source', 'Picker thumbnails (source renders)', cells, 7, 180);
}
