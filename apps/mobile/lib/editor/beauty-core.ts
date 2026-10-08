/**
 * Beauty math shared by the Skia editor shader (SkSL) and the live camera shader (GLSL ES 3.0).
 * Written in the common subset of both languages: vec* types, constant loop bounds, explicit
 * float literals. The including shader must define `uniform vec2 uSize;` and `vec3 px(vec2 q)`
 * which samples the source image at pixel coordinate `q` (top-left origin).
 *
 * Face parameters are packed into vec4s, all in image pixels:
 *   A = center.xy, radius.xy        B = leftEye.xy, rightEye.xy (image-left eye first)
 *   C = nose.xy, mouth.xy           D = chin.xy, mouthHalfWidth, eyeRadius
 *   E = leftJaw.xy, rightJaw.xy     F = leftCheek.xy, rightCheek.xy
 *   G = noseHalfWidth, lipHalfHeight, lipShaped (1 = from lip contours), 0
 *   H = lip corner level, inner upper-lip edge, inner lower-lip edge (px along up from mouth), mouthOpen
 */

export const FACE_PARTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export const faceUniformDecl = (maxFaces: number) =>
  Array.from({ length: maxFaces }, (_, i) => FACE_PARTS.map((part) => `uniform vec4 uF${i}${part};`).join('\n')).join(
    '\n',
  );

export const faceArgs = (i: number, parts: readonly string[] = FACE_PARTS) =>
  parts.map((part) => `uF${i}${part}`).join(', ');

export const perFace = (maxFaces: number, fn: (i: number) => string) =>
  Array.from({ length: maxFaces }, (_, i) => `if (uFaceCount > ${i}.5) { ${fn(i)} }`).join('\n  ');

/** `rings` sets the skin-smoothing quality (8 taps per ring); the live camera uses fewer than export. */
export const beautyCore = (rings: number) => `
float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float hash(vec2 v) {
  return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
}

float skinProb(vec3 c) {
  float cb = 0.5 - 0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b;
  float cr = 0.5 + 0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b;
  float s = smoothstep(0.27, 0.32, cb) * (1.0 - smoothstep(0.49, 0.54, cb));
  s *= smoothstep(0.51, 0.545, cr) * (1.0 - smoothstep(0.67, 0.72, cr));
  return s * smoothstep(0.06, 0.18, luma(c));
}

vec3 softLight(vec3 b, vec3 s) {
  vec3 d = mix(((16.0 * b - 12.0) * b + 4.0) * b, sqrt(b), step(0.25, b));
  return mix(b - (1.0 - 2.0 * s) * b * (1.0 - b), b + (2.0 * s - 1.0) * (d - b), step(0.5, s));
}

// Moves content near ctr by m with a smooth (1 - r^2)^2 falloff; fold-free while |m| < 0.6 * rad.
vec2 translateWarp(vec2 q, vec2 ctr, float rad, vec2 m) {
  vec2 d = q - ctr;
  float x = dot(d, d) / (rad * rad);
  if (x >= 1.0) { return q; }
  float w = 1.0 - x;
  return q - w * w * m;
}

// translateWarp with an elliptical footprint: radius ra along the unit axis a, rb across it. A
// footprint stretched along a contour moves the whole contour instead of denting one point.
// Fold-free while |m.a| / ra + |m.b| / rb < 0.6.
vec2 ellipseWarp(vec2 q, vec2 ctr, vec2 a, float ra, float rb, vec2 m) {
  vec2 d = q - ctr;
  float u = dot(d, a) / ra;
  float v = dot(d, vec2(a.y, -a.x)) / rb;
  float x = u * u + v * v;
  if (x >= 1.0) { return q; }
  float w = 1.0 - x;
  return q - w * w * m;
}

vec2 bulge(vec2 q, vec2 ctr, float rad, float s) {
  vec2 d = q - ctr;
  float dist = length(d);
  if (dist >= rad) { return q; }
  float x = dist / rad;
  float w = 1.0 - x * x;
  return ctr + d * (1.0 - s * w * w);
}

vec2 pinchX(vec2 q, vec2 ctr, vec2 ax, vec2 up, float rw, float rh, float s) {
  vec2 d = q - ctr;
  float lx = dot(d, ax);
  float ly = dot(d, up);
  float e = (lx * lx) / (rw * rw) + (ly * ly) / (rh * rh);
  if (e >= 1.0) { return q; }
  float w = 1.0 - e;
  return ctr + ax * (lx * (1.0 + s * w * w)) + up * ly;
}

float ellipse(vec2 q, vec2 ctr, vec2 ax, vec2 up, vec2 r) {
  vec2 d = q - ctr;
  vec2 l = vec2(dot(d, ax), dot(d, up)) / r;
  float e = dot(l, l);
  if (e >= 1.0) { return 0.0; }
  float w = 1.0 - e;
  return w * w * (3.0 - 2.0 * w);
}

// b1 = smooth, whiten, clarity|tone, slim; b2 = jaw, eyes, nose, cheek; chinAmt: + longer, - shorter
vec2 warpFace(vec2 q, vec4 A, vec4 B, vec4 C, vec4 D, vec4 E, vec4 F, vec4 G, float slim, vec4 b2, float chinAmt) {
  vec2 d0 = (q - A.xy) / (A.zw * 1.7);
  if (dot(d0, d0) > 1.0) { return q; }
  vec2 le = B.xy;
  vec2 re = B.zw;
  vec2 nose = C.xy;
  vec2 chin = D.xy;
  float eyeR = D.w;
  vec2 ax = normalize(re - le);
  vec2 up = vec2(ax.y, -ax.x);
  float fw = A.z * 2.0;
  float jaw = b2.x;
  float eyes = b2.y;
  float noseAmt = b2.z;
  float cheek = b2.w;
  vec2 q0 = q;
  // shifts at 100% stay at or under about two thirds of each warp's fold limit, and a chain of
  // fold-free warps is still fold-free
  if (slim > 0.001) {
    // footprint runs up the side of the face (cheekbone to below the jaw): |m.a|/ra + |m.b|/rb
    // is 0.4 at 100%
    float a = slim * fw * 0.11;
    vec2 cl = mix(mix(E.xy, F.xy, 0.25), A.xy, 0.12);
    vec2 cr = mix(mix(E.zw, F.zw, 0.25), A.xy, 0.12);
    q = ellipseWarp(q, cl, up, fw * 0.5, fw * 0.3, normalize(ax + up * 0.15) * a);
    q = ellipseWarp(q, cr, up, fw * 0.5, fw * 0.3, normalize(-ax + up * 0.15) * a);
  }
  if (jaw > 0.001) {
    // V-line: pull the lower jaw sides in toward the chin, without lifting the neck; footprint
    // runs along the jawline (0.4 of the fold limit at 100%)
    float a = jaw * fw * 0.07;
    vec2 jl = mix(E.xy, chin, 0.5) + up * (fw * 0.04);
    vec2 jr = mix(E.zw, chin, 0.5) + up * (fw * 0.04);
    q = ellipseWarp(q, jl, normalize(chin - E.xy), fw * 0.32, fw * 0.2, normalize(ax + up * 0.35) * a);
    q = ellipseWarp(q, jr, normalize(chin - E.zw), fw * 0.32, fw * 0.2, normalize(-ax + up * 0.35) * a);
  }
  if (cheek > 0.001) {
    float a = cheek * fw * 0.06;
    q = translateWarp(q, F.xy - ax * (fw * 0.12) + up * (eyeR * 0.3), fw * 0.22, ax * a);
    q = translateWarp(q, F.zw + ax * (fw * 0.12) + up * (eyeR * 0.3), fw * 0.22, -ax * a);
  }
  // keep the neck and collar still: contour warps fade out below the chin line, over a band tall
  // enough that the jaw outline doesn't bend where the fade starts
  q = q0 + (q - q0) * smoothstep(-fw * 0.3, fw * 0.08, dot(q0 - chin, up));
  if (abs(chinAmt) > 0.001) {
    q = translateWarp(q, chin + up * (fw * 0.06), fw * 0.2, up * (-chinAmt * fw * 0.075));
  }
  if (noseAmt > 0.001) {
    vec2 nc = mix(nose, (le + re) * 0.5, 0.35);
    float rw = max(G.x * 1.7, eyeR * 1.3);
    q = pinchX(q, nc, ax, up, rw, max(distance(nose, (le + re) * 0.5) * 0.85, eyeR * 2.0), noseAmt * 0.55);
  }
  if (eyes > 0.001) {
    // bulge stays fold-free below 1.0; 0.42 = 1.7x at the pupil at 100%
    q = bulge(q, le, eyeR * 2.1, eyes * 0.42);
    q = bulge(q, re, eyeR * 2.1, eyes * 0.42);
  }
  return q;
}

// 1 on facial skin, 0 outside the face, on the eyes and on the mouth.
float faceMask(vec2 q, vec4 A, vec4 B, vec4 C, vec4 D) {
  vec2 d = (q - A.xy) / (A.zw * vec2(1.08, 1.12));
  float m = 1.0 - smoothstep(0.78, 1.0, length(d));
  if (m <= 0.0) { return 0.0; }
  float eyeR = D.w;
  m *= smoothstep(eyeR * 0.8, eyeR * 1.5, distance(q, B.xy));
  m *= smoothstep(eyeR * 0.8, eyeR * 1.5, distance(q, B.zw));
  vec2 ax = normalize(B.zw - B.xy);
  vec2 up = vec2(ax.y, -ax.x);
  vec2 md = q - C.zw;
  vec2 ml = vec2(dot(md, ax), dot(md, up) * 1.9);
  m *= smoothstep(D.z * 0.75, D.z * 1.25, length(ml));
  return m;
}

// Edge-preserving (bilateral) blur over rings of 8 taps. Also returns the plain box mean.
vec3 smoothSkin(vec2 q, vec3 c0, float R, float amount, out vec3 box) {
  vec3 sum = c0;
  float wsum = 1.0;
  vec3 bsum = c0;
  float s2 = 0.004 + 0.04 * amount;
  for (int ring = 0; ring < ${rings}; ring++) {
    float fr = float(ring);
    float rr = R * (1.0 + fr * ${(2.3 / Math.max(1, rings - 1)).toFixed(3)});
    float wr = 1.0 - fr * 0.2;
    float off = fr * 0.3926991;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982 + off;
      vec3 t = px(q + vec2(cos(a), sin(a)) * rr);
      vec3 dd = t - c0;
      float w = wr * exp(-dot(dd, dd) / s2);
      sum += t * w;
      wsum += w;
      bsum += t;
    }
  }
  box = bsum / ${1 + rings * 8}.0;
  return sum / wsum;
}

vec3 brightenSkin(vec3 c, float whiten, float tone, float mask) {
  if (whiten > 0.001) {
    // half luminance lift that keeps the skin's hue, half screen toward white; a plain screen
    // alone turns warm skin grey-blue
    float w = whiten * mask;
    float l = luma(c);
    float lt = l + (1.0 - l) * 0.5 * w;
    vec3 keep = min(c * (lt / max(l, 0.02)), vec3(1.0));
    vec3 lifted = c + (1.0 - c) * 0.5 * w;
    c = mix(keep, lifted, 0.5);
    c = mix(c, c * vec3(1.0, 0.99, 1.0) + vec3(0.0, 0.0, 0.012), w);
  }
  if (abs(tone) > 0.001) {
    float t = tone * mask;
    c = clamp(c * vec3(1.0 + 0.1 * t, 1.0 + 0.015 * t, 1.0 - 0.11 * t) + vec3(0.016, 0.005, -0.012) * t, 0.0, 1.0);
  }
  return c;
}

// Lip coverage (0..1) from the lip outline: outer edges rise/fall from the corners to the lip box
// top/bottom, minus the opening between the inner edges. u runs corner to corner, v along up.
float lipMask(vec2 q, vec2 mc, vec2 ax, vec2 up, float hw, float hh, vec4 H, float feather) {
  vec2 d = q - mc;
  float u = dot(d, ax) / hw;
  if (abs(u) >= 1.08) { return 0.0; }
  float v = dot(d, up);
  float s = max(0.0, 1.0 - u * u);
  float cv = H.x;
  // exponents fitted to ML Kit lip contours of closed and open mouths
  float top = cv + (hh - cv) * pow(s, 0.8);
  float bot = cv + (-hh - cv) * pow(s, 0.8);
  float m = smoothstep(-feather, feather, top - v) * smoothstep(-feather, feather, v - bot);
  float gap = H.y - H.z;
  if (gap > feather * 0.5) {
    float it = cv + (H.y - cv) * pow(s, 1.1);
    float ib = cv + (H.z - cv) * pow(s, 0.8);
    float f2 = feather * 0.6;
    m *= 1.0 - smoothstep(-f2, f2, it - v) * smoothstep(-f2, f2, v - ib);
  }
  return m * (1.0 - smoothstep(0.86, 1.06, abs(u)));
}

vec3 lipBlush(vec3 c, vec3 c0, vec2 q, vec4 A, vec4 B, vec4 C, vec4 D, vec4 F, vec4 G, vec4 H,
              float lipAmt, vec3 lipCol, float blushAmt, vec3 blushCol) {
  vec2 d0 = (q - A.xy) / (A.zw * 1.4);
  if (dot(d0, d0) > 1.0) { return c; }
  vec2 ax = normalize(B.zw - B.xy);
  vec2 up = vec2(ax.y, -ax.x);
  float eyeR = D.w;
  float fw = A.z * 2.0;
  if (blushAmt > 0.001) {
    vec2 r = vec2(fw * 0.13, fw * 0.095);
    float a = ellipse(q, F.xy - ax * (fw * 0.03) + up * (eyeR * 0.2), ax, up, r);
    a += ellipse(q, F.zw + ax * (fw * 0.03) + up * (eyeR * 0.2), ax, up, r);
    vec3 t = mix(softLight(c, blushCol), c * blushCol * 1.12, 0.35);
    c = mix(c, t, clamp(a * blushAmt, 0.0, 1.0));
  }
  if (lipAmt > 0.001) {
    float mw = D.z;
    float lh = G.y > 0.5 ? G.y : mw * 0.42;
    float zone = lipMask(q, C.zw, ax, up, mw, lh, H, max(1.0, lh * 0.14));
    if (zone > 0.0) {
      // lips are redder and darker than the surrounding skin; teeth are bright and unsaturated.
      // A contour outline is trusted and only keeps teeth out; an estimated one also needs redness.
      float cr = 0.5 + 0.5 * c0.r - 0.418688 * c0.g - 0.081312 * c0.b;
      float sat = max(c0.r, max(c0.g, c0.b)) - min(c0.r, min(c0.g, c0.b));
      float teeth = smoothstep(0.55, 0.75, luma(c0)) * (1.0 - smoothstep(0.08, 0.16, sat));
      float red = smoothstep(0.545, 0.585, cr) * smoothstep(0.08, 0.18, sat) * (1.0 - smoothstep(0.62, 0.8, luma(c0)));
      float lipness = mix(red, 1.0 - teeth, G.z);
      vec3 colored = clamp(lipCol + (luma(c) - luma(lipCol)), 0.0, 1.0);
      vec3 t = mix(colored, c * lipCol * 1.35, 0.4);
      t = mix(vec3(luma(t)), t, 0.85);
      c = mix(c, t, clamp(zone * lipness * lipAmt * 0.7, 0.0, 0.7));
    }
  }
  return c;
}

vec3 softGlow(vec2 q, vec3 c, float glow, float maxSide) {
  float G = maxSide * 0.012;
  vec3 g = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982 + 0.2;
    g += px(q + vec2(cos(a), sin(a)) * G);
    g += px(q + vec2(cos(a + 0.39), sin(a + 0.39)) * (G * 2.2));
  }
  g = g / 16.0;
  c = mix(c, max(c, g), glow * 0.75);
  return mix(c, g, glow * 0.22);
}
`;

export const BEAUTY_CORE = beautyCore(3);

/**
 * The beauty pass both shaders run per pixel. Expects in scope: `vec2 p` (pixel), uniforms
 * uSize, uFaceCount, uF{i}{A..G}, floats smoothAmt, whiten, tone, clarity, slim, chinAmt, lipAmt,
 * blushAmt, vec4 b2, vec3 lipCol, blushCol, and `bool needBox` (true when clarity or another
 * detail tool needs the box mean). `preWarp` runs on `q` before the beauty warp. Leaves `q` (warped position), `c0` (source color), `c`
 * (result), `face` (face mask), `mask` (skin mask), `sm` (smoothing weight), `box` and `bil` in scope.
 */
export const beautyPass = (maxFaces: number, preWarp = '') => `
  vec2 q = p;
  ${preWarp}
  ${perFace(maxFaces, (i) => `q = warpFace(q, ${faceArgs(i, ['A', 'B', 'C', 'D', 'E', 'F', 'G'])}, slim, b2, chinAmt);`)}

  vec3 c0 = px(q);
  vec3 c = c0;
  float minSide = min(uSize.x, uSize.y);
  float maxSide = max(uSize.x, uSize.y);

  // blur radii follow the face (or frame) size, so a 720 px live buffer smooths as much as export
  float face = 0.0;
  float R = minSide * 0.013;
  if (uFaceCount > 0.5) {
    float m = 0.0;
    ${perFace(maxFaces, (i) => `m = faceMask(q, ${faceArgs(i, ['A', 'B', 'C', 'D'])}); if (m > face) { face = m; R = uF${i}A.z * 0.052; }`)}
  } else {
    face = 1.0;
  }
  float skin = skinProb(c0);
  float mask = uFaceCount > 0.5 ? face * (0.3 + 0.7 * skin) : skin;

  vec3 box = c0;
  vec3 bil = c0;
  float sm = 0.0;
  if (smoothAmt > 0.001 || needBox) {
    bil = smoothSkin(q, c0, R, smoothAmt, box);
    sm = clamp(smoothAmt * max(mask, skin * 0.4) * 1.5, 0.0, 1.0);
    c = mix(c0, bil, sm);
    c += (c0 - bil) * sm * 0.06;
  }
  if (needBox && clarity > 0.001) {
    c += (c0 - box) * clarity * 0.9 * face * (1.0 - sm * 0.8);
  }

  // neck and other visible skin follow the face's tone so the face doesn't read as a mask
  c = brightenSkin(c, whiten, tone, max(mask, skin * 0.75));

  if (lipAmt + blushAmt > 0.001) {
    ${perFace(maxFaces, (i) => `c = lipBlush(c, c0, q, ${faceArgs(i, ['A', 'B', 'C', 'D', 'F', 'G', 'H'])}, lipAmt, lipCol, blushAmt, blushCol);`)}
  }
`;
