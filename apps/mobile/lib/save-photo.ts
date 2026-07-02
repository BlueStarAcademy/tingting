import { Alert, Platform } from 'react-native';

type SavePhotoLabels = {
  permissionTitle: string;
  permissionMessage: string;
  savedTitle: string;
  savedMessage: string;
  failed: string;
  webUnsupported: string;
};

/** 편집한 사진을 기기 갤러리(카메라 롤)에 저장 */
export async function savePhotoToGallery(uri: string, labels: SavePhotoLabels): Promise<boolean> {
  if (Platform.OS === 'web') {
    Alert.alert(labels.webUnsupported);
    return false;
  }

  const MediaLibrary = await import('expo-media-library');

  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(labels.permissionTitle, labels.permissionMessage);
    return false;
  }

  try {
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert(labels.savedTitle, labels.savedMessage);
    return true;
  } catch {
    Alert.alert(labels.failed);
    return false;
  }
}
