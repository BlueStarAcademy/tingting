import { beautyCore, beautyPass, faceUniformDecl } from './beauty-core';

/** Faces tracked in the live preview (couple selfies). */
export const CAMERA_MAX_FACES = 2;

/**
 * Live shader variants, heaviest first. The camera tries them in order and keeps the first one the
 * GPU driver compiles in time; `basic` is a single texture read plus the color grade.
 */
export type CameraShaderTier = 'full' | 'lite' | 'basic';

type Variant = { beauty: boolean; maxFaces: number; rings: number; glow: boolean };

const VARIANTS: Record<CameraShaderTier, Variant> = {
  full: { beauty: true, maxFaces: CAMERA_MAX_FACES, rings: 2, glow: true },
  lite: { beauty: true, maxFaces: 1, rings: 1, glow: false },
  basic: { beauty: false, maxFaces: 0, rings: 0, glow: false },
};

const uniforms = (v: Variant) =>
  v.beauty
    ? `
uniform vec2 uSize;
uniform float uFaceCount;
uniform vec4 uBeauty1;
uniform vec4 uBeauty2;
uniform vec4 uBeauty3;
uniform vec3 uLipCol;
uniform vec3 uBlushCol;
uniform mat4 uColorMat;
uniform vec4 uColorOff;
uniform vec4 uFinish;
${faceUniformDecl(v.maxFaces)}
`
    : `
uniform vec2 uSize;
uniform mat4 uColorMat;
uniform vec4 uColorOff;
uniform vec4 uFinish;
`;

const FINISH = `
  if (uFinish.x > 0.001) {
    c = mix(c, c * 0.8 + 0.13, uFinish.x);
  }
  vec2 uv = p / uSize;
  if (uFinish.y > 0.001) {
    float v = smoothstep(0.45, 1.45, length((uv - 0.5) * 2.0));
    c *= 1.0 - v * uFinish.y * 0.75;
  }
  if (uFinish.z > 0.001) {
    float cell = max(1.0, maxSide / 1100.0);
    c += (hash(floor(p / cell)) - 0.5) * uFinish.z * 0.16;
  }
  vec4 graded = uColorMat * vec4(clamp(c, 0.0, 1.0), 1.0) + uColorOff;
  c = clamp(graded.rgb, 0.0, 1.0);
`;

const HASH = `
float hash(vec2 v) {
  return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
}
`;

/** Shared by the GLSL program and its SkSL twin; `p` is the output pixel, top-left origin. */
const body = (v: Variant) =>
  v.beauty
    ? `
  float smoothAmt = uBeauty1.x;
  float whiten = uBeauty1.y;
  float tone = uBeauty1.z;
  float slim = uBeauty1.w;
  vec4 b2 = uBeauty2;
  float chinAmt = uBeauty3.x;
  float lipAmt = uBeauty3.y;
  float blushAmt = uBeauty3.z;
  vec3 lipCol = uLipCol;
  vec3 blushCol = uBlushCol;
  bool needBox = false;
${beautyPass(v.maxFaces)}
${
  v.glow
    ? `  if (uFinish.w > 0.001) {
    c = softGlow(q, c, uFinish.w, maxSide);
  }`
    : ''
}
${FINISH}`
    : `
  vec3 c = px(p);
  float maxSide = max(uSize.x, uSize.y);
${FINISH}`;

const helpers = (v: Variant) => (v.beauty ? beautyCore(v.rings) : HASH);

export const CAMERA_VERTEX_SOURCE = `#version 300 es
precision highp float;
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/**
 * expo-gl copies the OES camera frame into a regular GL_TEXTURE_2D (GLCameraObject), so a plain
 * sampler2D is correct. That texture is laid out so that screen-left maps to u = 1 and screen-top to
 * v = 0 (see the Expo GL camera example), hence the x flip in `px`.
 */
const glslFragment = (v: Variant) => `#version 300 es
precision highp float;
precision mediump sampler2D;
uniform sampler2D cameraTexture;
${uniforms(v)}
out vec4 fragColor;

vec3 px(vec2 q) {
  vec2 s = clamp(q, vec2(0.5), uSize - vec2(0.5)) / uSize;
  return texture(cameraTexture, vec2(1.0 - s.x, s.y)).rgb;
}

${helpers(v)}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
${body(v)}
  fragColor = vec4(c, 1.0);
}`;

/** The live shader body compiled as SkSL, so `scripts/check-shaders.mjs` can validate it off-device. */
const skslCheck = (v: Variant) => `
uniform shader image;
${uniforms(v)}
vec3 px(vec2 q) {
  return vec3(image.eval(clamp(q, vec2(0.5), uSize - vec2(0.5))).rgb);
}
${helpers(v)}
half4 main(float2 fragP) {
  vec2 p = fragP;
${body(v)}
  return half4(half3(c), 1.0);
}
`;

export const CAMERA_SHADER_TIERS: { tier: CameraShaderTier; fragment: string }[] = (
  ['full', 'lite', 'basic'] as const
).map((tier) => ({ tier, fragment: glslFragment(VARIANTS[tier]) }));

/** Copies the raw camera image upright into a small framebuffer for face tracking snapshots. */
export const CAMERA_RAW_FRAGMENT_SOURCE = `#version 300 es
precision mediump float;
precision mediump sampler2D;
uniform sampler2D cameraTexture;
uniform vec2 uOut;
out vec4 fragColor;
void main() {
  vec2 s = vec2(gl_FragCoord.x / uOut.x, 1.0 - gl_FragCoord.y / uOut.y);
  fragColor = vec4(texture(cameraTexture, vec2(1.0 - s.x, s.y)).rgb, 1.0);
}`;

export const CAMERA_SKSL_CHECK_SOURCE = skslCheck(VARIANTS.full);
export const CAMERA_SKSL_CHECK_LITE_SOURCE = skslCheck(VARIANTS.lite);
export const CAMERA_SKSL_CHECK_BASIC_SOURCE = skslCheck(VARIANTS.basic);
