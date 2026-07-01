import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumButton } from '@/components/PremiumButton';
import { TabPage } from '@/components/TabPage';
import { api } from '@/lib/api';
import { pickPhoto } from '@/lib/pick-photo';
import type { Visit, Place } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function VisitsScreen() {
  const router = useRouter();
  const { t, formatDate } = useLocale();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setVisits(await api.getVisits());
    setPlaces(await api.getPlaces());
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const createVisitWithPhoto = async (photoUri: string, placeId: string) => {
    setUploading(true);
    try {
      const visit = await api.createVisit({ placeId, photoUri });
      await load();
      router.push(`/editor/${visit.id}` as Href);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setUploading(false);
    }
  };

  const choosePlaceAndUpload = (photoUri: string) => {
    if (places.length === 0) {
      Alert.alert(t('visits.noPlaces'), t('visits.noPlacesMessage'));
      return;
    }
    if (places.length === 1) {
      createVisitWithPhoto(photoUri, places[0].id);
      return;
    }
    Alert.alert(
      t('visits.selectPlace'),
      undefined,
      [
        ...places.slice(0, 6).map((p) => ({
          text: p.name,
          onPress: () => createVisitWithPhoto(photoUri, p.id),
        })),
        { text: t('header.cancel'), style: 'cancel' as const },
      ]
    );
  };

  const uploadPhoto = async () => {
    const photoUri = await pickPhoto({
      upload: t('visits.upload'),
      fromLibrary: t('visits.fromLibrary'),
      fromCamera: t('visits.fromCamera'),
      cancel: t('header.cancel'),
      libraryPermissionTitle: t('visits.permissionTitle'),
      libraryPermissionMessage: t('visits.permissionMessage'),
      cameraPermissionTitle: t('visits.cameraPermissionTitle'),
      cameraPermissionMessage: t('visits.cameraPermissionMessage'),
    });
    if (!photoUri) return;
    choosePlaceAndUpload(photoUri);
  };

  const confirmDelete = (visit: Visit) => {
    Alert.alert(t('visits.delete'), t('visits.deleteConfirm'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('visits.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteVisit(visit.id);
            await load();
            Alert.alert(t('visits.deleted'), t('visits.deletedMessage'));
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
          }
        },
      },
    ]);
  };

  return (
    <TabPage contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>{t('visits.title')}</Text>
      <PremiumButton title={t('visits.recordNew')} onPress={uploadPhoto} loading={uploading} />

      {visits.length === 0 ? (
        <Text style={styles.empty}>{t('visits.empty')}</Text>
      ) : (
        visits.map((v) => {
          const place = places.find((p) => p.id === v.placeId);
          return (
            <View key={v.id} style={styles.card}>
              <Pressable style={styles.cardBody} onPress={() => router.push(`/editor/${v.id}` as Href)}>
                <Image source={{ uri: v.editedPhotoUri ?? v.photoUri }} style={styles.img} />
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>{place?.name ?? v.placeId}</Text>
                  <Text style={styles.date}>{formatDate(v.visitedAt)}</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => confirmDelete(v)}
                accessibilityLabel={t('visits.delete')}
              >
                <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
              </Pressable>
            </View>
          );
        })
      )}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 0, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '800', marginBottom: theme.spacing.sm },
  empty: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: theme.spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  cardBody: { flex: 1, flexDirection: 'row', minWidth: 0 },
  img: { width: 90, height: 90, flexShrink: 0 },
  info: { flex: 1, minWidth: 0, padding: theme.spacing.md, justifyContent: 'center' },
  name: { color: theme.colors.text, fontWeight: '600', fontSize: 16 },
  date: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
  deleteBtn: {
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
