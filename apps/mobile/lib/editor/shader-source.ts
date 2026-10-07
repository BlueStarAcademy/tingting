import { BEAUTY_CORE, FACE_PARTS, beautyPass, faceArgs, faceUniformDecl, perFace } from './beauty-core';

export const MAX_FACES = 3;

export { FACE_PARTS };

export const EDITOR_SHADER_SOURCE = `
uniform shader image;
uniform vec2 uSize;
uniform float uFaceCount;
uniform vec4 uBeauty1;
uniform vec4 uBeauty2;
uniform vec4 uBeauty3;
uniform vec4 uMk1;
uniform vec4 uMk2;
uniform vec3 uBlushCol;
uniform vec3 uLipCol;
uniform vec3 uShadowCol;
uniform vec3 uLinerCol;
uniform vec3 uConcealCol;
uniform vec3 uHiCol;
uniform vec4 uFinish1;
uniform vec4 uFinish2;
uniform vec4 uFx1;
uniform vec4 uFx2;
${faceUniformDecl(MAX_FACES)}

vec3 px(vec2 q) {
  return vec3(image.eval(clamp(q, vec2(0.5), uSize - vec2(0.5))).rgb);
}

${BEAUTY_CORE}

vec3 eyeMakeup(vec3 c, vec2 q, vec4 A, vec4 B, vec4 C, vec4 D) {
  vec2 le = B.xy;
  vec2 re = B.zw;
  vec2 ax = normalize(re - le);
  vec2 up = vec2(ax.y, -ax.x);
  float eyeR = D.w;
  vec2 nose = C.xy;
  vec2 d0 = (q - A.xy) / (A.zw * 1.4);
  if (dot(d0, d0) > 1.0) { return c; }
  if (uMk1.z > 0.001 || uMk1.w > 0.001 || uMk2.x > 0.001) {
    for (int k = 0; k < 2; k++) {
      vec2 e = k == 0 ? le : re;
      float side = k == 0 ? -1.0 : 1.0;
      if (uMk1.z > 0.001) {
        float a = ellipse(q, e + up * (eyeR * 0.85) + ax * (side * eyeR * 0.15), ax, up, vec2(eyeR * 1.55, eyeR * 0.75));
        vec2 el = vec2(dot(q - e, ax) / (eyeR * 1.1), dot(q - e, up) / (eyeR * 0.5));
        float protect = smoothstep(0.35, 0.8, length(el));
        c = mix(c, c * mix(vec3(1.0), uShadowCol, 0.85), clamp(a * protect * uMk1.z * 0.8, 0.0, 1.0));
      }
      if (uMk1.w > 0.001) {
        float a = ellipse(q, e + up * (eyeR * 0.36) + ax * (side * eyeR * 0.2), ax, up, vec2(eyeR * 1.1, eyeR * 0.14));
        c = mix(c, uLinerCol, clamp(a * uMk1.w * 0.85, 0.0, 1.0));
      }
      if (uMk2.x > 0.001) {
        float a = ellipse(q, e - up * (eyeR * 0.95), ax, up, vec2(eyeR * 1.25, eyeR * 0.5));
        c = mix(c, mix(c + (1.0 - c) * 0.22, uConcealCol, 0.12), clamp(a * uMk2.x, 0.0, 1.0));
      }
    }
  }
  if (uMk2.y > 0.001) {
    vec2 em = (le + re) * 0.5;
    float a = ellipse(q, mix(em, nose, 0.55), ax, up, vec2(eyeR * 0.35, distance(em, nose) * 0.6));
    a += ellipse(q, em + up * (eyeR * 2.4), ax, up, vec2(eyeR * 1.9, eyeR * 0.8)) * 0.8;
    vec3 screen = 1.0 - (1.0 - c) * (1.0 - uHiCol * 0.4);
    c = mix(c, screen, clamp(a * uMk2.y, 0.0, 1.0));
  }
  return c;
}

half4 main(float2 fragP) {
  vec2 p = fragP;
  float smoothAmt = uBeauty1.x;
  float whiten = uBeauty1.y;
  float clarity = uBeauty1.z;
  float slim = uBeauty1.w;
  vec4 b2 = uBeauty2;
  float chinAmt = uBeauty3.x;
  float tone = uBeauty3.y;
  float lipAmt = uMk1.y;
  float blushAmt = uMk1.x;
  vec3 lipCol = uLipCol;
  vec3 blushCol = uBlushCol;
  float sharpen = uFinish1.w;
  float glow = uFinish2.z;
  bool needBox = clarity > 0.001 || sharpen > 0.001;
${beautyPass(MAX_FACES)}
  if (sharpen > 0.001) {
    c += (c0 - box) * sharpen * 1.6 * (1.0 - sm);
  }

  if (uMk1.z + uMk1.w + uMk2.x + uMk2.y > 0.001) {
    ${perFace(MAX_FACES, (i) => `c = eyeMakeup(c, q, ${faceArgs(i, ['A', 'B', 'C', 'D'])});`)}
  }

  if (uFx1.y > 0.001) {
    vec2 off = (p - uSize * 0.5) / maxSide * (uFx1.y * maxSide * 0.025);
    c.r += px(q + off).r - c0.r;
    c.b += px(q - off).b - c0.b;
  }

  if (glow > 0.001) {
    c = softGlow(q, c, glow, maxSide);
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

  vec2 uv = p / uSize;
  if (uFx1.x > 0.001) {
    float d = length((p - vec2(0.0, uSize.y * 0.15)) / maxSide);
    float lk = pow(clamp(1.0 - d / 0.85, 0.0, 1.0), 2.0);
    float d2 = length((p - vec2(uSize.x, uSize.y * 0.9)) / maxSide);
    lk += pow(clamp(1.0 - d2 / 0.5, 0.0, 1.0), 2.0) * 0.6;
    vec3 lc = mix(vec3(1.0, 0.42, 0.18), vec3(1.0, 0.78, 0.35), uv.y);
    c = 1.0 - (1.0 - c) * (1.0 - lc * lk * uFx1.x * 0.9);
  }
  if (uFx2.x > 0.001) {
    vec2 sp = vec2(uSize.x * 0.82, uSize.y * 0.14);
    float d = length(p - sp) / maxSide;
    float gl = exp(-d * d * 30.0) * 0.95 + exp(-d * d * 4.0) * 0.3;
    float ringD = (d - 0.25) / 0.012;
    gl += exp(-ringD * ringD) * 0.12;
    float gd = length(p - (sp + (uSize * 0.5 - sp) * 1.4)) / maxSide / 0.035;
    gl += exp(-gd * gd) * 0.18;
    c = 1.0 - (1.0 - c) * (1.0 - vec3(1.0, 0.86, 0.62) * gl * uFx2.x);
  }
  if (uFx1.z > 0.001) {
    float cell = maxSide / 140.0;
    vec2 id = floor(p / cell);
    float h = hash(id);
    if (h > 0.972) {
      vec2 ctr = (id + vec2(hash(id + 1.7), hash(id + 3.1))) * cell;
      float r = cell * (0.08 + 0.2 * hash(id + 5.3));
      float a = 1.0 - smoothstep(r * 0.4, r, distance(p, ctr));
      vec3 speck = h > 0.99 ? vec3(0.12) : vec3(0.96, 0.94, 0.9);
      c = mix(c, speck, a * uFx1.z * 0.8);
    }
  }
  if (uFx1.w > 0.001) {
    vec2 d = (uv - vec2(0.5, 0.45)) * (uSize / maxSide);
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
