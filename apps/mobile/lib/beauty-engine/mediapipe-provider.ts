import { Platform } from 'react-native';
import type { FaceLandmarks } from './types';
import { analyzeFaceFromImage } from './face-detect';
import { estimateFaceLandmarks } from './face';

/**
 * Face landmarker bridge.
 * Dev Client can later inject MediaPipe 478-point results via `registerNativeFaceDetector`.
 */
type NativeDetector = (uri: string) => Promise<FaceLandmarks | null>;

let nativeDetector: NativeDetector | null = null;

export function registerNativeFaceDetector(detector: NativeDetector | null): void {
  nativeDetector = detector;
}

async function detectNativeFace(uri: string): Promise<FaceLandmarks | null> {
  if (!nativeDetector) return null;
  return nativeDetector(uri);
}

export async function mediapipeFaceProvider(uri: string): Promise<FaceLandmarks | null> {
  if (Platform.OS === 'web') {
    return analyzeFaceFromImage(uri);
  }
  try {
    const native = await detectNativeFace(uri);
    if (native && native.confidence > 0.2) {
      return { ...native, confidence: Math.max(native.confidence, 0.7) };
    }
  } catch {
    // fall through
  }
  try {
    return await analyzeFaceFromImage(uri);
  } catch {
    return estimateFaceLandmarks(1);
  }
}
