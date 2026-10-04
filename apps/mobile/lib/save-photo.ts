import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

type SavePhotoLabels = {
  permissionTitle: string;
  permissionMessage: string;
  savedTitle: string;
  savedMessage: string;
  savedMessageNamed?: (filename: string) => string;
  failed: string;
  webUnsupported: string;
};

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
const ALBUM_NAME = 'TingTing';

export function defaultPhotoFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `TingTing_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.jpg`;
}

export function sanitizePhotoFilename(name: string): string {
  const trimmed = name.trim().replace(INVALID_FILENAME_CHARS, '_');
  const base = trimmed || defaultPhotoFilename();
  const lower = base.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return base;
  const withoutExt = base.replace(/\.[^.]+$/, '');
  return `${withoutExt || 'TingTing_photo'}.jpg`;
}

async function downloadPhotoOnWeb(uri: string, filename: string): Promise<void> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

/** A `file://` copy named `filename`; MediaLibrary uses the file name as the gallery display name. */
async function materializeLocalFile(uri: string, filename: string): Promise<string> {
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) return uri;

  const target = `${cacheDir}${filename}`;
  await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  }
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1] ?? '';
    await FileSystem.writeAsStringAsync(target, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return target;
  }

  const download = await FileSystem.downloadAsync(uri, target);
  return download.uri;
}

/** 편집한 사진을 기기 갤러리(카메라 롤)에 저장 */
export async function savePhotoToGallery(uri: string, labels: SavePhotoLabels): Promise<boolean> {
  return savePhotoWithFilename(uri, defaultPhotoFilename(), labels);
}

/** 파일 이름을 지정해 저장 (웹: 다운로드 대화상자, 앱: TingTing 앨범) */
export async function savePhotoWithFilename(
  uri: string,
  filename: string,
  labels: SavePhotoLabels,
): Promise<boolean> {
  const safeName = sanitizePhotoFilename(filename);
  const successMessage = labels.savedMessageNamed?.(safeName) ?? labels.savedMessage;

  if (Platform.OS === 'web') {
    try {
      await downloadPhotoOnWeb(uri, safeName);
      Alert.alert(labels.savedTitle, successMessage);
      return true;
    } catch {
      Alert.alert(labels.failed);
      return false;
    }
  }

  try {
    await saveToDeviceAlbum(uri, safeName);
    Alert.alert(labels.savedTitle, successMessage);
    return true;
  } catch (e) {
    if (e instanceof DevicePermissionError) Alert.alert(labels.permissionTitle, labels.permissionMessage);
    else Alert.alert(labels.failed);
    return false;
  }
}

export class DevicePermissionError extends Error {}

/**
 * Save an image into the phone's "TingTing" album (native only). Throws `DevicePermissionError`
 * when photo access is denied. Uses the SDK 56 object API; the old `*Async` helpers throw there.
 */
export async function saveToDeviceAlbum(uri: string, filename = defaultPhotoFilename()): Promise<void> {
  const { Album, Asset, requestPermissionsAsync } = await import('expo-media-library');
  const perm = await requestPermissionsAsync(false, ['photo']);
  if (!perm.granted) throw new DevicePermissionError('permission');

  const localUri = await materializeLocalFile(uri, sanitizePhotoFilename(filename));
  let album = null;
  try {
    album = await Album.get(ALBUM_NAME);
  } catch {
    // limited access can hide the album; fall back to creating a new one
  }
  if (album) {
    await Asset.create(localUri, album);
    return;
  }
  try {
    await Album.create(ALBUM_NAME, [localUri], false);
  } catch {
    // Album creation can fail on some OEMs; the photo still belongs in the library.
    await Asset.create(localUri);
  }
}

/** Save several images to the TingTing album; returns how many were saved. */
export async function savePhotosToDevice(
  uris: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  let ok = 0;
  for (let i = 0; i < uris.length; i += 1) {
    try {
      const name = defaultPhotoFilename().replace(/\.jpg$/, `_${i + 1}.jpg`);
      if (Platform.OS === 'web') await downloadPhotoOnWeb(uris[i], name);
      else await saveToDeviceAlbum(uris[i], name);
      ok += 1;
    } catch (e) {
      if (e instanceof DevicePermissionError) throw e;
    }
    onProgress?.(i + 1, uris.length);
  }
  return ok;
}
