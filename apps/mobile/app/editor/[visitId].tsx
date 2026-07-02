import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { PhotoEditorPanel } from '@/components/PhotoEditorPanel';
import { api } from '@/lib/api';
import type { Visit } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';

export default function EditorScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [visit, setVisit] = useState<Visit | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.getVisit(visitId).then(setVisit);
    }, [visitId]),
  );

  const deleteVisit = () => {
    if (!visit) return;
    Alert.alert(t('visits.delete'), t('visits.deleteConfirm'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('visits.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteVisit(visit.id);
            router.back();
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
          }
        },
      },
    ]);
  };

  if (!visit) return null;

  const photoUri = visit.editedPhotoUri ?? visit.photoUri;

  return (
    <AppScreen title={t('editor.title')} showBack contentStyle={{ gap: 0 }}>
      <PhotoEditorPanel
        sourceUri={photoUri}
        showPickAnother={false}
        saveLabel={t('editor.save')}
        onSave={async (uri) => {
          await api.updateVisit(visit.id, { editedPhotoUri: uri });
          Alert.alert(t('editor.saved'), t('editor.savedMessage'));
          router.back();
        }}
      />
      <PremiumButton title={t('editor.deleteVisit')} onPress={deleteVisit} variant="outline" />
    </AppScreen>
  );
}
