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

async function pickFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    defaultTab: 'photos',
    legacy: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

/** 갤러리에서 사진 1장 선택 (앨범 전용) */
export async function pickGalleryPhoto(labels: {
  permissionTitle: string;
  permissionMessage: string;
}): Promise<string | null> {
  const uri = await pickFromLibrary();
  if (uri === null) {
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(labels.permissionTitle, labels.permissionMessage);
    }
  }
  return uri;
}

async function pickFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

/** 앨범 또는 카메라에서 사진을 선택합니다. */
export function pickPhoto(labels: PickPhotoLabels): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(labels.upload, undefined, [
      {
        text: labels.fromLibrary,
        onPress: async () => {
          const uri = await pickFromLibrary();
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
