import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TabPage } from '@/components/TabPage';
import { PhotoEditorPanel } from '@/components/PhotoEditorPanel';
import { pickGalleryPhoto } from '@/lib/pick-photo';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function PhotosScreen() {
  const { t } = useLocale();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickPhoto = async () => {
    const uri = await pickGalleryPhoto({
      permissionTitle: t('visits.permissionTitle'),
      permissionMessage: t('visits.permissionMessage'),
    });
    if (uri) setPhotoUri(uri);
  };

  return (
    <TabPage contentContainerStyle={styles.page}>
      <PhotoEditorPanel
        sourceUri={photoUri}
        onSourceChange={setPhotoUri}
        onPickAnother={() => void pickPhoto()}
        showPickAnother={false}
      />
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.sm },
});
