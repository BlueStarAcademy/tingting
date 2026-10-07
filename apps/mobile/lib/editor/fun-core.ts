import { FACE_PARTS, faceArgs, perFace } from './beauty-core';

/**
 * Playful face warps and screen effects shared by the live camera shader (GLSL ES 3.0) and the
 * editor shader (SkSL), so a captured photo gets exactly what the preview showed. Needs BEAUTY_CORE
 * (bulge, luma, hash, px) above it.
 *
 * uniform vec4 uFun  = mode, amount (0..1), time (s), unused
 * uniform vec4 uFun2 = face tint rgb, tint amount
 *
 * Modes 1-19 warp each face (applied before the beauty warp), 20+ remap and/or recolor the frame.
 */
export const FUN_MODES = {
  bigHead: 1,
  longFace: 2,
  wideFace: 3,
  bigNose: 4,
  puffyCheeks: 5,
  duckLips: 6,
  bigMouth: 7,
  swirl: 8,
  jelly: 9,
  baby: 10,
  alien: 11,
  mirror: 20,
  kaleido: 21,
  popArt: 22,
  pixel: 23,
  comic: 24,
  glitch: 25,
  vhs: 26,
  colorPop: 27,
} as const;

export type FunMode = (typeof FUN_MODES)[keyof typeof FUN_MODES];

const M = FUN_MODES;
const is = (mode: number) => `abs(mode - ${mode.toFixed(1)}) < 0.5`;

export const FUN_CORE = `
// Scales content around ctr by (1 - s) along ax / up inside an elliptical footprint r; s > 0
// magnifies, s < 0 shrinks. Fold-free for s in about (-1, 0.8) per axis.
vec2 scaleWarp(vec2 q, vec2 ctr, vec2 ax, vec2 up, vec2 r, vec2 s) {
  vec2 d = q - ctr;
  float lx = dot(d, ax);
  float ly = dot(d, up);
  float e = (lx * lx) / (r.x * r.x) + (ly * ly) / (r.y * r.y);
  if (e >= 1.0) { return q; }
  float w = (1.0 - e) * (1.0 - e);
  return ctr + ax * (lx * (1.0 - s.x * w)) + up * (ly * (1.0 - s.y * w));
}

// Rotates content around ctr, most at the centre; each circle maps onto itself, so never folds.
vec2 swirlWarp(vec2 q, vec2 ctr, float rad, float ang) {
  vec2 d = q - ctr;
  float r = length(d);
  if (r >= rad) { return q; }
  float w = 1.0 - r / rad;
  float a = ang * w * w;
  float cs = cos(a);
  float sn = sin(a);
  return ctr + vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs);
}

vec2 funWarp(vec2 q, vec4 A, vec4 B, vec4 C, vec4 D, vec4 E, vec4 F, vec4 G, vec4 H, float mode, float k, float t) {
  vec2 d0 = (q - A.xy) / (A.zw * 2.6);
  if (dot(d0, d0) > 1.0) { return q; }
  vec2 ax = normalize(B.zw - B.xy);
  vec2 up = vec2(ax.y, -ax.x);
  float fw = A.z * 2.0;
  float eyeR = D.w;
  vec2 nose = C.xy;
  vec2 mouth = C.zw;
  float mw = D.z;
  if (${is(M.bigHead)}) {
    return bulge(q, A.xy + up * (A.w * 0.12), A.w * 1.95, 0.68 * k);
  }
  if (${is(M.longFace)}) {
    return scaleWarp(q, A.xy - up * (A.w * 0.1), ax, up, A.zw * vec2(1.7, 1.8), vec2(-0.3, 0.5) * k);
  }
  if (${is(M.wideFace)}) {
    return scaleWarp(q, A.xy - up * (A.w * 0.05), ax, up, A.zw * vec2(1.9, 1.5), vec2(0.5, -0.25) * k);
  }
  if (${is(M.bigNose)}) {
    return bulge(q, nose + up * (eyeR * 0.35), max(eyeR * 3.4, fw * 0.3), 0.82 * k);
  }
  if (${is(M.puffyCheeks)}) {
    float r = fw * 0.34;
    vec2 l = mix(F.xy, E.xy, 0.45) - ax * (fw * 0.02);
    vec2 rr = mix(F.zw, E.zw, 0.45) + ax * (fw * 0.02);
    q = bulge(q, l, r, 0.75 * k);
    return bulge(q, rr, r, 0.75 * k);
  }
  if (${is(M.duckLips)}) {
    q = scaleWarp(q, mouth, ax, up, vec2(mw * 1.9, mw * 1.35), vec2(-0.6, 0.6) * k);
    return bulge(q, mouth, mw * 1.5, 0.45 * k);
  }
  if (${is(M.bigMouth)}) {
    return bulge(q, mouth - up * (G.y * 0.2), mw * 2.8, (0.22 + 0.5 * H.w) * k);
  }
  if (${is(M.swirl)}) {
    return swirlWarp(q, mix(nose, A.xy, 0.5), fw * 1.0, k * 2.4 * sin(t * 1.4));
  }
  if (${is(M.jelly)}) {
    float s = sin(t * 7.0);
    vec2 sq = vec2(-0.4, 0.45) * s * k;
    q = scaleWarp(q, A.xy - up * (A.w * 0.2), ax, up, A.zw * vec2(1.7, 1.7), sq);
    return q + ax * (sin(t * 3.5 + dot(q - A.xy, up) / A.w * 2.0) * fw * 0.035 * k);
  }
  if (${is(M.baby)}) {
    q = bulge(q, mouth, mw * 1.7, -0.5 * k);
    return bulge(q, A.xy + up * (A.w * 0.55), A.z * 1.15, 0.28 * k);
  }
  if (${is(M.alien)}) {
    return bulge(q, A.xy + up * (A.w * 0.75), A.z * 1.35, 0.5 * k);
  }
  return q;
}

// Six mirrored 60 degree wedges around ctrOut, each showing the source wedge that opens from ctrSrc
// toward srcAng, scaled by k (source px per output px).
vec2 kaleido(vec2 p, vec2 ctrOut, vec2 ctrSrc, float srcAng, float k, float t) {
  vec2 d = p - ctrOut;
  float seg = 1.0471976;
  float a = mod(atan(d.y, d.x) - t * 0.25, seg * 2.0);
  if (a > seg) { a = seg * 2.0 - a; }
  float s = srcAng - seg * 0.5 + a;
  return ctrSrc + vec2(cos(s), sin(s)) * (length(d) * k);
}

vec2 funRemap(vec2 p, vec4 fun, vec4 A, vec4 B, float hasFace) {
  float mode = fun.x;
  float t = fun.z;
  vec2 ctr = hasFace > 0.5 ? A.xy : uSize * 0.5;
  vec2 fax = hasFace > 0.5 ? normalize(B.zw - B.xy) : vec2(1.0, 0.0);
  vec2 fup = vec2(fax.y, -fax.x);
  if (${is(M.mirror)}) {
    // the head reflected upside down below the chin, like a playing card
    vec2 m = hasFace > 0.5 ? A.xy - fup * (A.w * 1.02) : vec2(uSize.x * 0.5, uSize.y * 0.55);
    float s = dot(m - p, fup);
    return s > 0.0 ? p + fup * (2.0 * s) : p;
  }
  if (${is(M.kaleido)}) {
    if (hasFace > 0.5) {
      // a ring of six whole faces: the wedge from below the chin just holds the face
      float D = A.w * 1.55;
      float k = D / (min(uSize.x, uSize.y) * 0.3);
      return kaleido(p, uSize * 0.5, A.xy - fup * D, atan(fup.y, fup.x), k, t);
    }
    return kaleido(p, uSize * 0.5, uSize * 0.5, -1.5707963, 1.0, t);
  }
  if (${is(M.popArt)}) {
    vec2 h = uSize * 0.5;
    // each quarter shows the whole frame, shifted so the face sits in the middle of it
    return mod(p, h) / h * uSize + (ctr - uSize * 0.5) * 0.6;
  }
  if (${is(M.pixel)}) {
    float cell = max(uSize.x, uSize.y) / 84.0;
    return (floor(p / cell) + 0.5) * cell;
  }
  if (${is(M.glitch)}) {
    float band = floor(p.y / (uSize.y / 28.0));
    float tick = floor(t * 9.0);
    float h1 = hash(vec2(band, tick));
    float shift = h1 > 0.78 ? (hash(vec2(band + 7.0, tick)) - 0.5) * uSize.x * 0.12 : 0.0;
    return vec2(p.x + shift, p.y);
  }
  if (${is(M.vhs)}) {
    float roll = fract(t * 0.12) * 1.3 - 0.15;
    float y = p.y / uSize.y;
    float z = (y - roll) / 0.035;
    float band = exp(-z * z);
    // sized to the frame so a full-resolution capture matches the 720 px preview
    float px1 = uSize.y / 960.0;
    float wob = sin(y * 86.0 + t * 24.0) * 0.6 * px1 + band * (hash(vec2(floor(p.y / (2.0 * px1)), floor(t * 30.0))) - 0.5) * uSize.x * 0.03;
    return vec2(p.x + wob, p.y);
  }
  return p;
}

vec3 popTile(float l, vec2 tile) {
  float lv = smoothstep(0.3, 0.36, l) + smoothstep(0.58, 0.64, l);
  vec3 a = vec3(0.0);
  vec3 b = vec3(0.5);
  vec3 c = vec3(1.0);
  if (tile.x < 0.5 && tile.y < 0.5) { a = vec3(0.13, 0.05, 0.35); b = vec3(0.98, 0.22, 0.55); c = vec3(1.0, 0.88, 0.25); }
  else if (tile.y < 0.5) { a = vec3(0.02, 0.2, 0.33); b = vec3(0.1, 0.75, 0.85); c = vec3(1.0, 0.6, 0.75); }
  else if (tile.x < 0.5) { a = vec3(0.3, 0.05, 0.05); b = vec3(1.0, 0.45, 0.1); c = vec3(0.75, 0.95, 1.0); }
  else { a = vec3(0.05, 0.25, 0.1); b = vec3(0.65, 0.35, 0.95); c = vec3(1.0, 0.95, 0.6); }
  return lv < 1.0 ? mix(a, b, lv) : mix(b, c, lv - 1.0);
}

// 1 on the subject (head, hair and shoulders around one face), 0 on the background
float personMask(vec2 p, vec4 A, vec4 B) {
  vec2 ax = normalize(B.zw - B.xy);
  vec2 up = vec2(ax.y, -ax.x);
  vec2 d = p - A.xy;
  float lx = dot(d, ax);
  float ly = dot(d, up);
  vec2 e = vec2(lx / (A.z * 1.45), (ly - A.w * 0.15) / (A.w * 1.4));
  float head = 1.0 - smoothstep(0.85, 1.05, length(e));
  float below = -ly - A.w * 0.75;
  float halfW = A.z * (0.9 + max(0.0, below) / A.w * 1.6);
  float body = smoothstep(-A.w * 0.2, A.w * 0.05, below) * (1.0 - smoothstep(halfW * 0.9, halfW * 1.08, abs(lx)));
  return max(head, body);
}

vec3 funColor(vec3 c, vec2 pOut, vec2 q, vec4 fun, vec4 tint, float subject, float hasFace, float faceAmt) {
  float mode = fun.x;
  float t = fun.z;
  float k = fun.y;
  float maxSide = max(uSize.x, uSize.y);
  if (${is(M.alien)}) {
    return mix(c, c * tint.rgb * 1.25 + tint.rgb * 0.06, faceAmt * tint.a * k);
  }
  if (${is(M.popArt)}) {
    vec2 tile = step(uSize * 0.5, pOut);
    vec3 pc = popTile(luma(c), tile);
    vec2 cell = mod(pOut, uSize * 0.5);
    float edge = min(min(cell.x, cell.y), min(uSize.x * 0.5 - cell.x, uSize.y * 0.5 - cell.y));
    pc = mix(vec3(1.0), pc, smoothstep(maxSide * 0.004, maxSide * 0.006, edge));
    return mix(c, pc, k);
  }
  if (${is(M.pixel)}) {
    float cell = maxSide / 84.0;
    // average the cell so sensor noise doesn't turn into stray colored blocks
    vec3 avg = (px(q + vec2(-0.25, -0.25) * cell) + px(q + vec2(0.25, -0.25) * cell) +
                px(q + vec2(-0.25, 0.25) * cell) + px(q + vec2(0.25, 0.25) * cell)) * 0.25;
    vec3 base = mix(c, avg, 0.6);
    float bl = luma(base);
    // posterize brightness only; quantized color steps speckle dark hair and blotch skin
    vec3 chroma = (base - bl) * 1.2 * smoothstep(0.06, 0.28, bl);
    vec3 qc = clamp(floor(bl * 7.0 + 0.5) / 7.0 + chroma, 0.0, 1.0);
    vec2 f = fract(pOut / cell);
    float grid = smoothstep(0.0, 0.08, f.x) * smoothstep(0.0, 0.08, f.y);
    return mix(c, clamp(qc * mix(0.8, 1.0, grid), 0.0, 1.0), k);
  }
  if (${is(M.comic)}) {
    float o = maxSide * 0.0022;
    float lx = luma(px(q + vec2(o, 0.0))) - luma(px(q - vec2(o, 0.0)));
    float ly = luma(px(q + vec2(0.0, o))) - luma(px(q - vec2(0.0, o)));
    float ink = smoothstep(0.09, 0.2, length(vec2(lx, ly)));
    float l = luma(c);
    vec3 sat = clamp(mix(vec3(l), c, 1.5), 0.0, 1.0);
    vec3 poster = min(vec3(1.0), floor(sat * 4.0 + 0.5) / 4.0 * 1.06 + 0.03);
    float cell = maxSide / 120.0;
    vec2 g = vec2(pOut.x + pOut.y, pOut.x - pOut.y) * 0.70710678 / cell;
    float r = length(fract(g) - 0.5);
    float dotR = 0.5 * (1.0 - smoothstep(0.12, 0.5, l));
    float dots = 1.0 - smoothstep(dotR - 0.08, dotR + 0.02, r);
    vec3 col = mix(poster, poster * 0.45, dots * 0.8);
    col = mix(col, vec3(0.06, 0.05, 0.08), ink);
    return mix(c, col, k);
  }
  if (${is(M.glitch)}) {
    float band = floor(pOut.y / (uSize.y / 28.0));
    float tick = floor(t * 9.0);
    float hot = step(0.78, hash(vec2(band, tick)));
    vec2 off = vec2(maxSide * (0.006 + 0.012 * hot), 0.0);
    vec3 g = vec3(px(q + off).r, c.g, px(q - off).b);
    if (hash(vec2(band + 3.0, tick)) > 0.95) { g = vec3(1.0) - g; }
    g *= 0.92 + 0.08 * step(0.5, fract(pOut.y / (uSize.y / 320.0)));
    return mix(c, g, k);
  }
  if (${is(M.vhs)}) {
    vec2 off = vec2(maxSide * 0.004, 0.0);
    vec3 v = vec3(px(q + off).r, c.g, px(q - off).b);
    v = mix(vec3(luma(v)), v, 0.75) * 0.9 + 0.06;
    v *= 0.88 + 0.12 * step(0.5, fract(pOut.y / (uSize.y / 320.0)));
    v += (hash(floor(pOut / (uSize.y / 480.0)) + floor(t * 30.0)) - 0.5) * 0.06;
    v = vec3(v.r * 1.04, v.g, v.b * 1.08);
    return mix(c, clamp(v, 0.0, 1.0), k);
  }
  if (${is(M.colorPop)}) {
    float m = hasFace > 0.5 ? subject : 1.0 - smoothstep(0.25, 0.55, length((pOut - uSize * 0.5) / maxSide));
    vec3 gray = vec3(luma(c));
    gray = clamp((gray - 0.5) * 1.25 + 0.5, 0.0, 1.0) * 0.9;
    vec3 pop = clamp(mix(vec3(luma(c)), c, 1.45) * 1.04, 0.0, 1.0);
    return mix(c, mix(gray, pop, m), k);
  }
  return c;
}
`;

/** Remaps `p` for screen effects; declares `pOut` (the untouched output pixel). Goes before beautyPass. */
export const funPre = (maxFaces: number) => `
  vec2 pOut = p;
  if (uFun.x > 19.5) {
    p = funRemap(p, uFun, ${maxFaces > 0 ? 'uF0A, uF0B, uFaceCount' : 'vec4(0.0), vec4(0.0), 0.0'});
  }`;

/** Per-face warps; goes inside beautyPass right after `vec2 q = p;`. */
export const funWarpPass = (maxFaces: number) =>
  maxFaces > 0
    ? `if (uFun.x > 0.5 && uFun.x < 19.5) {
    ${perFace(maxFaces, (i) => `q = funWarp(q, ${faceArgs(i, FACE_PARTS)}, uFun.x, uFun.y, uFun.z);`)}
  }`
    : '';

/** Recolors after the beauty pass and restores `p` to the output pixel. */
export const funPost = (maxFaces: number) => `
  if (uFun.x > 10.5) {
    float subject = 0.0;
    ${maxFaces > 0 ? `if (abs(uFun.x - ${FUN_MODES.colorPop.toFixed(1)}) < 0.5) {
      ${perFace(maxFaces, (i) => `subject = max(subject, personMask(q, uF${i}A, uF${i}B));`)}
    }` : ''}
    c = funColor(c, pOut, q, uFun, uFun2, subject, ${maxFaces > 0 ? 'uFaceCount' : '0.0'}, face);
  }
  p = pOut;`;
