import { Linking, Platform } from 'react-native';
import {
  Album,
  Asset,
  AssetField,
  MediaType,
  Query,
  addListener,
  getPermissionsAsync,
  presentPermissionsPicker,
  requestPermissionsAsync,
  type PermissionResponse,
} from 'expo-media-library';

/**
 * Phone gallery access on the SDK 56 object API (`Album` / `Asset` / `Query`). The legacy
 * `getAssetsAsync`-style functions exported from 'expo-media-library' throw at runtime in SDK 56.
 * Native only: the web build swaps in PhoneAlbumTab.web.tsx and never imports this file.
 */

export type DeviceAlbum = { id: string; title: string; coverUri?: string };
export type DevicePhoto = { id: string; filename: string | null; creationTime: number | null };

/** `null` album = every photo on the device. */
export type DeviceAlbumRef = { id: string | null; title: string };

export const PHOTO_PAGE = 60;

export function getPhotoPermission(): Promise<PermissionResponse> {
  return getPermissionsAsync(false, ['photo']);
}

export function requestPhotoPermission(): Promise<PermissionResponse> {
  return requestPermissionsAsync(false, ['photo']);
}

/** Android 14+ / iOS: let the user add photos to a "selected photos only" grant. */
export async function pickMoreLimitedPhotos(): Promise<void> {
  await presentPermissionsPicker(['photo']);
}

/** Fires when photos are added/removed by any app (including our editor saves). */
export function onLibraryChange(listener: () => void): () => void {
  const sub = addListener(listener);
  return () => sub.remove();
}

export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}

/** Asset ids are `content://` (Android) or `ph://` (iOS) URIs that <Image> can show directly. */
export function photoDisplayUri(id: string): string {
  return id;
}

function imagesQuery(album: Album | null): Query {
  const q = new Query().eq(AssetField.MEDIA_TYPE, MediaType.IMAGE).orderBy({ key: AssetField.CREATION_TIME, ascending: false });
  return album ? q.album(album) : q;
}

export async function listDeviceAlbums(): Promise<DeviceAlbum[]> {
  const albums = await Album.getAll();
  const loaded = await Promise.all(
    albums.map(async (album): Promise<DeviceAlbum | null> => {
      try {
        const [title, cover] = await Promise.all([album.getTitle(), imagesQuery(album).limit(1).exeForMetadata()]);
        if (!cover[0]) return null;
        return { id: album.id, title, coverUri: photoDisplayUri(cover[0].id) };
      } catch {
        return null;
      }
    }),
  );
  return loaded
    .filter((a): a is DeviceAlbum => a !== null)
    .sort((a, b) => (a.title === 'TingTing' ? -1 : b.title === 'TingTing' ? 1 : a.title.localeCompare(b.title, 'ko')));
}

export async function allPhotosCover(): Promise<string | undefined> {
  const [first] = await imagesQuery(null).limit(1).exeForMetadata();
  return first ? photoDisplayUri(first.id) : undefined;
}

export async function listDevicePhotos(albumId: string | null, offset: number, limit = PHOTO_PAGE): Promise<DevicePhoto[]> {
  const rows = await imagesQuery(albumId ? new Album(albumId) : null)
    .offset(offset)
    .limit(limit)
    .exeForMetadata();
  return rows.map((r) => ({ id: r.id, filename: r.filename, creationTime: r.creationTime }));
}

/** A `file://` path for editing/uploading; falls back to the asset URI itself. */
export async function readableUri(id: string): Promise<string> {
  try {
    const uri = await new Asset(id).getUri();
    if (uri) return uri;
  } catch {
    // fall back to the content/ph URI
  }
  return id;
}

export function takenAtIso(photo: DevicePhoto): string | undefined {
  return photo.creationTime ? new Date(photo.creationTime).toISOString() : undefined;
}

/** Android 11+ and iOS show their own delete confirmation. */
export function systemConfirmsDelete(): boolean {
  return Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 30);
}

export async function deleteDevicePhotos(ids: string[]): Promise<void> {
  await Asset.delete(ids.map((id) => new Asset(id)));
}

/** On Android an asset lives in exactly one album, so adding moves it; iOS adds a reference. */
export async function moveToDeviceAlbum(ids: string[], albumId: string): Promise<void> {
  await new Album(albumId).add(ids.map((id) => new Asset(id)));
}

export async function copyToDeviceAlbum(ids: string[], albumId: string): Promise<number> {
  const album = new Album(albumId);
  let ok = 0;
  for (const id of ids) {
    try {
      // Android copies via the content resolver, so the content:// id works as a source.
      await Asset.create(Platform.OS === 'android' ? id : await readableUri(id), album);
      ok += 1;
    } catch {
      // keep going; caller reports the count
    }
  }
  return ok;
}

/** Android albums are folders and cannot be empty, so a new album always starts with photos. */
export async function createDeviceAlbum(name: string, ids: string[], move: boolean): Promise<DeviceAlbum> {
  const album = await Album.create(
    name,
    ids.map((id) => new Asset(id)),
    move,
  );
  return { id: album.id, title: name, coverUri: ids[0] ? photoDisplayUri(ids[0]) : undefined };
}
