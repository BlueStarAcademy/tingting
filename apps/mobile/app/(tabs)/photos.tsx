import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabPage } from '@/components/TabPage';
import { PremiumButton } from '@/components/PremiumButton';
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

  if (!photoUri) {
    return (
      <TabPage contentContainerStyle={styles.page}>
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={56} color={theme.colors.textSubtle} />
          <Text style={styles.emptyTitle}>{t('photos.emptyTitle')}</Text>
          <Text style={styles.emptySub}>{t('photos.emptySub')}</Text>
          <PremiumButton title={t('photos.pickFromGallery')} onPress={pickPhoto} />
        </View>
      </TabPage>
    );
  }

  return (
    <TabPage contentContainerStyle={styles.page}>
      <PhotoEditorPanel
        sourceUri={photoUri}
        onSourceChange={setPhotoUri}
        onPickAnother={() => void pickPhoto()}
      />
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.sm },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl * 2,
    gap: theme.spacing.md,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  emptySub: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: theme.spacing.lg,
  },
});
