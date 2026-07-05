import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

type PickPhotoLabels = {
  upload: string;
  fromLibrary: string;
  fromCamera: string;
  cancel: string;
  libraryPermissionTitle: string;
  libraryPermissionMessage: string;
  cameraPermissionTitle: string;
  cameraPermissionMessage: string;
};

async function pickFromLibrary(maxCount = 1): Promise<string[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsMultipleSelection: maxCount > 1,
    selectionLimit: maxCount,
    defaultTab: 'photos',
    legacy: false,
  });
  if (result.canceled || result.assets.length === 0) return [];
  return result.assets.map((asset) => asset.uri);
}

/** 갤러리에서 사진 1장 선택 (앨범 전용) */
export async function pickGalleryPhoto(labels: {
  permissionTitle: string;
  permissionMessage: string;
}): Promise<string | null> {
  const uris = await pickFromLibrary(1);
  if (uris.length === 0) {
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(labels.permissionTitle, labels.permissionMessage);
    }
    return null;
  }
  return uris[0];
}

/** 갤러리에서 사진 여러 장 선택 (최대 maxCount장) */
export async function pickGalleryPhotos(
  maxCount: number,
  labels: {
    permissionTitle: string;
    permissionMessage: string;
  },
): Promise<string[]> {
  if (maxCount <= 0) return [];
  const uris = await pickFromLibrary(maxCount);
  if (uris.length === 0) {
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(labels.permissionTitle, labels.permissionMessage);
    }
  }
  return uris;
}

async function pickFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

/** 카메라로 사진 1장 촬영 */
export async function pickCameraPhoto(labels: {
  permissionTitle: string;
  permissionMessage: string;
}): Promise<string | null> {
  const uri = await pickFromCamera();
  if (uri === null) {
    const perm = await ImagePicker.getCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(labels.permissionTitle, labels.permissionMessage);
    }
    return null;
  }
  return uri;
}

/** 앨범 또는 카메라에서 사진을 선택합니다. */
export function pickPhoto(labels: PickPhotoLabels): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(labels.upload, undefined, [
      {
        text: labels.fromLibrary,
        onPress: async () => {
          const uris = await pickFromLibrary(1);
          const uri = uris[0] ?? null;
          if (uri === null) {
            const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert(labels.libraryPermissionTitle, labels.libraryPermissionMessage);
            }
          }
          resolve(uri);
        },
      },
      {
        text: labels.fromCamera,
        onPress: async () => {
          const uri = await pickFromCamera();
          if (uri === null) {
            const perm = await ImagePicker.getCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert(labels.cameraPermissionTitle, labels.cameraPermissionMessage);
            }
          }
          resolve(uri);
        },
      },
      { text: labels.cancel, style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
