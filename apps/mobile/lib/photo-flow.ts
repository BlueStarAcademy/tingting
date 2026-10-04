import * as ImageManipulator from 'expo-image-manipulator';
import type { AlbumTarget, Photo } from '@tingting/shared';
import { api } from '@/lib/api';
import { uploadPhotoUri as rawUpload } from '@/lib/upload-photo';

const MAX_EDGE = 2560;

const stamp = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/** Where a new photo is filed: a place (its region album by default), a region album or a folder. */
export type PhotoPlacement = {
  placeId?: string | null;
  regionCode?: string | null;
  folderId?: string | null;
};

export function placementFromTarget(target: AlbumTarget): PhotoPlacement {
  if (target.kind === 'region') return { regionCode: target.regionCode };
  if (target.kind === 'folder') return { folderId: target.folderId };
  return {};
}

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
export async function saveNewPhoto(
  input: { originalUri: string; editedUri?: string | null; takenAt?: string } & PhotoPlacement,
): Promise<Photo> {
  const id = stamp();
  const originalUrl = await uploadPhotoUri(input.originalUri, `original_${id}.jpg`);
  const editedUrl = input.editedUri ? await uploadPhotoUri(input.editedUri, `edited_${id}.jpg`) : undefined;
  return api.createPhoto({
    originalUri: originalUrl,
    editedUri: editedUrl,
    placeId: input.placeId ?? undefined,
    regionCode: input.regionCode ?? undefined,
    folderId: input.folderId ?? undefined,
    takenAt: input.takenAt,
  });
}

/** Edits are uploaded as a new file, never written over the old one, so MYBOX backups and caches stay valid. */
export async function saveEditedPhoto(photoId: string, editedLocalUri: string): Promise<Photo> {
  const editedUrl = await uploadPhotoUri(editedLocalUri, `edited_${stamp()}.jpg`);
  return api.updatePhoto(photoId, { editedUri: editedUrl });
}

/** Upload several photos as-is (no edit). Returns how many succeeded. */
export async function uploadPhotosTo(
  items: { uri: string; takenAt?: string }[],
  placement: PhotoPlacement,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  let done = 0;
  let ok = 0;
  for (const item of items) {
    try {
      await saveNewPhoto({ originalUri: item.uri, takenAt: item.takenAt, ...placement });
      ok += 1;
    } catch {
      // keep going; caller reports the failed count
    }
    done += 1;
    onProgress?.(done, items.length);
  }
  return ok;
}

/** Upload several gallery photos as-is (no edit). Returns how many succeeded. */
export function uploadManyPhotos(
  uris: string[],
  placeId?: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  return uploadPhotosTo(
    uris.map((uri) => ({ uri })),
    { placeId },
    onProgress,
  );
}

export function displayUri(photo: Photo): string {
  return photo.editedUri ?? photo.originalUri;
}
