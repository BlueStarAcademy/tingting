import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { BaseImage } from './types';

export const EDIT_MAX_EDGE = 2560;

const stamp = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function cacheDir(): string {
  return FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
}

async function ensureLocal(uri: string): Promise<string> {
  if (!/^https?:\/\//i.test(uri)) return uri;
  const target = `${cacheDir()}edit_src_${stamp()}.jpg`;
  const result = await FileSystem.downloadAsync(uri, target);
  if (result.status >= 400) throw new Error('사진을 불러오지 못했어요');
  return result.uri;
}

/** Local JPEG with EXIF rotation baked in and a bounded size, so ML Kit and Skia see the same pixels. */
export async function prepareBaseImage(uri: string): Promise<BaseImage> {
  const local = await ensureLocal(uri);
  const probe = await ImageManipulator.manipulateAsync(local, []);
  const longEdge = Math.max(probe.width, probe.height);
  const actions: ImageManipulator.Action[] =
    longEdge > EDIT_MAX_EDGE
      ? [{ resize: probe.width >= probe.height ? { width: EDIT_MAX_EDGE } : { height: EDIT_MAX_EDGE } }]
      : [];
  const out = await ImageManipulator.manipulateAsync(local, actions, {
    compress: 0.95,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: out.uri, width: out.width, height: out.height };
}

export type CropBox = { x: number; y: number; width: number; height: number };

export async function transformBase(
  base: BaseImage,
  op: { rotate?: number; flip?: 'horizontal' | 'vertical'; crop?: CropBox },
): Promise<BaseImage> {
  const actions: ImageManipulator.Action[] = [];
  if (op.rotate) actions.push({ rotate: op.rotate });
  if (op.flip) {
    actions.push({
      flip: op.flip === 'horizontal' ? ImageManipulator.FlipType.Horizontal : ImageManipulator.FlipType.Vertical,
    });
  }
  if (op.crop) {
    const originX = Math.max(0, Math.round(op.crop.x * base.width));
    const originY = Math.max(0, Math.round(op.crop.y * base.height));
    const width = Math.min(base.width - originX, Math.max(8, Math.round(op.crop.width * base.width)));
    const height = Math.min(base.height - originY, Math.max(8, Math.round(op.crop.height * base.height)));
    actions.push({ crop: { originX, originY, width, height } });
  }
  const out = await ImageManipulator.manipulateAsync(base.uri, actions, {
    compress: 0.95,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: out.uri, width: out.width, height: out.height };
}

export async function writeJpegBase64(base64: string): Promise<string> {
  const target = `${cacheDir()}edited_${stamp()}.jpg`;
  await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 });
  return target;
}
