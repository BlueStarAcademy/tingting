import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  FREE_GALLERY_SLOTS,
  GALLERY_SLOT_BATCH_SIZE,
  getGallerySlotUnlockCost,
  getRegion,
  REGIONS,
  type Group,
  type Place,
  type Visit,
} from '@tingting/shared';
import { pickPhoto } from '@/lib/pick-photo';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { useContentWidth } from '@/hooks/useContentWidth';
import { theme } from '@/constants/theme';

const COLS = 3;
const MAX_ROWS = 3;
const GAP = 8;

interface Props {
  group: Group;
  isOwner: boolean;
  visits: Visit[];
  places: Place[];
  onUpdated: () => void;
}

export function GroupGalleryTab({ group, isOwner, visits, places, onUpdated }: Props) {
  const { t, formatDate, locale } = useLocale();
  const router = useRouter();
  const [regionOpen, setRegionOpen] = useState(false);
  const [selectedRegionCode, setSelectedRegionCode] = useState('SEO');
  const contentWidth = useContentWidth();
  const horizontalPad = theme.spacing.lg * 2;
  const innerWidth = contentWidth - horizontalPad;
  const cellSize = Math.floor((innerWidth - GAP * (COLS - 1)) / COLS);
  const gridMaxHeight = MAX_ROWS * cellSize + GAP * (MAX_ROWS - 1);

  const unlocked = group.unlockedGallerySlots ?? FREE_GALLERY_SLOTS;
  const batchCost = getGallerySlotUnlockCost();
  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime()),
    [visits]
  );

  const regionVisits = useMemo(() => {
    return sortedVisits.filter((visit) => {
      const place = places.find((p) => p.id === visit.placeId);
      return place?.regionCode === selectedRegionCode;
    });
  }, [sortedVisits, places, selectedRegionCode]);

  const selectedRegion = getRegion(selectedRegionCode);
  const selectedRegionLabel =
    locale === 'en'
      ? (selectedRegion?.nameEn ?? selectedRegionCode)
      : (selectedRegion?.name ?? selectedRegionCode);

  const regionLabel = (code: string) => {
    const region = getRegion(code);
    if (!region) return code;
    return locale === 'en' ? region.nameEn : region.name;
  };

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

  const uploadPhoto = async (placeId: string) => {
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
      await api.createVisit({ placeId, photoUri, groupId: group.id });
      onUpdated();
      Alert.alert(t('group.certAdded'), t('group.certAddedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const uploadForSelectedRegion = () => {
    const regionPlaces = places.filter((p) => p.regionCode === selectedRegionCode);
    if (regionPlaces.length === 0) {
      Alert.alert(t('common.alert'), t('group.noPlacesInRegion'));
      return;
    }
    void uploadPhoto(regionPlaces[0].id);
  };

  const handleEmptySlotPress = () => {
    if (regionVisits.length >= unlocked) {
      Alert.alert(t('common.alert'), t('group.galleryFull'));
      return;
    }
    uploadForSelectedRegion();
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
        { text: t('visits.delete'), style: 'destructive', onPress: () => confirmDelete(visit) },
        { text: t('header.cancel'), style: 'cancel' },
      ]
    );
  };

  const slotCount = unlocked + (isOwner ? 1 : 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('group.tabGallery')}</Text>
        <Pressable style={styles.dropdown} onPress={() => setRegionOpen(true)}>
          <Text style={styles.dropdownText} numberOfLines={1}>
            {selectedRegionLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      <Text style={styles.sub}>
        {t('group.gallerySlotCount', { used: regionVisits.length, total: unlocked })}
      </Text>
      <ScrollView
        style={[styles.gridScroll, { width: innerWidth, maxHeight: gridMaxHeight }]}
        contentContainerStyle={[styles.grid, { width: innerWidth }]}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {Array.from({ length: slotCount }, (_, index) => {
          const isAddSlot = index === unlocked;
          const visit = regionVisits[index];

          if (isAddSlot) {
            return (
              <Pressable
                key="add-slot"
                style={[styles.cell, styles.addCell, { width: cellSize, height: cellSize }]}
                onPress={confirmUnlockSlots}
              >
                <Ionicons name="add" size={32} color={theme.colors.primaryLight} />
                <Text style={styles.addCost}>✦ {batchCost}</Text>
                <Text style={styles.addLabel}>
                  {t('group.galleryAddSlots', { count: GALLERY_SLOT_BATCH_SIZE })}
                </Text>
              </Pressable>
            );
          }

          if (visit) {
            const uri = visit.editedPhotoUri ?? visit.photoUri;
            return (
              <Pressable
                key={visit.id}
                style={[styles.cell, { width: cellSize, height: cellSize }]}
                onPress={() => showVisitActions(visit)}
              >
                <Image source={{ uri }} style={styles.photo} />
              </Pressable>
            );
          }

          return (
            <Pressable
              key={`empty-${index}`}
              style={[styles.cell, styles.emptyCell, { width: cellSize, height: cellSize }]}
              onPress={handleEmptySlotPress}
            >
              <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
              <Text style={styles.emptyLabel}>{t('group.addCertPhoto')}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={regionOpen} transparent animationType="fade" onRequestClose={() => setRegionOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setRegionOpen(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('group.gallerySelectRegion')}</Text>
          <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
            {REGIONS.map((region) => (
              <Pressable
                key={region.code}
                style={[styles.regionOpt, region.code === selectedRegionCode && styles.regionOptActive]}
                onPress={() => {
                  setSelectedRegionCode(region.code);
                  setRegionOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.regionOptText,
                    region.code === selectedRegionCode && styles.regionOptTextActive,
                  ]}
                >
                  {regionLabel(region.code)}
                </Text>
                {region.code === selectedRegionCode ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.primaryLight} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700', flexShrink: 0 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    maxWidth: '55%',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  dropdownText: { color: theme.colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  sub: { color: theme.colors.textMuted, fontSize: 13 },
  gridScroll: { alignSelf: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    alignSelf: 'center',
  },
  cell: {
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.tint.medium,
  },
  photo: { width: '100%', height: '100%' },
  emptyCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  emptyLabel: { color: theme.colors.textMuted, fontSize: 9, textAlign: 'center', paddingHorizontal: 4 },
  addCell: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  addCost: { color: theme.colors.star, fontSize: 12, fontWeight: '800' },
  addLabel: { color: theme.colors.primaryLight, fontSize: 9, fontWeight: '600', textAlign: 'center', paddingHorizontal: 4 },
  modalBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    top: '25%',
    maxHeight: '50%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  modalList: { flexGrow: 0 },
  regionOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  regionOptActive: { backgroundColor: theme.colors.tint.soft },
  regionOptText: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  regionOptTextActive: { color: theme.colors.primaryLight, fontWeight: '700' },
});
