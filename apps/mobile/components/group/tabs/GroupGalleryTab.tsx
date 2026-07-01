import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRegion, type Place, type Visit } from '@tingting/shared';
import { pickPhoto } from '@/lib/pick-photo';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  groupId: string;
  visits: Visit[];
  places: Place[];
  onUpdated: () => void;
}

export function GroupGalleryTab({ groupId, visits, places, onUpdated }: Props) {
  const { t, formatDate } = useLocale();
  const router = useRouter();
  const [openRegion, setOpenRegion] = useState<string | null>(null);

  const byRegion = useMemo(() => {
    const map = new Map<string, Visit[]>();
    for (const v of visits) {
      const place = places.find((p) => p.id === v.placeId);
      const code = place?.regionCode ?? 'unknown';
      const list = map.get(code) ?? [];
      list.push(v);
      map.set(code, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visits, places]);

  const toggle = (code: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenRegion((prev) => (prev === code ? null : code));
  };

  const uploadForRegion = async (regionCode: string) => {
    const regionPlaces = places.filter((p) => p.regionCode === regionCode);
    if (regionPlaces.length === 0) {
      Alert.alert(t('common.alert'), t('group.noPlacesInRegion'));
      return;
    }
    const photoUri = await pickPhoto({
      upload: t('profile.uploadPhoto'),
      fromLibrary: t('visits.fromLibrary'),
      fromCamera: t('visits.fromCamera'),
      cancel: t('header.cancel'),
      libraryPermissionTitle: t('visits.permissionTitle'),
      libraryPermissionMessage: t('visits.permissionMessage'),
      cameraPermissionTitle: t('visits.cameraPermissionTitle'),
      cameraPermissionMessage: t('visits.cameraPermissionMessage'),
    });
    if (!photoUri) return;

    const placeId = regionPlaces[0].id;
    try {
      await api.createVisit({ placeId, photoUri, groupId });
      onUpdated();
      Alert.alert(t('group.certAdded'), t('group.certAddedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const confirmDelete = (visit: Visit) => {
    Alert.alert(t('visits.delete'), t('visits.deleteConfirm'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('visits.delete'),
        style: 'destructive',
        onPress: async () => {
          await api.deleteVisit(visit.id);
          onUpdated();
        },
      },
    ]);
  };

  const replacePhoto = async (visit: Visit) => {
    const photoUri = await pickPhoto({
      upload: t('visits.replacePhoto'),
      fromLibrary: t('visits.fromLibrary'),
      fromCamera: t('visits.fromCamera'),
      cancel: t('header.cancel'),
      libraryPermissionTitle: t('visits.permissionTitle'),
      libraryPermissionMessage: t('visits.permissionMessage'),
      cameraPermissionTitle: t('visits.cameraPermissionTitle'),
      cameraPermissionMessage: t('visits.cameraPermissionMessage'),
    });
    if (!photoUri) return;
    await api.replaceVisitPhoto(visit.id, photoUri);
    onUpdated();
  };

  if (byRegion.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="images-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.empty}>{t('group.galleryEmpty')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {byRegion.map(([code, regionVisits]) => {
        const region = getRegion(code);
        const isOpen = openRegion === code;
        return (
          <View key={code} style={styles.section}>
            <Pressable style={styles.header} onPress={() => toggle(code)}>
              <View style={styles.headerLeft}>
                <View style={[styles.dot, { backgroundColor: region?.color ?? theme.colors.primary }]} />
                <Text style={styles.regionName}>{region?.name ?? code}</Text>
                <Text style={styles.count}>{regionVisits.length}</Text>
              </View>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textMuted}
              />
            </Pressable>

            {isOpen ? (
              <View style={styles.body}>
                <Pressable style={styles.addBtn} onPress={() => uploadForRegion(code)}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.primaryLight} />
                  <Text style={styles.addText}>{t('group.addCertPhoto')}</Text>
                </Pressable>
                {regionVisits.map((v) => {
                  const place = places.find((p) => p.id === v.placeId);
                  const uri = v.editedPhotoUri ?? v.photoUri;
                  return (
                    <View key={v.id} style={styles.visitRow}>
                      <Image source={{ uri }} style={styles.thumb} />
                      <View style={styles.visitInfo}>
                        <Text style={styles.placeName}>{place?.name ?? t('group.unknownPlace')}</Text>
                        <Text style={styles.date}>{formatDate(v.visitedAt)}</Text>
                        <View style={styles.actions}>
                          <Pressable onPress={() => router.push(`/editor/${v.id}` as Href)}>
                            <Text style={styles.action}>{t('group.editPhoto')}</Text>
                          </Pressable>
                          <Pressable onPress={() => replacePhoto(v)}>
                            <Text style={styles.action}>{t('visits.replacePhoto')}</Text>
                          </Pressable>
                          <Pressable onPress={() => Alert.alert(t('group.download'), uri)}>
                            <Text style={styles.action}>{t('group.download')}</Text>
                          </Pressable>
                          <Pressable onPress={() => confirmDelete(v)}>
                            <Text style={[styles.action, styles.danger]}>{t('visits.delete')}</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  emptyWrap: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: theme.spacing.sm },
  empty: { color: theme.colors.textMuted, textAlign: 'center' },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.tint.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  regionName: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  count: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: theme.colors.tint.medium,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  body: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md, gap: theme.spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addText: { color: theme.colors.primaryLight, fontWeight: '600' },
  visitRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  thumb: { width: 72, height: 72, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceLight },
  visitInfo: { flex: 1, gap: 4 },
  placeName: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  date: { color: theme.colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  action: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '600' },
  danger: { color: '#f87171' },
});
