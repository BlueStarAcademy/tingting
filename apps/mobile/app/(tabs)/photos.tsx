import { useState } from 'react';
import { Modal, StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { TabPage } from '@/components/TabPage';
import { PhotoEditorPanel } from '@/components/PhotoEditorPanel';
import { BeautyCameraScreen } from '@/components/beauty/BeautyCameraScreen';
import { pickGalleryPhoto } from '@/lib/pick-photo';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function PhotosScreen() {
  const { t } = useLocale();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const pickPhoto = async () => {
    const uri = await pickGalleryPhoto({
      permissionTitle: t('visits.permissionTitle'),
      permissionMessage: t('visits.permissionMessage'),
    });
    if (uri) setPhotoUri(uri);
  };

  return (
    <TabPage contentContainerStyle={styles.page} scrollEnabled={!scrollLocked}>
      <View style={styles.sourceRow}>
        <Pressable style={styles.sourceBtn} onPress={() => setCameraOpen(true)}>
          <Ionicons name="camera-outline" size={18} color={theme.colors.primaryDark} />
          <Text style={styles.sourceBtnText}>{t('photos.shoot')}</Text>
        </Pressable>
        <Pressable style={styles.sourceBtn} onPress={() => void pickPhoto()}>
          <Ionicons name="images-outline" size={18} color={theme.colors.primaryDark} />
          <Text style={styles.sourceBtnText}>{t('photos.pickFromGallery')}</Text>
        </Pressable>
      </View>
      {Platform.OS === 'web' ? (
        <Text style={styles.hint}>{t('photos.liveCameraDevClient')}</Text>
      ) : null}

      <PhotoEditorPanel
        sourceUri={photoUri}
        onSourceChange={setPhotoUri}
        onPickAnother={() => void pickPhoto()}
        showPickAnother={false}
        saveToDevice
        onScrollLockChange={setScrollLocked}
      />

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <BeautyCameraScreen
          onClose={() => setCameraOpen(false)}
          onCapture={(uri) => {
            setPhotoUri(uri);
            setCameraOpen(false);
          }}
        />
      </Modal>
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.sm },
  sourceRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  sourceBtnText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  hint: {
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
