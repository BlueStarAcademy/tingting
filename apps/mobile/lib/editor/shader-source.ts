export const MAX_FACES = 3;

export const FACE_PARTS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

const faceUniformDecl = Array.from({ length: MAX_FACES }, (_, i) =>
  FACE_PARTS.map((part) => `uniform float4 uF${i}${part};`).join('\n'),
).join('\n');

const faceArgs = (i: number, parts: readonly string[]) => parts.map((part) => `uF${i}${part}`).join(', ');

const perFace = (fn: (i: number) => string) =>
  Array.from({ length: MAX_FACES }, (_, i) => `if (uFaceCount > ${i}.5) { ${fn(i)} }`).join('\n  ');

export const EDITOR_SHADER_SOURCE = `
uniform shader image;
uniform float2 uSize;
uniform float uFaceCount;
uniform float4 uBeauty1;
uniform float4 uBeauty2;
uniform float4 uMk1;
uniform float4 uMk2;
uniform float3 uBlushCol;
uniform float3 uLipCol;
uniform float3 uShadowCol;
uniform float3 uLinerCol;
uniform float3 uConcealCol;
uniform float3 uHiCol;
uniform float4 uFinish1;
uniform float4 uFinish2;
uniform float4 uFx1;
uniform float4 uFx2;
${faceUniformDecl}

float3 px(float2 q) {
  return float3(image.eval(clamp(q, float2(0.5), uSize - float2(0.5))).rgb);
}

float luma(float3 c) {
  return dot(c, float3(0.299, 0.587, 0.114));
}

float hash(float2 v) {
  return fract(sin(dot(v, float2(12.9898, 78.233))) * 43758.5453);
}

float skinProb(float3 c) {
  float cb = 0.5 - 0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b;
  float cr = 0.5 + 0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b;
  float s = smoothstep(0.27, 0.32, cb) * (1.0 - smoothstep(0.49, 0.54, cb));
  s *= smoothstep(0.51, 0.545, cr) * (1.0 - smoothstep(0.67, 0.72, cr));
  return s * smoothstep(0.06, 0.18, luma(c));
}

float3 softLight(float3 b, float3 s) {
  float3 d = mix(((16.0 * b - 12.0) * b + 4.0) * b, sqrt(b), step(0.25, b));
  return mix(b - (1.0 - 2.0 * s) * b * (1.0 - b), b + (2.0 * s - 1.0) * (d - b), step(0.5, s));
}

float2 translateWarp(float2 q, float2 ctr, float rad, float2 m) {
  float2 d = q - ctr;
  float dd = dot(d, d);
  float rr = rad * rad;
  if (dd >= rr) { return q; }
  float mm = dot(m, m);
  float t = (rr - dd) / (rr - dd + mm + 0.0001);
  return q - t * t * m;
}

float2 bulge(float2 q, float2 ctr, float rad, float s) {
  float2 d = q - ctr;
  float dist = length(d);
  if (dist >= rad) { return q; }
  float x = dist / rad;
  float w = 1.0 - x * x;
  return ctr + d * (1.0 - s * w * w);
}

float2 pinchX(float2 q, float2 ctr, float2 ax, float2 up, float rw, float rh, float s) {
  float2 d = q - ctr;
  float lx = dot(d, ax);
  float ly = dot(d, up);
  float e = (lx * lx) / (rw * rw) + (ly * ly) / (rh * rh);
  if (e >= 1.0) { return q; }
  float w = 1.0 - e;
  return ctr + ax * (lx * (1.0 + s * w * w)) + up * ly;
}

float ellipse(float2 q, float2 ctr, float2 ax, float2 up, float2 r) {
  float2 d = q - ctr;
  float2 l = float2(dot(d, ax), dot(d, up)) / r;
  float e = dot(l, l);
  if (e >= 1.0) { return 0.0; }
  float w = 1.0 - e;
  return w * w * (3.0 - 2.0 * w);
}

float2 warpFace(float2 q, float4 A, float4 B, float4 C, float4 D, float4 E, float4 F) {
  float2 ctr = A.xy;
  float2 rad = A.zw;
  float2 d0 = (q - ctr) / (rad * 1.7);
  if (dot(d0, d0) > 1.0) { return q; }
  float2 le = B.xy;
  float2 re = B.zw;
  float2 nose = C.xy;
  float2 chin = D.xy;
  float eyeR = D.w;
  float2 ax = normalize(re - le);
  float2 up = float2(ax.y, -ax.x);
  float fw = rad.x * 2.0;
  float slim = uBeauty1.w;
  float jaw = uBeauty2.x;
  float eyes = uBeauty2.y;
  float noseAmt = uBeauty2.z;
  float cheek = uBeauty2.w;
  if (slim > 0.001) {
    float a = slim * fw * 0.075;
    q = translateWarp(q, E.xy, fw * 0.4, normalize(ax + up * 0.25) * a);
    q = translateWarp(q, E.zw, fw * 0.4, normalize(-ax + up * 0.25) * a);
  }
  if (jaw > 0.001) {
    q = translateWarp(q, chin, fw * 0.32, up * (jaw * fw * 0.06));
    float a = jaw * fw * 0.045;
    q = translateWarp(q, mix(E.xy, chin, 0.55), fw * 0.26, normalize(ax + up * 0.6) * a);
    q = translateWarp(q, mix(E.zw, chin, 0.55), fw * 0.26, normalize(-ax + up * 0.6) * a);
  }
  if (cheek > 0.001) {
    float a = cheek * fw * 0.04;
    q = translateWarp(q, F.xy - ax * (fw * 0.12) + up * (eyeR * 0.3), fw * 0.24, ax * a);
    q = translateWarp(q, F.zw + ax * (fw * 0.12) + up * (eyeR * 0.3), fw * 0.24, -ax * a);
  }
  if (noseAmt > 0.001) {
    float2 nc = mix(nose, (le + re) * 0.5, 0.35);
    q = pinchX(q, nc, ax, up, eyeR * 1.7, eyeR * 2.6, noseAmt * 0.35);
  }
  if (eyes > 0.001) {
    q = bulge(q, le, eyeR * 2.1, eyes * 0.3);
    q = bulge(q, re, eyeR * 2.1, eyes * 0.3);
  }
  return q;
}

float faceMask(float2 q, float4 A, float4 B, float4 C, float4 D) {
  float2 d = (q - A.xy) / (A.zw * float2(1.08, 1.12));
  float m = 1.0 - smoothstep(0.78, 1.0, length(d));
  if (m <= 0.0) { return 0.0; }
  float eyeR = D.w;
  m *= smoothstep(eyeR * 0.8, eyeR * 1.5, distance(q, B.xy));
  m *= smoothstep(eyeR * 0.8, eyeR * 1.5, distance(q, B.zw));
  float2 ax = normalize(B.zw - B.xy);
  float2 up = float2(ax.y, -ax.x);
  float2 md = q - C.zw;
  float2 ml = float2(dot(md, ax), dot(md, up) * 1.9);
  m *= smoothstep(D.z * 0.75, D.z * 1.25, length(ml));
  return m;
}

float3 makeup(float3 c, float3 c0, float2 q, float4 A, float4 B, float4 C, float4 D, float4 F) {
  float2 le = B.xy;
  float2 re = B.zw;
  float2 ax = normalize(re - le);
  float2 up = float2(ax.y, -ax.x);
  float eyeR = D.w;
  float fw = A.z * 2.0;
  float2 nose = C.xy;
  float2 mouth = C.zw;
  float mw = D.z;
  float2 d0 = (q - A.xy) / (A.zw * 1.4);
  if (dot(d0, d0) > 1.0) { return c; }
  if (uMk1.x > 0.001) {
    float2 r = float2(fw * 0.13, fw * 0.095);
    float a = ellipse(q, F.xy - ax * (fw * 0.03) + up * (eyeR * 0.2), ax, up, r);
    a += ellipse(q, F.zw + ax * (fw * 0.03) + up * (eyeR * 0.2), ax, up, r);
    float3 t = mix(softLight(c, uBlushCol), c * uBlushCol * 1.12, 0.35);
    c = mix(c, t, clamp(a * uMk1.x * 0.75, 0.0, 1.0));
  }
  if (uMk1.y > 0.001) {
    float zone = ellipse(q, mouth, ax, up, float2(mw * 1.2, mw * 0.62));
    if (zone > 0.0) {
      float cr = 0.5 + 0.5 * c0.r - 0.418688 * c0.g - 0.081312 * c0.b;
      float lipness = smoothstep(0.525, 0.575, cr) * (1.0 - smoothstep(0.72, 0.88, luma(c0)));
      float3 colored = clamp(uLipCol + (luma(c) - luma(uLipCol)) * 0.9, 0.0, 1.0);
      float3 t = mix(colored, c * uLipCol * 1.5, 0.3);
      c = mix(c, t, clamp(zone * lipness * uMk1.y * 0.9, 0.0, 1.0));
    }
  }
  if (uMk1.z > 0.001 || uMk1.w > 0.001 || uMk2.x > 0.001) {
    for (int k = 0; k < 2; k++) {
      float2 e = k == 0 ? le : re;
      float side = k == 0 ? -1.0 : 1.0;
      if (uMk1.z > 0.001) {
        float a = ellipse(q, e + up * (eyeR * 0.85) + ax * (side * eyeR * 0.15), ax, up, float2(eyeR * 1.55, eyeR * 0.75));
        float2 el = float2(dot(q - e, ax) / (eyeR * 1.1), dot(q - e, up) / (eyeR * 0.5));
        float protect = smoothstep(0.35, 0.8, length(el));
        c = mix(c, c * mix(float3(1.0), uShadowCol, 0.85), clamp(a * protect * uMk1.z * 0.8, 0.0, 1.0));
      }
      if (uMk1.w > 0.001) {
        float a = ellipse(q, e + up * (eyeR * 0.36) + ax * (side * eyeR * 0.2), ax, up, float2(eyeR * 1.1, eyeR * 0.14));
        c = mix(c, uLinerCol, clamp(a * uMk1.w * 0.85, 0.0, 1.0));
      }
      if (uMk2.x > 0.001) {
        float a = ellipse(q, e - up * (eyeR * 0.95), ax, up, float2(eyeR * 1.25, eyeR * 0.5));
        c = mix(c, mix(c + (1.0 - c) * 0.22, uConcealCol, 0.12), clamp(a * uMk2.x, 0.0, 1.0));
      }
    }
  }
  if (uMk2.y > 0.001) {
    float2 em = (le + re) * 0.5;
    float a = ellipse(q, mix(em, nose, 0.55), ax, up, float2(eyeR * 0.35, distance(em, nose) * 0.6));
    a += ellipse(q, em + up * (eyeR * 2.4), ax, up, float2(eyeR * 1.9, eyeR * 0.8)) * 0.8;
    float3 screen = 1.0 - (1.0 - c) * (1.0 - uHiCol * 0.4);
    c = mix(c, screen, clamp(a * uMk2.y, 0.0, 1.0));
  }
  return c;
}

half4 main(float2 p) {
  float2 q = p;
  ${perFace((i) => `q = warpFace(q, ${faceArgs(i, FACE_PARTS)});`)}

  float3 c0 = px(q);
  float3 c = c0;
  float smoothAmt = uBeauty1.x;
  float whiten = uBeauty1.y;
  float clarity = uBeauty1.z;
  float sharpen = uFinish1.w;
  float glow = uFinish2.z;
  float minSide = min(uSize.x, uSize.y);
  float maxSide = max(uSize.x, uSize.y);

  float face = 0.0;
  float R = minSide * 0.006;
  if (uFaceCount > 0.5) {
    float m = 0.0;
    ${perFace((i) => `m = faceMask(q, ${faceArgs(i, ['A', 'B', 'C', 'D'])}); if (m > face) { face = m; R = uF${i}A.z * 0.05; }`)}
  } else {
    face = 1.0;
  }
  float skin = skinProb(c0);
  float mask = uFaceCount > 0.5 ? face * (0.3 + 0.7 * skin) : skin;

  if (smoothAmt > 0.001 || clarity > 0.001 || sharpen > 0.001) {
    float3 sum = c0;
    float wsum = 1.0;
    float3 box = c0;
    float s2 = 0.012 + 0.02 * smoothAmt;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982;
      float3 t1 = px(q + float2(cos(a), sin(a)) * R);
      float3 t2 = px(q + float2(cos(a + 0.3926991), sin(a + 0.3926991)) * (R * 2.0));
      float3 d1 = t1 - c0;
      float3 d2 = t2 - c0;
      float w1 = 0.9 * exp(-dot(d1, d1) / s2);
      float w2 = 0.55 * exp(-dot(d2, d2) / s2);
      sum += t1 * w1 + t2 * w2;
      wsum += w1 + w2;
      box += t1 + t2;
    }
    float3 bil = sum / wsum;
    box = box / 17.0;
    float sm = clamp(smoothAmt * mask * 1.15, 0.0, 1.0);
    c = mix(c0, bil, sm);
    c += (c0 - bil) * sm * 0.12;
    float3 detail = c0 - box;
    c += detail * clarity * 0.9 * face * (1.0 - sm * 0.8);
    c += detail * sharpen * 1.6 * (1.0 - sm);
  }

  if (whiten > 0.001) {
    float w = whiten * mask;
    c = mix(c, c + (1.0 - c) * 0.32, w);
    c = mix(c, float3(c.r * 0.985, c.g, min(1.0, c.b * 1.04 + 0.01)), w);
  }

  if (uMk1.x + uMk1.y + uMk1.z + uMk1.w + uMk2.x + uMk2.y > 0.001) {
    ${perFace((i) => `c = makeup(c, c0, q, ${faceArgs(i, ['A', 'B', 'C', 'D', 'F'])});`)}
  }

  if (uFx1.y > 0.001) {
    float2 off = (p - uSize * 0.5) / maxSide * (uFx1.y * maxSide * 0.025);
    c.r += px(q + off).r - c0.r;
    c.b += px(q - off).b - c0.b;
  }

  if (glow > 0.001) {
    float G = maxSide * 0.012;
    float3 g = float3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982 + 0.2;
      g += px(q + float2(cos(a), sin(a)) * G);
      g += px(q + float2(cos(a + 0.39), sin(a + 0.39)) * (G * 2.2));
    }
    g = g / 16.0;
    c = mix(c, max(c, g), glow * 0.75);
    c = mix(c, g, glow * 0.22);
  }

  float l = luma(c);
  if (abs(uFinish1.x) > 0.001) {
    float w = smoothstep(0.4, 1.0, l) * uFinish1.x * 0.45;
    c += w > 0.0 ? (1.0 - c) * w : c * w;
  }
  if (abs(uFinish1.y) > 0.001) {
    float w = (1.0 - smoothstep(0.0, 0.55, l)) * uFinish1.y * 0.45;
    c += w > 0.0 ? (1.0 - c) * w : c * w;
  }
  if (uFinish1.z > 0.001) {
    c = mix(c, c * 0.8 + 0.13, uFinish1.z);
  }

  float2 uv = p / uSize;
  if (uFx1.x > 0.001) {
    float d = length((p - float2(0.0, uSize.y * 0.15)) / maxSide);
    float lk = pow(clamp(1.0 - d / 0.85, 0.0, 1.0), 2.0);
    float d2 = length((p - float2(uSize.x, uSize.y * 0.9)) / maxSide);
    lk += pow(clamp(1.0 - d2 / 0.5, 0.0, 1.0), 2.0) * 0.6;
    float3 lc = mix(float3(1.0, 0.42, 0.18), float3(1.0, 0.78, 0.35), uv.y);
    c = 1.0 - (1.0 - c) * (1.0 - lc * lk * uFx1.x * 0.9);
  }
  if (uFx2.x > 0.001) {
    float2 sp = float2(uSize.x * 0.82, uSize.y * 0.14);
    float d = length(p - sp) / maxSide;
    float gl = exp(-d * d * 30.0) * 0.95 + exp(-d * d * 4.0) * 0.3;
    float ringD = (d - 0.25) / 0.012;
    gl += exp(-ringD * ringD) * 0.12;
    float gd = length(p - (sp + (uSize * 0.5 - sp) * 1.4)) / maxSide / 0.035;
    gl += exp(-gd * gd) * 0.18;
    c = 1.0 - (1.0 - c) * (1.0 - float3(1.0, 0.86, 0.62) * gl * uFx2.x);
  }
  if (uFx1.z > 0.001) {
    float cell = maxSide / 140.0;
    float2 id = floor(p / cell);
    float h = hash(id);
    if (h > 0.972) {
      float2 ctr = (id + float2(hash(id + 1.7), hash(id + 3.1))) * cell;
      float r = cell * (0.08 + 0.2 * hash(id + 5.3));
      float a = 1.0 - smoothstep(r * 0.4, r, distance(p, ctr));
      float3 speck = h > 0.99 ? float3(0.12) : float3(0.96, 0.94, 0.9);
      c = mix(c, speck, a * uFx1.z * 0.8);
    }
  }
  if (uFx1.w > 0.001) {
    float2 d = (uv - float2(0.5, 0.45)) * (uSize / maxSide);
    float r = length(d);
    c *= mix(1.0, 0.3, smoothstep(0.18, 0.62, r) * uFx1.w);
    c += (1.0 - smoothstep(0.0, 0.3, r)) * 0.07 * uFx1.w;
  }
  if (uFinish2.x > 0.001) {
    float v = smoothstep(0.45, 1.45, length((uv - 0.5) * 2.0));
    c *= 1.0 - v * uFinish2.x * 0.75;
  }
  if (uFinish2.y > 0.001) {
    float cell = max(1.0, maxSide / 1100.0);
    c += (hash(floor(p / cell)) - 0.5) * uFinish2.y * 0.16;
  }
  return half4(half3(clamp(c, 0.0, 1.0)), 1.0);
}
`;
