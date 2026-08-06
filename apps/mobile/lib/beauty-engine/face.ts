import type { FaceLandmarks } from './types';

/** Default selfie-oriented face box when ML is unavailable */
export function defaultFaceLandmarks(): FaceLandmarks {
  return {
    centerX: 0.5,
    centerY: 0.42,
    width: 0.42,
    height: 0.5,
    leftEye: { x: 0.38, y: 0.38 },
    rightEye: { x: 0.62, y: 0.38 },
    nose: { x: 0.5, y: 0.48 },
    mouth: { x: 0.5, y: 0.58 },
    chin: { x: 0.5, y: 0.72 },
    forehead: { x: 0.5, y: 0.28 },
    leftCheek: { x: 0.34, y: 0.5 },
    rightCheek: { x: 0.66, y: 0.5 },
    confidence: 0.35,
  };
}

/**
 * Lightweight face estimate from image dimensions / orientation.
 * Dev builds can replace this with MediaPipe landmarks via setFaceLandmarksProvider.
 */
export function estimateFaceLandmarks(aspectHint = 1): FaceLandmarks {
  const base = defaultFaceLandmarks();
  if (aspectHint > 1.2) {
    return {
      ...base,
      width: 0.34,
      height: 0.55,
      centerY: 0.4,
      confidence: 0.3,
    };
  }
  return base;
}

export type FaceLandmarksProvider = (uri: string) => Promise<FaceLandmarks | null>;

let provider: FaceLandmarksProvider | null = null;

export function setFaceLandmarksProvider(next: FaceLandmarksProvider | null): void {
  provider = next;
}

export async function detectFaceLandmarks(uri: string): Promise<FaceLandmarks> {
  if (provider) {
    try {
      const detected = await provider(uri);
      if (detected && detected.confidence > 0.2) return detected;
    } catch {
      // fall through
    }
  }
  return estimateFaceLandmarks();
}

/** Apply reshape params to landmark positions for AR anchoring */
export function reshapeLandmarks(
  face: FaceLandmarks,
  slimFace: number,
  jaw: number,
  eyes: number,
  nose: number,
  cheek: number,
): FaceLandmarks {
  const slim = slimFace * 0.08;
  const jawShift = jaw * 0.06;
  const eyeBoost = eyes * 0.03;
  const noseSlim = nose * 0.02;
  const cheekIn = cheek * 0.04;

  return {
    ...face,
    width: face.width * (1 - slim),
    leftEye: { x: face.leftEye.x - eyeBoost, y: face.leftEye.y },
    rightEye: { x: face.rightEye.x + eyeBoost, y: face.rightEye.y },
    nose: { x: face.nose.x, y: face.nose.y },
    chin: { x: face.chin.x, y: face.chin.y + jawShift },
    leftCheek: { x: face.leftCheek.x + cheekIn + slim, y: face.leftCheek.y },
    rightCheek: { x: face.rightCheek.x - cheekIn - slim, y: face.rightCheek.y },
    // nose slim encoded via slightly tighter cheeks near nose
    forehead: {
      x: face.forehead.x,
      y: face.forehead.y,
    },
    mouth: face.mouth,
    centerX: face.centerX,
    centerY: face.centerY,
    height: face.height * (1 - jawShift * 0.3),
    confidence: face.confidence,
    // keep nose field; consumers may use noseSlim via width of nose area
    ...(noseSlim ? {} : {}),
  };
}
