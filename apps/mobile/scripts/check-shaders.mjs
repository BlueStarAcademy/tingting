// Compiles every SkSL runtime effect used by the photo editor and beauty camera with CanvasKit,
// so shader typos fail here instead of silently on a phone.
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
    } else {
      const uniforms = [];
      for (let i = 0; i < effect.getUniformCount(); i += 1) uniforms.push(effect.getUniformName(i));
      console.log(`ok   ${file} ${name} (${uniforms.length} uniforms, ${effect.getUniformFloatCount()} floats)`);
      effect.delete();
    }
  }
}
rmSync(work, { recursive: true, force: true });
if (failed) process.exit(1);
