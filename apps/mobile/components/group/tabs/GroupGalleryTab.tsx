import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  FREE_GALLERY_SLOTS,
  GALLERY_SLOT_BATCH_SIZE,
  getGallerySlotUnlockCost,
  type Group,
  type Place,
  type Visit,
} from '@tingting/shared';
import { pickPhoto } from '@/lib/pick-photo';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const THUMB_SIZE = 72;
const THUMB_GAP = 8;

interface Props {
  group: Group;
  isOwner: boolean;
  regionCode: string;
  visits: Visit[];
  places: Place[];
  onUpdated: () => void;
}

export function GroupGalleryTab({ group, isOwner, regionCode, visits, places, onUpdated }: Props) {
  const { t, formatDate } = useLocale();
  const router = useRouter();
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const unlocked = group.unlockedGallerySlots ?? FREE_GALLERY_SLOTS;
  const batchCost = getGallerySlotUnlockCost();

  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime()),
    [visits]
  );

  const regionVisits = useMemo(() => {
    return sortedVisits.filter((visit) => {
      const place = places.find((p) => p.id === visit.placeId);
      return place?.regionCode === regionCode;
    });
  }, [sortedVisits, places, regionCode]);

  const selectedVisit = regionVisits.find((v) => v.id === selectedVisitId) ?? regionVisits[0] ?? null;
  const selectedPhotoUri = selectedVisit
    ? (selectedVisit.editedPhotoUri ?? selectedVisit.photoUri)
    : null;

  const confirmUnlockSlots = () => {
    Alert.alert(
      t('group.galleryUnlockTitle'),
      t('group.galleryUnlockMessage', { cost: batchCost, count: GALLERY_SLOT_BATCH_SIZE }),
      [
        { text: t('header.cancel'), style: 'cancel' },
        {
          text: t('profile.unlock'),
          onPress: async () => {
            try {
              await api.unlockGroupGallerySlots(group.id);
              onUpdated();
            } catch (e: unknown) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
            }
          },
        },
      ]
    );
  };

  const uploadForRegion = async () => {
    const regionPlaces = places.filter((p) => p.regionCode === regionCode);
    if (regionPlaces.length === 0) {
      Alert.alert(t('common.alert'), t('group.noPlacesInRegion'));
      return;
    }
    if (regionVisits.length >= unlocked) {
      Alert.alert(t('common.alert'), t('group.galleryFull'));
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
    try {
      await api.createVisit({ placeId: regionPlaces[0].id, photoUri, groupId: group.id });
      onUpdated();
      Alert.alert(t('group.certAdded'), t('group.certAddedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const showVisitActions = (visit: Visit) => {
    Alert.alert(
      places.find((p) => p.id === visit.placeId)?.name ?? t('group.unknownPlace'),
      formatDate(visit.visitedAt),
      [
        { text: t('group.editPhoto'), onPress: () => router.push(`/editor/${visit.id}` as Href) },
        {
          text: t('visits.replacePhoto'),
          onPress: async () => {
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
          },
        },
        {
          text: t('group.download'),
          onPress: () => Alert.alert(t('group.download'), visit.editedPhotoUri ?? visit.photoUri),
        },
        {
          text: t('visits.delete'),
          style: 'destructive',
          onPress: () => {
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
          },
        },
        { text: t('header.cancel'), style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.wrap}>
      {/* Photo viewer area */}
      <View style={styles.viewer}>
        {selectedPhotoUri ? (
          <Pressable style={styles.viewerInner} onLongPress={() => selectedVisit && showVisitActions(selectedVisit)}>
            <Image source={{ uri: selectedPhotoUri }} style={styles.viewerImage} resizeMode="contain" />
            {selectedVisit ? (
              <View style={styles.viewerCaption}>
                <Text style={styles.viewerCaptionText} numberOfLines={1}>
                  {places.find((p) => p.id === selectedVisit.placeId)?.name ?? ''}
                </Text>
                <Text style={styles.viewerDate}>{formatDate(selectedVisit.visitedAt)}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <View style={styles.viewerEmpty}>
            <Ionicons name="images-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.viewerEmptyText}>{t('group.galleryEmpty')}</Text>
          </View>
        )}
      </View>

      {/* Slot info */}
      <Text style={styles.slotInfo}>
        {t('group.gallerySlotCount', { used: regionVisits.length, total: unlocked })}
      </Text>

      {/* Horizontal thumbnail strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {regionVisits.map((visit) => {
          const uri = visit.editedPhotoUri ?? visit.photoUri;
          const isSelected = visit.id === (selectedVisit?.id ?? null);
          return (
            <Pressable
              key={visit.id}
              style={[styles.thumb, isSelected && styles.thumbSelected]}
              onPress={() => setSelectedVisitId(visit.id)}
              onLongPress={() => showVisitActions(visit)}
            >
              <Image source={{ uri }} style={styles.thumbImage} />
            </Pressable>
          );
        })}
        {/* Add photo button */}
        <Pressable style={[styles.thumb, styles.thumbAdd]} onPress={uploadForRegion}>
          <Ionicons name="add" size={24} color={theme.colors.primaryLight} />
        </Pressable>
        {/* Unlock more slots */}
        {isOwner ? (
          <Pressable style={[styles.thumb, styles.thumbUnlock]} onPress={confirmUnlockSlots}>
            <Ionicons name="lock-open-outline" size={18} color={theme.colors.star} />
            <Text style={styles.unlockCost}>✦ {batchCost}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  viewer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  viewerInner: { flex: 1 },
  viewerImage: { width: '100%', height: '100%' },
  viewerCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerCaptionText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  viewerDate: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  viewerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  viewerEmptyText: { color: theme.colors.textMuted, fontSize: 13 },
  slotInfo: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' },
  strip: { flexGrow: 0 },
  stripContent: { gap: THUMB_GAP, paddingHorizontal: 2, paddingVertical: 4 },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.surface,
  },
  thumbSelected: {
    borderColor: theme.colors.primaryLight,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  thumbUnlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.star,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  unlockCost: { color: theme.colors.star, fontSize: 9, fontWeight: '800' },
});
