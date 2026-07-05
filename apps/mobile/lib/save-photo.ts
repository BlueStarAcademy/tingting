import { Alert, Platform } from 'react-native';

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

/** 편집한 사진을 기기 갤러리(카메라 롤)에 저장 */
export async function savePhotoToGallery(uri: string, labels: SavePhotoLabels): Promise<boolean> {
  return savePhotoWithFilename(uri, defaultPhotoFilename(), labels);
}

/** 파일 이름을 지정해 저장 (웹: 다운로드 대화상자, 앱: 사진 앱) */
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

  const MediaLibrary = await import('expo-media-library');

  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(labels.permissionTitle, labels.permissionMessage);
    return false;
  }

  try {
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert(labels.savedTitle, successMessage);
    return true;
  } catch {
    Alert.alert(labels.failed);
    return false;
  }
}
