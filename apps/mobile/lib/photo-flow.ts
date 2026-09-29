import * as ImageManipulator from 'expo-image-manipulator';
import type { Photo } from '@tingting/shared';
import { api } from '@/lib/api';
import { uploadPhotoUri as rawUpload } from '@/lib/upload-photo';

const MAX_EDGE = 2560;

const stamp = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function uploadPhotoUri(uri: string, filename: string): Promise<string> {
  let target = uri;
  try {
    const probe = await ImageManipulator.manipulateAsync(uri, []);
    const longEdge = Math.max(probe.width, probe.height);
    const resize = longEdge > MAX_EDGE
      ? [{ resize: probe.width >= probe.height ? { width: MAX_EDGE } : { height: MAX_EDGE } }]
      : [];
    const out = await ImageManipulator.manipulateAsync(uri, resize, {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    target = out.uri;
  } catch {
    // upload the untouched file if it cannot be decoded here
  }
  return rawUpload(target, filename);
}

/** Upload a new photo; the original is always kept and the edit is stored separately. */
export async function saveNewPhoto(input: {
  originalUri: string;
  editedUri?: string | null;
  placeId?: string | null;
}): Promise<Photo> {
  const id = stamp();
  const originalUrl = await uploadPhotoUri(input.originalUri, `original_${id}.jpg`);
  const editedUrl = input.editedUri ? await uploadPhotoUri(input.editedUri, `edited_${id}.jpg`) : undefined;
  return api.createPhoto({
    originalUri: originalUrl,
    editedUri: editedUrl,
    placeId: input.placeId ?? undefined,
  });
}

export async function saveEditedPhoto(photoId: string, editedLocalUri: string): Promise<Photo> {
  const editedUrl = await uploadPhotoUri(editedLocalUri, `edited_${stamp()}.jpg`);
  return api.updatePhoto(photoId, { editedUri: editedUrl });
}

/** Upload several gallery photos as-is (no edit). Returns how many succeeded. */
export async function uploadManyPhotos(
  uris: string[],
  placeId?: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  let done = 0;
  let ok = 0;
  for (const uri of uris) {
    try {
      await saveNewPhoto({ originalUri: uri, placeId });
      ok += 1;
    } catch {
      // keep going; caller reports the failed count
    }
    done += 1;
    onProgress?.(done, uris.length);
  }
  return ok;
}

export function displayUri(photo: Photo): string {
  return photo.editedUri ?? photo.originalUri;
}
