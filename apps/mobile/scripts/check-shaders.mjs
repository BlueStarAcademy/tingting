// Compiles every SkSL runtime effect used by the photo editor and beauty camera with CanvasKit and
// renders it once on the CPU, so shader typos and black output fail here instead of on a phone.
// CanvasKit is the version react-native-skia declares, but its Skia milestone is older than the
// native binaries (react-native-skia-android); GPU driver compiles (GLSL on Adreno/Mali) can't be
// reproduced here, which is why the app also verifies shaders on the device and falls back.
// Usage: node apps/mobile/scripts/check-shaders.mjs
import { createRequire } from 'node:module';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');

const here = dirname(fileURLToPath(import.meta.url));
const editorDir = join(here, '..', 'lib', 'editor');
const SOURCES = ['beauty-core.ts', 'shader-source.ts', 'camera-shader-source.ts'].filter((f) =>
  existsSync(join(editorDir, f)),
);

const work = mkdtempSync(join(tmpdir(), 'tt-shaders-'));
const modules = {};
try {
  for (const file of SOURCES) {
    const src = readFileSync(join(editorDir, file), 'utf8');
    const out = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    // shader sources only import each other by relative path
    const rewritten = out.replace(/from '\.\/([\w-]+)'/g, "from './$1.mjs'");
    writeFileSync(join(work, file.replace(/\.ts$/, '.mjs')), rewritten);
  }
  for (const file of SOURCES) {
    modules[file] = await import(pathToFileURL(join(work, file.replace(/\.ts$/, '.mjs'))).href);
  }
} finally {
  // imported modules are already evaluated
}

const CanvasKit = await CanvasKitInit({
  locateFile: (f) => join(dirname(require.resolve('canvaskit-wasm/bin/full/canvaskit.js')), f),
});

const version = (pkg) => {
  try {
    return require(`${pkg}/package.json`).version;
  } catch {
    return 'unknown';
  }
};
console.log(
  `canvaskit-wasm ${version('canvaskit-wasm')}; native react-native-skia-android ${version('react-native-skia-android')} (Skia milestone = major)`,
);

const RENDER_SIZE = 32;

/** Draws the effect over a skin-colored image with smoothing + whitening on; returns the center pixel. */
function renderCenter(effect) {
  const src = CanvasKit.MakeSurface(RENDER_SIZE, RENDER_SIZE);
  src.getCanvas().clear(CanvasKit.Color(217, 165, 140, 1));
  const image = src.makeImageSnapshot();
  const child = image.makeShaderOptions(
    CanvasKit.TileMode.Clamp,
    CanvasKit.TileMode.Clamp,
    CanvasKit.FilterMode.Linear,
    CanvasKit.MipmapMode.None,
  );
  const floats = new Float32Array(effect.getUniformFloatCount());
  for (let i = 0; i < effect.getUniformCount(); i += 1) {
    const { slot } = effect.getUniform(i);
    const name = effect.getUniformName(i);
    if (name === 'uSize') floats.set([RENDER_SIZE, RENDER_SIZE], slot);
    if (name === 'uColorMat') floats.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], slot);
    if (name === 'uBeauty1') floats.set([0.6, 0.3], slot);
  }
  const shader = effect.makeShaderWithChildren(floats, [child]);
  const out = CanvasKit.MakeSurface(RENDER_SIZE, RENDER_SIZE);
  const paint = new CanvasKit.Paint();
  paint.setShader(shader);
  out.getCanvas().drawRect(CanvasKit.XYWHRect(0, 0, RENDER_SIZE, RENDER_SIZE), paint);
  const pixels = out.makeImageSnapshot().readPixels(0, 0, {
    width: RENDER_SIZE,
    height: RENDER_SIZE,
    colorType: CanvasKit.ColorType.RGBA_8888,
    alphaType: CanvasKit.AlphaType.Unpremul,
    colorSpace: CanvasKit.ColorSpace.SRGB,
  });
  const i = ((RENDER_SIZE / 2) * RENDER_SIZE + RENDER_SIZE / 2) * 4;
  const px = pixels ? Array.from(pixels.slice(i, i + 4)) : null;
  for (const obj of [paint, shader, child, image, src, out]) obj.delete();
  return px;
}

let failed = 0;
for (const [file, mod] of Object.entries(modules)) {
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value !== 'string' || !/half4\s+main\s*\(/.test(value)) continue;
    let error = '';
    const effect = CanvasKit.RuntimeEffect.Make(value, (e) => {
      error += e;
    });
    if (!effect) {
      failed += 1;
      console.error(`FAIL ${file} ${name}\n${error}`);
      continue;
    }
    const uniforms = effect.getUniformCount();
    const px = renderCenter(effect);
    const visible = px && px[3] >= 250 && px[0] + px[1] + px[2] >= 60;
    if (!visible) {
      failed += 1;
      console.error(`FAIL ${file} ${name}: rendered ${px ? px.join(',') : 'nothing'} instead of the photo`);
    } else {
      console.log(`ok   ${file} ${name} (${uniforms} uniforms, ${effect.getUniformFloatCount()} floats, center ${px.join(',')})`);
    }
    effect.delete();
  }
}
rmSync(work, { recursive: true, force: true });
if (failed) process.exit(1);
