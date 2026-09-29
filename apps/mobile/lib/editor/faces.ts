import { Platform } from 'react-native';
import { MAX_FACES } from './shader-source';

export type Vec = { x: number; y: number };

/** Face anchors in base-image pixels. `ax` runs from the image-left eye to the image-right eye; `up` points to the forehead. */
export type FaceGeom = {
  center: Vec;
  radius: Vec;
  leftEye: Vec;
  rightEye: Vec;
  nose: Vec;
  mouth: Vec;
  mouthHalfWidth: number;
  chin: Vec;
  leftJaw: Vec;
  rightJaw: Vec;
  leftCheek: Vec;
  rightCheek: Vec;
  eyeRadius: number;
  ax: Vec;
  up: Vec;
  angle: number;
};

export type FaceDetectResult = { status: 'ok' | 'none' | 'unavailable'; faces: FaceGeom[] };

type MlPoint = { x: number; y: number };
type MlFace = {
  frame: { left: number; top: number; width: number; height: number };
  landmarks?: Partial<Record<string, { position: MlPoint }>>;
};

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const mid = (a: Vec, b: Vec, t = 0.5): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const len = (a: Vec) => Math.hypot(a.x, a.y);
const norm = (a: Vec): Vec => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};

function toGeom(face: MlFace): FaceGeom {
  const { left, top, width, height } = face.frame;
  const lm = (key: string): Vec | null => {
    const p = face.landmarks?.[key]?.position;
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : null;
  };

  let eyeA = lm('leftEye') ?? { x: left + width * 0.68, y: top + height * 0.4 };
  let eyeB = lm('rightEye') ?? { x: left + width * 0.32, y: top + height * 0.4 };
  if (eyeA.x > eyeB.x) [eyeA, eyeB] = [eyeB, eyeA];

  const eyeDist = Math.max(len(sub(eyeB, eyeA)), width * 0.2);
  const ax = norm(sub(eyeB, eyeA));
  const up = { x: ax.y, y: -ax.x };
  const down = scale(up, -1);
  const eyeMid = mid(eyeA, eyeB);

  const nose = lm('noseBase') ?? add(eyeMid, scale(down, eyeDist * 0.75));
  const mouthL = lm('mouthLeft');
  const mouthR = lm('mouthRight');
  const mouthBottom = lm('mouthBottom');
  let mouth: Vec;
  let mouthHalfWidth: number;
  if (mouthL && mouthR) {
    mouth = mid(mouthL, mouthR);
    if (mouthBottom) mouth = mid(mouth, mouthBottom, 0.3);
    mouthHalfWidth = len(sub(mouthR, mouthL)) / 2;
  } else {
    mouth = add(nose, scale(down, eyeDist * 0.45));
    mouthHalfWidth = eyeDist * 0.42;
  }

  const noseToMouth = Math.max(len(sub(mouth, nose)), eyeDist * 0.3);
  const chin = add(mouth, scale(down, noseToMouth * 1.45));

  const frameCenter = { x: left + width / 2, y: top + height / 2 };
  const halfWidth = Math.max(width * 0.47, eyeDist * 1.05);
  const faceTop = add(eyeMid, scale(up, eyeDist * 0.95));
  const center = mid(faceTop, chin);
  const halfHeight = Math.max(len(sub(chin, faceTop)) / 2, height * 0.5);
  const centerX = mid(center, frameCenter, 0.3);

  const jawLevel = add(mouth, scale(down, noseToMouth * 0.35));
  const jawReach = halfWidth * 0.8;
  const leftJaw = add(jawLevel, scale(ax, -jawReach));
  const rightJaw = add(jawLevel, scale(ax, jawReach));

  let cheekA = lm('leftCheek') ?? add(mid(eyeA, nose, 0.6), scale(ax, -eyeDist * 0.25));
  let cheekB = lm('rightCheek') ?? add(mid(eyeB, nose, 0.6), scale(ax, eyeDist * 0.25));
  if (cheekA.x > cheekB.x) [cheekA, cheekB] = [cheekB, cheekA];

  return {
    center: centerX,
    radius: { x: halfWidth, y: halfHeight },
    leftEye: eyeA,
    rightEye: eyeB,
    nose,
    mouth,
    mouthHalfWidth,
    chin,
    leftJaw,
    rightJaw,
    leftCheek: cheekA,
    rightCheek: cheekB,
    eyeRadius: eyeDist * 0.22,
    ax,
    up,
    angle: Math.atan2(ax.y, ax.x),
  };
}

type Detector = { detect: (url: string, options: Record<string, unknown>) => Promise<MlFace[]> };

let detector: Detector | null | undefined;

function loadDetector(): Detector | null {
  if (detector !== undefined) return detector;
  if (Platform.OS === 'web') {
    detector = null;
    return detector;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-ml-kit/face-detection');
    const candidate = (mod?.default ?? mod) as Detector;
    detector = typeof candidate?.detect === 'function' ? candidate : null;
  } catch {
    detector = null;
  }
  return detector;
}

/** Runs ML Kit on a local file. The base image must already have its EXIF rotation baked in. */
export async function detectFaces(localUri: string): Promise<FaceDetectResult> {
  const mlkit = loadDetector();
  if (!mlkit) return { status: 'unavailable', faces: [] };
  try {
    const found = await mlkit.detect(localUri, {
      performanceMode: 'accurate',
      landmarkMode: 'all',
      contourMode: 'none',
      classificationMode: 'none',
      minFaceSize: 0.06,
    });
    const faces = (found ?? [])
      .filter((f) => f?.frame && f.frame.width > 0)
      .sort((a, b) => b.frame.width * b.frame.height - a.frame.width * a.frame.height)
      .slice(0, MAX_FACES)
      .map(toGeom);
    return { status: faces.length > 0 ? 'ok' : 'none', faces };
  } catch {
    return { status: 'unavailable', faces: [] };
  }
}
