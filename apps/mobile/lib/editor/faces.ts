import { Platform } from 'react-native';

export type Vec = { x: number; y: number };

/** Face anchors in image pixels. `ax` runs from the image-left eye to the image-right eye; `up` points to the forehead. */
export type FaceGeom = {
  center: Vec;
  radius: Vec;
  leftEye: Vec;
  rightEye: Vec;
  nose: Vec;
  noseHalfWidth: number;
  mouth: Vec;
  mouthHalfWidth: number;
  lipHalfHeight: number;
  /**
   * Lip outline along `up`, in pixels relative to `mouth` (the centre of the outer lip box): the
   * level of the mouth corners and the inner edges of the upper and lower lip (equal when closed).
   */
  lipCorner: number;
  lipInnerTop: number;
  lipInnerBottom: number;
  /** true when ML Kit lip contours shaped the lips; otherwise they are estimated from 3 landmarks */
  lipShaped: boolean;
  chin: Vec;
  leftJaw: Vec;
  rightJaw: Vec;
  leftCheek: Vec;
  rightCheek: Vec;
  eyeRadius: number;
  ax: Vec;
  up: Vec;
  angle: number;
  /** head turn in radians; positive when the nose points toward +ax */
  yaw: number;
  /** 0 closed .. 1 clearly open */
  mouthOpen: number;
  /** ML Kit classification, -1 when not requested */
  smile: number;
  /** lower of the two eye-open probabilities, -1 when not requested */
  eyesOpen: number;
  /** true when ML Kit contours (face oval, lips, eyes) shaped the geometry */
  contoured: boolean;
};

export type FaceDetectResult = {
  status: 'ok' | 'none' | 'unavailable' | 'error';
  faces: FaceGeom[];
  error?: string;
};

export type DetectOptions = {
  /** ML Kit "fast" mode, for live tracking */
  fast?: boolean;
  /** also run contour detection (most prominent face) for precise jaw, lips and eyes */
  contours?: boolean;
  /**
   * one contour pass instead of landmarks: ML Kit then reports only the most prominent face, and
   * every anchor comes from its contours (face oval, eyes, nose, lips)
   */
  contoursOnly?: boolean;
  /** smile / eyes-open probabilities (used by AR effect triggers) */
  classify?: boolean;
  maxFaces?: number;
};

type MlPoint = { x: number; y: number };
type MlFrame = { left: number; top: number; width: number; height: number };
export type MlFace = {
  frame: MlFrame;
  landmarks?: Partial<Record<string, { position: MlPoint }>>;
  contours?: Partial<Record<string, { points: MlPoint[] }>>;
  rotationY?: number;
  smilingProbability?: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
};

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const mid = (a: Vec, b: Vec, t = 0.5): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const len = (a: Vec) => Math.hypot(a.x, a.y);
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const norm = (a: Vec): Vec => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
const valid = (p: MlPoint | undefined): p is MlPoint => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const mean = (pts: Vec[]): Vec => mul(pts.reduce(add, { x: 0, y: 0 }), 1 / pts.length);

function contour(face: MlFace, key: string, min = 1): Vec[] | null {
  const pts = face.contours?.[key]?.points?.filter(valid);
  return pts && pts.length >= min ? pts.map((p) => ({ x: p.x, y: p.y })) : null;
}

/** FaceGeom from one ML Kit face (landmarks and/or contours), in the image's pixels. */
export function toGeom(face: MlFace): FaceGeom {
  const { left, top, width, height } = face.frame;
  const lm = (key: string): Vec | null => {
    const p = face.landmarks?.[key]?.position;
    return valid(p) ? { x: p.x, y: p.y } : null;
  };

  const eyeContourA = contour(face, 'leftEye', 4);
  const eyeContourB = contour(face, 'rightEye', 4);
  let eyeA = eyeContourA ? mean(eyeContourA) : (lm('leftEye') ?? { x: left + width * 0.68, y: top + height * 0.4 });
  let eyeB = eyeContourB ? mean(eyeContourB) : (lm('rightEye') ?? { x: left + width * 0.32, y: top + height * 0.4 });
  if (eyeA.x > eyeB.x) [eyeA, eyeB] = [eyeB, eyeA];

  const eyeDist = Math.max(len(sub(eyeB, eyeA)), width * 0.2);
  const ax = norm(sub(eyeB, eyeA));
  const up = { x: ax.y, y: -ax.x };
  const down = mul(up, -1);
  const eyeMid = mid(eyeA, eyeB);
  const local = (p: Vec) => ({ x: dot(sub(p, eyeMid), ax), y: dot(sub(p, eyeMid), up) });

  let eyeRadius = eyeDist * 0.22;
  if (eyeContourA && eyeContourB) {
    const halfW = (pts: Vec[]) => {
      const xs = pts.map((p) => local(p).x);
      return (Math.max(...xs) - Math.min(...xs)) / 2;
    };
    const measured = (halfW(eyeContourA) + halfW(eyeContourB)) / 2;
    if (measured > eyeDist * 0.1 && measured < eyeDist * 0.4) eyeRadius = measured * 0.95;
  }

  const noseBottom = contour(face, 'noseBottom', 2);
  let nose = lm('noseBase') ?? add(eyeMid, mul(down, eyeDist * 0.75));
  let noseHalfWidth = eyeDist * 0.2;
  if (noseBottom) {
    nose = mean(noseBottom);
    const xs = noseBottom.map((p) => local(p).x);
    noseHalfWidth = Math.max(eyeDist * 0.12, (Math.max(...xs) - Math.min(...xs)) / 2);
  }

  let mouth: Vec;
  let mouthHalfWidth: number;
  let lipHalfHeight = 0;
  let lipCorner = 0;
  let lipInnerTop = 0;
  let lipInnerBottom = 0;
  const lipTop = contour(face, 'upperLipTop', 3);
  const lipBottom = contour(face, 'lowerLipBottom', 3);
  const innerTop = contour(face, 'upperLipBottom', 3);
  const innerBottom = contour(face, 'lowerLipTop', 3);
  const mouthL = lm('mouthLeft');
  const mouthR = lm('mouthRight');
  const lowerLip = lm('mouthBottom');
  const lipShaped = !!(lipTop && lipBottom);
  if (lipTop && lipBottom) {
    const loc = [...lipTop, ...lipBottom].map(local);
    const left = loc.reduce((a, b) => (b.x < a.x ? b : a));
    const right = loc.reduce((a, b) => (b.x > a.x ? b : a));
    const minY = Math.min(...loc.map((p) => p.y));
    const maxY = Math.max(...loc.map((p) => p.y));
    const cx = (left.x + right.x) / 2;
    const cy = (minY + maxY) / 2;
    mouth = add(eyeMid, add(mul(ax, cx), mul(up, cy)));
    mouthHalfWidth = (right.x - left.x) / 2;
    lipHalfHeight = (maxY - minY) / 2;
    lipCorner = (left.y + right.y) / 2 - cy;
    // the inner edges near the middle of the mouth, where the opening is widest
    const centerY = (pts: Vec[]) => {
      const l = pts.map(local);
      const near = l.filter((p) => Math.abs(p.x - cx) < mouthHalfWidth * 0.4);
      return mean(near.length ? near : l).y - cy;
    };
    lipInnerTop = innerTop ? centerY(innerTop) : lipCorner;
    lipInnerBottom = innerBottom ? Math.min(centerY(innerBottom), lipInnerTop) : lipInnerTop;
  } else if (mouthL && mouthR) {
    const corners = mid(mouthL, mouthR);
    mouthHalfWidth = len(sub(mouthR, mouthL)) / 2;
    const hw = mouthHalfWidth;
    // Fitted to lip contours of closed and open mouths: mouthBottom is the middle of the lower lip
    // (about 0.27 hw from either edge), the upper lip is about 0.4 hw thick, and an opening splits
    // about 1:2 above / below the corner line.
    const cornerY = local(corners).y;
    const lowerMid = lowerLip ? local(lowerLip).y : cornerY - hw * 0.35;
    const lowerInner = Math.min(cornerY, lowerMid + hw * 0.27);
    const lowerGap = Math.max(0, cornerY - lowerInner - hw * 0.06);
    const upperInner = cornerY + lowerGap * 0.5;
    const top = upperInner + hw * 0.4;
    const bottom = lowerMid - hw * 0.27;
    const cy = (top + bottom) / 2;
    const cx = local(lowerLip ? mid(corners, lowerLip, 0.3) : corners).x;
    mouth = add(eyeMid, add(mul(ax, cx), mul(up, cy)));
    lipHalfHeight = (top - bottom) / 2;
    lipCorner = cornerY - cy;
    lipInnerTop = upperInner - cy;
    lipInnerBottom = cornerY - lowerGap - cy;
  } else {
    mouth = add(nose, mul(down, eyeDist * 0.45));
    mouthHalfWidth = eyeDist * 0.42;
    lipHalfHeight = mouthHalfWidth * 0.4;
  }
  const noseToMouth = Math.max(len(sub(mouth, nose)), eyeDist * 0.3);

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  let mouthOpen = 0;
  if ((lipShaped && innerTop && innerBottom) || (!lipShaped && mouthL && mouthR && lowerLip)) {
    mouthOpen = clamp01((lipInnerTop - lipInnerBottom - eyeDist * 0.05) / (eyeDist * 0.12));
  }

  const noseOffset = local(nose).x / eyeDist;
  const yaw = Number.isFinite(face.rotationY)
    ? (Math.abs(face.rotationY as number) * Math.PI) / 180 * (noseOffset < 0 ? -1 : 1)
    : Math.asin(Math.min(0.9, Math.max(-0.9, noseOffset * 1.6)));
  const prob = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : -1);
  const eyeL = prob(face.leftEyeOpenProbability);
  const eyeR = prob(face.rightEyeOpenProbability);

  const oval = contour(face, 'face', 12);
  let center: Vec;
  let halfWidth: number;
  let halfHeight: number;
  let chin: Vec;
  let leftJaw: Vec;
  let rightJaw: Vec;
  if (oval) {
    const loc = oval.map(local);
    const lowest = loc.reduce((a, b) => (b.y < a.y ? b : a));
    const highest = loc.reduce((a, b) => (b.y > a.y ? b : a));
    halfWidth = Math.max(...loc.map((p) => Math.abs(p.x)));
    chin = add(eyeMid, add(mul(ax, lowest.x), mul(up, lowest.y)));
    const faceTopY = Math.max(highest.y, eyeDist * 0.6);
    halfHeight = (faceTopY - lowest.y) / 2;
    center = add(eyeMid, mul(up, (faceTopY + lowest.y) / 2));
    // jaw anchors sit a little below the mouth on the face outline
    const jawY = local(mouth).y - noseToMouth * 0.35;
    const side = (sign: number) => {
      const candidates = loc.filter((p) => p.x * sign > 0 && p.y < 0);
      const pick = candidates.length
        ? candidates.reduce((a, b) => (Math.abs(b.y - jawY) < Math.abs(a.y - jawY) ? b : a))
        : { x: sign * halfWidth * 0.8, y: jawY };
      // anchor slightly inside the outline so the warp grabs cheek, not background
      return add(eyeMid, add(mul(ax, pick.x * 0.92), mul(up, pick.y)));
    };
    leftJaw = side(-1);
    rightJaw = side(1);
  } else {
    chin = add(mouth, mul(down, noseToMouth * 1.45));
    const frameCenter = { x: left + width / 2, y: top + height / 2 };
    halfWidth = Math.max(width * 0.47, eyeDist * 1.05);
    const faceTop = add(eyeMid, mul(up, eyeDist * 0.95));
    halfHeight = Math.max(len(sub(chin, faceTop)) / 2, height * 0.5);
    center = mid(mid(faceTop, chin), frameCenter, 0.3);
    const jawLevel = add(mouth, mul(down, noseToMouth * 0.35));
    leftJaw = add(jawLevel, mul(ax, -halfWidth * 0.8));
    rightJaw = add(jawLevel, mul(ax, halfWidth * 0.8));
  }

  const cheekContourA = contour(face, 'leftCheek');
  const cheekContourB = contour(face, 'rightCheek');
  let cheekA = lm('leftCheek') ?? (cheekContourA ? cheekContourA[0] : add(mid(eyeA, nose, 0.6), mul(ax, -eyeDist * 0.25)));
  let cheekB = lm('rightCheek') ?? (cheekContourB ? cheekContourB[0] : add(mid(eyeB, nose, 0.6), mul(ax, eyeDist * 0.25)));
  if (cheekA.x > cheekB.x) [cheekA, cheekB] = [cheekB, cheekA];

  return {
    center,
    radius: { x: halfWidth, y: halfHeight },
    leftEye: eyeA,
    rightEye: eyeB,
    nose,
    noseHalfWidth,
    mouth,
    mouthHalfWidth,
    lipHalfHeight,
    lipCorner,
    lipInnerTop,
    lipInnerBottom,
    lipShaped,
    chin,
    leftJaw,
    rightJaw,
    leftCheek: cheekA,
    rightCheek: cheekB,
    eyeRadius,
    ax,
    up,
    angle: Math.atan2(ax.y, ax.x),
    yaw,
    mouthOpen,
    smile: prob(face.smilingProbability),
    eyesOpen: eyeL >= 0 && eyeR >= 0 ? Math.min(eyeL, eyeR) : Math.max(eyeL, eyeR),
    contoured: !!oval,
  };
}

type Detector = { detect: (url: string, options: Record<string, unknown>) => Promise<MlFace[]> };

let detector: Detector | null | undefined;
let loadError: string | undefined;

function loadDetector(): Detector | null {
  if (detector !== undefined) return detector;
  if (Platform.OS === 'web') {
    detector = null;
    loadError = 'web';
    return detector;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-ml-kit/face-detection');
    const candidate = (mod?.default ?? mod) as Detector;
    detector = typeof candidate?.detect === 'function' ? candidate : null;
    if (!detector) loadError = 'detect() missing';
  } catch (e) {
    detector = null;
    loadError = e instanceof Error ? e.message : String(e);
  }
  return detector;
}

function overlap(a: MlFrame, b: MlFrame): number {
  const x = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  const inter = x * y;
  return inter / (a.width * a.height + b.width * b.height - inter || 1);
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

/**
 * Runs ML Kit on a local image file. Landmarks are detected for every face; with `contours`
 * a second pass adds the face oval, eye and lip outlines to the most prominent face.
 * The image must already have its EXIF rotation baked in.
 */
export async function detectFaces(localUri: string, options: DetectOptions = {}): Promise<FaceDetectResult> {
  const mlkit = loadDetector();
  if (!mlkit) return { status: 'unavailable', faces: [], error: loadError };
  const performanceMode = options.fast ? 'fast' : 'accurate';
  try {
    const found = await mlkit.detect(localUri, {
      performanceMode,
      landmarkMode: options.contoursOnly ? 'none' : 'all',
      contourMode: options.contoursOnly ? 'all' : 'none',
      classificationMode: options.classify ? 'all' : 'none',
      minFaceSize: options.fast ? 0.12 : 0.06,
    });
    const faces = (found ?? [])
      .filter((f) => f?.frame && f.frame.width > 0 && (!options.contoursOnly || !!f.contours?.face))
      .sort((a, b) => b.frame.width * b.frame.height - a.frame.width * a.frame.height)
      .slice(0, options.maxFaces ?? 3);
    if (faces.length > 0 && options.contours && !options.contoursOnly) {
      try {
        const outlined = await mlkit.detect(localUri, {
          performanceMode,
          landmarkMode: 'none',
          contourMode: 'all',
          classificationMode: 'none',
          minFaceSize: 0.1,
        });
        for (const c of outlined ?? []) {
          if (!c?.frame || !c.contours) continue;
          const target = faces.find((f) => !f.contours && overlap(f.frame, c.frame) > 0.3);
          if (target) target.contours = c.contours;
        }
      } catch {
        // landmarks alone are still usable
      }
    }
    const geoms = faces.map(toGeom);
    return { status: geoms.length > 0 ? 'ok' : 'none', faces: geoms };
  } catch (e) {
    const message = errorText(e);
    const missing = /doesn't seem to be linked|not linked|native module|TurboModule/i.test(message);
    return { status: missing ? 'unavailable' : 'error', faces: [], error: message };
  }
}

const mapVec = (v: Vec, s: number): Vec => ({ x: v.x * s, y: v.y * s });

/** Uniformly rescales a face from one image size to another (same aspect ratio). */
export function scaleFace(f: FaceGeom, s: number): FaceGeom {
  return {
    ...f,
    center: mapVec(f.center, s),
    radius: mapVec(f.radius, s),
    leftEye: mapVec(f.leftEye, s),
    rightEye: mapVec(f.rightEye, s),
    nose: mapVec(f.nose, s),
    noseHalfWidth: f.noseHalfWidth * s,
    mouth: mapVec(f.mouth, s),
    mouthHalfWidth: f.mouthHalfWidth * s,
    lipHalfHeight: f.lipHalfHeight * s,
    lipCorner: f.lipCorner * s,
    lipInnerTop: f.lipInnerTop * s,
    lipInnerBottom: f.lipInnerBottom * s,
    chin: mapVec(f.chin, s),
    leftJaw: mapVec(f.leftJaw, s),
    rightJaw: mapVec(f.rightJaw, s),
    leftCheek: mapVec(f.leftCheek, s),
    rightCheek: mapVec(f.rightCheek, s),
    eyeRadius: f.eyeRadius * s,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** Exponential smoothing between two tracked faces (t = weight of the new sample). */
export function blendFace(prev: FaceGeom, next: FaceGeom, t: number): FaceGeom {
  const ax = norm(lerpV(prev.ax, next.ax, t));
  return {
    center: lerpV(prev.center, next.center, t),
    radius: lerpV(prev.radius, next.radius, t),
    leftEye: lerpV(prev.leftEye, next.leftEye, t),
    rightEye: lerpV(prev.rightEye, next.rightEye, t),
    nose: lerpV(prev.nose, next.nose, t),
    noseHalfWidth: lerp(prev.noseHalfWidth, next.noseHalfWidth, t),
    mouth: lerpV(prev.mouth, next.mouth, t),
    mouthHalfWidth: lerp(prev.mouthHalfWidth, next.mouthHalfWidth, t),
    lipHalfHeight: lerp(prev.lipHalfHeight, next.lipHalfHeight, t),
    lipCorner: lerp(prev.lipCorner, next.lipCorner, t),
    lipInnerTop: lerp(prev.lipInnerTop, next.lipInnerTop, t),
    lipInnerBottom: lerp(prev.lipInnerBottom, next.lipInnerBottom, t),
    lipShaped: next.lipShaped,
    chin: lerpV(prev.chin, next.chin, t),
    leftJaw: lerpV(prev.leftJaw, next.leftJaw, t),
    rightJaw: lerpV(prev.rightJaw, next.rightJaw, t),
    leftCheek: lerpV(prev.leftCheek, next.leftCheek, t),
    rightCheek: lerpV(prev.rightCheek, next.rightCheek, t),
    eyeRadius: lerp(prev.eyeRadius, next.eyeRadius, t),
    ax,
    up: { x: ax.y, y: -ax.x },
    angle: Math.atan2(ax.y, ax.x),
    yaw: lerp(prev.yaw, next.yaw, t),
    mouthOpen: lerp(prev.mouthOpen, next.mouthOpen, t),
    smile: prev.smile < 0 || next.smile < 0 ? next.smile : lerp(prev.smile, next.smile, t),
    eyesOpen: prev.eyesOpen < 0 || next.eyesOpen < 0 ? next.eyesOpen : lerp(prev.eyesOpen, next.eyesOpen, t),
    contoured: next.contoured,
  };
}

/** Shader uniforms (uF{i}A..H) for up to `maxFaces` faces; empty slots get harmless values. */
export function faceUniforms(faces: FaceGeom[], maxFaces: number): Record<string, number[]> {
  const u: Record<string, number[]> = {};
  for (let i = 0; i < maxFaces; i += 1) {
    const f = faces[i];
    if (!f) {
      for (const part of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) u[`uF${i}${part}`] = [0, 0, 1, 1];
      continue;
    }
    u[`uF${i}A`] = [f.center.x, f.center.y, Math.max(1, f.radius.x), Math.max(1, f.radius.y)];
    u[`uF${i}B`] = [f.leftEye.x, f.leftEye.y, f.rightEye.x, f.rightEye.y];
    u[`uF${i}C`] = [f.nose.x, f.nose.y, f.mouth.x, f.mouth.y];
    u[`uF${i}D`] = [f.chin.x, f.chin.y, Math.max(1, f.mouthHalfWidth), Math.max(1, f.eyeRadius)];
    u[`uF${i}E`] = [f.leftJaw.x, f.leftJaw.y, f.rightJaw.x, f.rightJaw.y];
    u[`uF${i}F`] = [f.leftCheek.x, f.leftCheek.y, f.rightCheek.x, f.rightCheek.y];
    u[`uF${i}G`] = [f.noseHalfWidth, f.lipHalfHeight, f.lipShaped ? 1 : 0, 0];
    u[`uF${i}H`] = [f.lipCorner, f.lipInnerTop, f.lipInnerBottom, f.mouthOpen];
  }
  return u;
}
