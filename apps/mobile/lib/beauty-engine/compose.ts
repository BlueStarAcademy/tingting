import type { RefObject } from 'react';
import type { View } from 'react-native';
import { capturePreviewUri } from '@/lib/capture-preview';
import { normalizePhotoUri } from '@/lib/photo-effects';
import type { BeautyParams, MakeupParams } from './types';
import { DEFAULT_BEAUTY, DEFAULT_MAKEUP } from './types';

export function beautyHasActiveEdits(input: {
  filterId?: string | null;
  frameId?: string | null;
  effects?: string[];
  stickers?: number;
  adjustmentsChanged?: boolean;
  beauty?: BeautyParams;
  makeup?: MakeupParams;
  lensId?: string | null;
}): boolean {
  if (input.filterId || input.frameId) return true;
  if ((input.effects?.length ?? 0) > 0) return true;
  if ((input.stickers ?? 0) > 0) return true;
  if (input.adjustmentsChanged) return true;
  if (input.lensId && input.lensId !== 'lens_none') return true;
  const beauty = input.beauty ?? DEFAULT_BEAUTY;
  if (Object.values(beauty).some((v) => Math.abs(v) > 0.01)) return true;
  const makeup = input.makeup ?? DEFAULT_MAKEUP;
  if (Object.values(makeup).some((v) => Math.abs(v) > 0.01)) return true;
  return false;
}

/** Flatten preview into a durable JPEG URI (Skia export or view-shot capture). */
export async function composeBeautyPreview(
  previewRef: RefObject<View | null>,
  workingUri: string,
  mustCapture: boolean,
  size: { width: number; height: number },
  skiaExport?: () => Promise<string>,
): Promise<string> {
  if (skiaExport) {
    try {
      const skiaUri = await skiaExport();
      try {
        return await normalizePhotoUri(skiaUri);
      } catch {
        return skiaUri;
      }
    } catch {
      // fall through to view-shot
    }
  }
  const captured = await capturePreviewUri(previewRef, workingUri, {
    mustCapture,
    width: size.width,
    height: size.height,
  });
  try {
    return await normalizePhotoUri(captured);
  } catch {
    return captured;
  }
}
