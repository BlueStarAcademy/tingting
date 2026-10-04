import { beautyCore, beautyPass, faceUniformDecl } from './beauty-core';

/** Faces tracked in the live preview (couple selfies). */
export const CAMERA_MAX_FACES = 2;

const BEAUTY_CORE = beautyCore(2);

const UNIFORMS = `
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
${faceUniformDecl(CAMERA_MAX_FACES)}
`;

/** Shared by the GLSL program and its SkSL twin; `p` is the output pixel, top-left origin. */
const BODY = `
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
${beautyPass(CAMERA_MAX_FACES)}
  if (uFinish.w > 0.001) {
    c = softGlow(q, c, uFinish.w, maxSide);
  }
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

export const CAMERA_VERTEX_SOURCE = `#version 300 es
precision highp float;
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/**
 * expo-gl's camera texture is laid out so that screen-left maps to u = 1 and screen-top to v = 0
 * (see GLCameraObject / the Expo GL camera example), hence the x flip in `px`.
 */
export const CAMERA_FRAGMENT_SOURCE = `#version 300 es
precision highp float;
uniform sampler2D cameraTexture;
${UNIFORMS}
out vec4 fragColor;

vec3 px(vec2 q) {
  vec2 s = clamp(q, vec2(0.5), uSize - vec2(0.5)) / uSize;
  return texture(cameraTexture, vec2(1.0 - s.x, s.y)).rgb;
}

${BEAUTY_CORE}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
${BODY}
  fragColor = vec4(c, 1.0);
}`;

/** Copies the raw camera image upright into a small framebuffer for face tracking snapshots. */
export const CAMERA_RAW_FRAGMENT_SOURCE = `#version 300 es
precision mediump float;
uniform sampler2D cameraTexture;
uniform vec2 uOut;
out vec4 fragColor;
void main() {
  vec2 s = vec2(gl_FragCoord.x / uOut.x, 1.0 - gl_FragCoord.y / uOut.y);
  fragColor = vec4(texture(cameraTexture, vec2(1.0 - s.x, s.y)).rgb, 1.0);
}`;

/** The live shader body compiled as SkSL, so `scripts/check-shaders.mjs` can validate it off-device. */
export const CAMERA_SKSL_CHECK_SOURCE = `
uniform shader image;
${UNIFORMS}
vec3 px(vec2 q) {
  return vec3(image.eval(clamp(q, vec2(0.5), uSize - vec2(0.5))).rgb);
}
${BEAUTY_CORE}
half4 main(float2 fragP) {
  vec2 p = fragP;
${BODY}
  return half4(half3(c), 1.0);
}
`;
