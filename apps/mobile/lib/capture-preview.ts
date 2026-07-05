import { findNodeHandle, Platform } from 'react-native';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';

const CAPTURE_TIMEOUT_MS = 12_000;
const CAPTURE_RETRIES = 2;

export type CapturePreviewOptions = {
  /** 편집 레이어가 있을 때 원본으로 대체하지 않음 */
  mustCapture?: boolean;
  width?: number;
  height?: number;
};

/** UI 갱신(선택 해제·스티커 등)이 반영될 때까지 대기 */
export async function waitForPaintFrames(count = 3): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('capture timeout')), ms);
    }),
  ]);
}

async function captureWebNode(node: unknown, quality = 0.92): Promise<string> {
  const html2canvas = (await import('html2canvas')).default;
  const element = node as HTMLElement;
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    scale: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    logging: false,
  });
  return canvas.toDataURL('image/jpeg', quality);
}

async function tryCapture(
  ref: RefObject<View | null>,
  width?: number,
  height?: number,
): Promise<string> {
  const captureOptions = {
    format: 'jpg' as const,
    quality: 0.92,
    result: Platform.OS === 'web' ? ('data-uri' as const) : ('tmpfile' as const),
    ...(width && width > 0 ? { width: Math.round(width) } : null),
    ...(height && height > 0 ? { height: Math.round(height) } : null),
  };

  try {
    return await captureRef(ref, captureOptions);
  } catch (primaryError) {
    if (Platform.OS !== 'web' || !ref.current) throw primaryError;
    const node = findNodeHandle(ref.current);
    if (!node) throw primaryError;
    return captureWebNode(node, captureOptions.quality);
  }
}

/** 미리보기 뷰를 JPEG로 래스터화. 편집(스티커·필터 등)을 포함하려면 mustCapture 사용 */
export async function capturePreviewUri(
  ref: RefObject<View | null>,
  fallbackUri: string,
  options: CapturePreviewOptions = {},
): Promise<string> {
  const { mustCapture = false, width, height } = options;

  if (!fallbackUri) return fallbackUri;
  if (!ref.current) {
    if (mustCapture) throw new Error('preview ref missing');
    return fallbackUri;
  }

  await waitForPaintFrames(2);

  let lastError: unknown;
  for (let attempt = 0; attempt <= CAPTURE_RETRIES; attempt += 1) {
    if (attempt > 0) await waitForPaintFrames(3);
    try {
      return await withTimeout(tryCapture(ref, width, height), CAPTURE_TIMEOUT_MS);
    } catch (error) {
      lastError = error;
    }
  }

  if (mustCapture) throw lastError ?? new Error('capture failed');
  return fallbackUri;
}
