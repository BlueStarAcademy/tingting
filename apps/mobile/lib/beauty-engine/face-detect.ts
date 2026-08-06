import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import type { FaceLandmarks } from './types';
import { defaultFaceLandmarks, estimateFaceLandmarks } from './face';

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Improved face estimate:
 * - Uses image aspect to place a selfie-oriented face box
 * - Biases toward upper-center (typical selfie framing)
 * - Ready for MediaPipe swap-in via setFaceLandmarksProvider
 */
export async function analyzeFaceFromImage(uri: string): Promise<FaceLandmarks> {
  try {
    const size = await getImageSize(uri);
    const aspect = size.width / Math.max(size.height, 1);

    // Tiny decode to ensure URI is readable / warm caches
    await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 64 } }], {
      compress: 0.5,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const base = estimateFaceLandmarks(aspect);

    // Portrait photos: face larger & higher
    if (aspect < 0.85) {
      return {
        ...base,
        centerY: 0.38,
        width: 0.48,
        height: 0.42,
        leftEye: { x: 0.36, y: 0.34 },
        rightEye: { x: 0.64, y: 0.34 },
        nose: { x: 0.5, y: 0.45 },
        mouth: { x: 0.5, y: 0.55 },
        chin: { x: 0.5, y: 0.68 },
        forehead: { x: 0.5, y: 0.24 },
        leftCheek: { x: 0.32, y: 0.48 },
        rightCheek: { x: 0.68, y: 0.48 },
        confidence: 0.55,
      };
    }

    // Landscape: smaller centered subject
    if (aspect > 1.25) {
      return {
        ...base,
        centerX: 0.5,
        centerY: 0.45,
        width: 0.28,
        height: 0.5,
        confidence: 0.4,
      };
    }

    return { ...base, confidence: 0.5 };
  } catch {
    return defaultFaceLandmarks();
  }
}
