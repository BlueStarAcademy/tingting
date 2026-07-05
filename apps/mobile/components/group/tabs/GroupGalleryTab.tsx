import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  FREE_GALLERY_SLOTS,
  GALLERY_SLOT_BATCH_SIZE,
  buildGroupStationQuestId,
  getGallerySlotUnlockCost,
  type Group,
  type Place,
  type Quest,
  type Visit,
} from '@tingting/shared';
import { pickGalleryPhotos, pickCameraPhoto, pickPhoto } from '@/lib/pick-photo';
import { savePhotoToGallery } from '@/lib/save-photo';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { PhotoEditorPanel } from '@/components/PhotoEditorPanel';
import { StarAmount } from '@/components/StarAmount';
import { theme } from '@/constants/theme';

const THUMB_SIZE = 72;
const THUMB_GAP = 8;

type GallerySubTab = 'shared' | 'personal';

interface Props {
  group: Group;
  isOwner: boolean;
  regionCode: string;
  quests: Quest[];
  visits: Visit[];
  places: Place[];
  onUpdated: () => void;
}

export function GroupGalleryTab({ group, isOwner, regionCode, quests, visits, places, onUpdated }: Props) {
  const { t, formatDate } = useLocale();
  const { session } = useAuth();
  const router = useRouter();
  const [subTab, setSubTab] = useState<GallerySubTab>('shared');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewPublic, setReviewPublic] = useState(true);
  const [savingReview, setSavingReview] = useState(false);
  const [sharedUploading, setSharedUploading] = useState(false);
  const [editorQueue, setEditorQueue] = useState<string[]>([]);
  const [editorIndex, setEditorIndex] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);

  const regionQuestCompleted = quests.some(
    (quest) =>
      quest.id === buildGroupStationQuestId(regionCode) &&
      quest.regionCode === regionCode &&
      quest.completed,
  );
  const unlocked = (regionQuestCompleted ? FREE_GALLERY_SLOTS : 0) + (group.unlockedGallerySlots ?? 0);
  const batchCost = getGallerySlotUnlockCost();
  const members = useMemo(() => {
    if (group.members && group.members.length > 0) return group.members;
    return (group.memberIds ?? []).map((id) => ({
      id,
      displayName: id === group.ownerId ? t('group.owner') : t('group.memberFallback'),
      isOwner: id === group.ownerId,
    }));
  }, [group.memberIds, group.members, group.ownerId, t]);
  const ownerMember = members.find((member) => member.id === group.ownerId);
  const delegatedUploader = group.sharedGalleryUploaderId
    ? members.find((member) => member.id === group.sharedGalleryUploaderId) ?? null
    : null;
  const sharedUploaderId = delegatedUploader?.id ?? group.ownerId;
  const sharedUploaderName = delegatedUploader?.displayName ?? ownerMember?.displayName ?? t('group.owner');
  const canUploadShared = session?.userId === sharedUploaderId;
  const canManageSharedUploader = isOwner && subTab === 'shared';

  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()),
    [visits]
  );

  const regionVisits = useMemo(() => {
    return sortedVisits.filter((visit) => {
      const place = places.find((p) => p.id === visit.placeId);
      return place?.regionCode === regionCode;
    });
  }, [sortedVisits, places, regionCode]);

  const sharedPhotos = useMemo(
    () => regionVisits.filter((v) => v.isSharedGallery),
    [regionVisits]
  );

  const personalPhotos = useMemo(
    () => regionVisits.filter((v) => !v.isSharedGallery && v.userId === session?.userId),
    [regionVisits, session?.userId]
  );

  const activePhotos = subTab === 'shared' ? sharedPhotos : personalPhotos;
  const selectedVisit = activePhotos.find((v) => v.id === selectedVisitId) ?? activePhotos[0] ?? null;
  const selectedPhotoUri = selectedVisit
    ? (selectedVisit.editedPhotoUri ?? selectedVisit.photoUri)
    : null;
  const selectedPhotoIndex = selectedVisit ? activePhotos.findIndex((visit) => visit.id === selectedVisit.id) : -1;
  const selectedPhotoPosition = selectedPhotoIndex >= 0 ? selectedPhotoIndex + 1 : 0;
  const slotCount = unlocked;
  const remainingSharedSlots = Math.max(0, unlocked - sharedPhotos.length);

  const canStartSharedUpload = canUploadShared && remainingSharedSlots > 0 && !sharedUploading;
  const canStartPersonalUpload = personalPhotos.length < unlocked;

  const handleViewerPress = () => {
    if (subTab === 'shared') {
      if (canStartSharedUpload) startSharedUpload();
      return;
    }
    if (canStartPersonalUpload) void uploadPersonalPhoto();
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

  const openSharedEditor = (uris: string[]) => {
    if (uris.length === 0) return;
    setEditorQueue(uris);
    setEditorIndex(0);
    setEditorOpen(true);
  };

  const closeSharedEditor = () => {
    if (sharedUploading) return;
    setEditorOpen(false);
    setEditorQueue([]);
    setEditorIndex(0);
  };

  const confirmCloseSharedEditor = () => {
    if (sharedUploading) return;
    Alert.alert(t('group.gallerySharedUpload'), t('group.galleryUploadCancelConfirm'), [
      { text: t('header.cancel'), style: 'cancel' },
      { text: t('group.galleryUploadAbort'), style: 'destructive', onPress: closeSharedEditor },
    ]);
  };

  const startSharedUpload = () => {
    if (!canUploadShared) {
      Alert.alert(t('common.alert'), t('group.galleryUploadPermissionDenied'));
      return;
    }
    const regionPlaces = places.filter((p) => p.regionCode === regionCode);
    if (regionPlaces.length === 0) {
      Alert.alert(t('common.alert'), t('group.noPlacesInRegion'));
      return;
    }
    if (remainingSharedSlots <= 0) {
      Alert.alert(t('common.alert'), t('group.galleryFull'));
      return;
    }

    Alert.alert(
      t('group.gallerySharedUpload'),
      t('group.galleryUploadPickLimit', { count: remainingSharedSlots }),
      [
        {
          text: t('visits.fromLibrary'),
          onPress: async () => {
            setSharedUploading(true);
            try {
              const uris = await pickGalleryPhotos(remainingSharedSlots, {
                permissionTitle: t('visits.permissionTitle'),
                permissionMessage: t('visits.permissionMessage'),
              });
              openSharedEditor(uris);
            } finally {
              setSharedUploading(false);
            }
          },
        },
        {
          text: t('visits.fromCamera'),
          onPress: async () => {
            setSharedUploading(true);
            try {
              const photoUri = await pickCameraPhoto({
                permissionTitle: t('visits.cameraPermissionTitle'),
                permissionMessage: t('visits.cameraPermissionMessage'),
              });
              if (photoUri) openSharedEditor([photoUri]);
            } finally {
              setSharedUploading(false);
            }
          },
        },
        { text: t('header.cancel'), style: 'cancel' },
      ],
    );
  };

  const uploadEditedSharedPhoto = async (uri: string) => {
    const regionPlaces = places.filter((p) => p.regionCode === regionCode);
    if (regionPlaces.length === 0) {
      Alert.alert(t('common.error'), t('group.noPlacesInRegion'));
      return;
    }

    setSharedUploading(true);
    try {
      await api.createVisit({
        placeId: regionPlaces[0].id,
        photoUri: uri,
        groupId: group.id,
        isSharedGallery: true,
      });

      const uploadedCount = editorIndex + 1;
      const next = editorIndex + 1;
      if (next < editorQueue.length) {
        setEditorIndex(next);
        return;
      }

      closeSharedEditor();
      onUpdated();
      Alert.alert(t('common.alert'), t('group.galleryUploadDone', { count: uploadedCount }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setSharedUploading(false);
    }
  };

  const updateSharedUploader = async (memberId: string | null) => {
    if (sharedUploading) return;
    try {
      await api.setGroupSharedGalleryUploader(group.id, memberId);
      onUpdated();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const openSharedUploaderPicker = () => {
    if (sharedUploading) return;
    const candidates = members.filter((member) => member.id !== group.ownerId);
    if (candidates.length === 0 && !delegatedUploader) {
      Alert.alert(t('common.alert'), t('group.galleryUploadDelegateNoMembers'));
      return;
    }
    const actions: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];
    if (delegatedUploader) {
      actions.push({
        text: t('group.galleryUploadDelegateRemove'),
        style: 'destructive',
        onPress: () => updateSharedUploader(null),
      });
    }
    candidates.forEach((member) => {
      actions.push({
        text: member.displayName,
        onPress: () => updateSharedUploader(member.id),
      });
    });
    actions.push({ text: t('header.cancel'), style: 'cancel' });
    Alert.alert(t('group.galleryUploadDelegateTitle'), t('group.galleryUploadDelegateMessage'), actions);
  };

  const uploadPersonalPhoto = async () => {
    const regionPlaces = places.filter((p) => p.regionCode === regionCode);
    if (regionPlaces.length === 0) {
      Alert.alert(t('common.alert'), t('group.noPlacesInRegion'));
      return;
    }
    if (personalPhotos.length >= unlocked) {
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
    setPendingPhotoUri(photoUri);
    setReviewText('');
    setReviewPublic(true);
  };

  const closeReviewModal = () => {
    if (savingReview) return;
    setPendingPhotoUri(null);
    setReviewText('');
    setReviewPublic(true);
  };

  const saveReview = async () => {
    const regionPlaces = places.filter((p) => p.regionCode === regionCode);
    const trimmed = reviewText.trim();
    if (!pendingPhotoUri || regionPlaces.length === 0) return;
    if (!trimmed) {
      Alert.alert(t('common.alert'), t('group.reviewRequired'));
      return;
    }
    setSavingReview(true);
    try {
      await api.createVisit({
        placeId: regionPlaces[0].id,
        photoUri: pendingPhotoUri,
        groupId: group.id,
        note: trimmed,
        isPublic: reviewPublic,
      });
      setPendingPhotoUri(null);
      setReviewText('');
      setReviewPublic(true);
      onUpdated();
      Alert.alert(t('group.certAdded'), t('group.reviewAddedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setSavingReview(false);
    }
  };

  const downloadPhoto = async (visit: Visit) => {
    const uri = visit.editedPhotoUri ?? visit.photoUri;
    await savePhotoToGallery(uri, {
      permissionTitle: t('photos.savePermissionTitle'),
      permissionMessage: t('photos.savePermissionMessage'),
      savedTitle: t('photos.savedTitle'),
      savedMessage: t('group.galleryDownloadSaved'),
      failed: t('photos.saveFailed'),
      webUnsupported: t('photos.webUnsupported'),
    });
  };

  const downloadAllSharedPhotos = async () => {
    if (sharedPhotos.length === 0) return;
    if (Platform.OS === 'web') {
      Alert.alert(t('photos.webUnsupported'));
      return;
    }

    const MediaLibrary = await import('expo-media-library');
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('photos.savePermissionTitle'), t('photos.savePermissionMessage'));
      return;
    }

    let savedCount = 0;
    try {
      for (const visit of sharedPhotos) {
        await MediaLibrary.saveToLibraryAsync(visit.editedPhotoUri ?? visit.photoUri);
        savedCount += 1;
      }
      Alert.alert(
        t('photos.savedTitle'),
        t('group.galleryDownloadAllSaved', { count: savedCount, total: sharedPhotos.length }),
      );
    } catch {
      Alert.alert(
        t('common.error'),
        savedCount > 0
          ? t('group.galleryDownloadPartialSaved', { count: savedCount, total: sharedPhotos.length })
          : t('photos.saveFailed'),
      );
    }
  };

  const showSharedActions = (visit: Visit) => {
    const actions: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: t('group.galleryDownload'), onPress: () => downloadPhoto(visit) },
      { text: t('group.editPhoto'), onPress: () => router.push(`/editor/${visit.id}` as Href) },
    ];
    if (visit.userId === session?.userId || isOwner) {
      actions.push({
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
      });
    }
    actions.push({ text: t('header.cancel'), style: 'cancel' });
    Alert.alert(
      t('group.galleryDownload'),
      formatDate(visit.visitedAt),
      actions,
    );
  };

  const showPersonalActions = (visit: Visit) => {
    Alert.alert(
      places.find((p) => p.id === visit.placeId)?.name ?? '',
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
          text: t('visits.delete'),
          style: 'destructive' as const,
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
        { text: t('header.cancel'), style: 'cancel' as const },
      ]
    );
  };

  return (
    <View style={styles.wrap}>
      {/* Sub-tab switcher */}
      <View style={styles.subTabRow}>
        <Pressable
          style={[styles.subTab, subTab === 'shared' && styles.subTabActive]}
          onPress={() => { setSubTab('shared'); setSelectedVisitId(null); }}
        >
          <Ionicons name="people-outline" size={14} color={subTab === 'shared' ? theme.colors.primaryDark : theme.colors.textMuted} />
          <Text style={[styles.subTabText, subTab === 'shared' && styles.subTabTextActive]}>
            {t('group.galleryTabShared')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.subTab, subTab === 'personal' && styles.subTabActive]}
          onPress={() => { setSubTab('personal'); setSelectedVisitId(null); }}
        >
          <Ionicons name="person-outline" size={14} color={subTab === 'personal' ? theme.colors.primaryDark : theme.colors.textMuted} />
          <Text style={[styles.subTabText, subTab === 'personal' && styles.subTabTextActive]}>
            {t('group.galleryTabPersonal')}
          </Text>
        </Pressable>
      </View>

      {/* Photo viewer area */}
      <View style={styles.viewer}>
        {selectedPhotoUri ? (
          <Pressable
            style={styles.viewerInner}
            onLongPress={() => {
              if (!selectedVisit) return;
              subTab === 'shared' ? showSharedActions(selectedVisit) : showPersonalActions(selectedVisit);
            }}
          >
            <Image source={{ uri: selectedPhotoUri }} style={styles.viewerImage} resizeMode="contain" />
            {selectedVisit ? (
              <>
                <View style={styles.viewerCaption}>
                  <Text style={styles.viewerCaptionText} numberOfLines={1}>
                    {subTab === 'shared'
                      ? (selectedVisit.uploaderName ?? '')
                      : (places.find((p) => p.id === selectedVisit.placeId)?.name ?? '')}
                  </Text>
                  <Text style={styles.viewerDate}>{formatDate(selectedVisit.visitedAt)}</Text>
                </View>
                {subTab === 'shared' ? (
                  <>
                    <View style={styles.photoCountBadge}>
                      <Text style={styles.photoCountText}>
                        {selectedPhotoPosition}/{activePhotos.length}
                      </Text>
                    </View>
                    {canStartSharedUpload ? (
                      <Pressable style={styles.uploadBtn} onPress={startSharedUpload}>
                        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                      </Pressable>
                    ) : null}
                    <Pressable style={styles.downloadBtn} onPress={() => downloadPhoto(selectedVisit)}>
                      <Ionicons name="download-outline" size={18} color="#fff" />
                    </Pressable>
                  </>
                ) : null}
                {subTab === 'personal' && selectedVisit.note ? (
                  <View style={styles.reviewBadge}>
                    <Ionicons
                      name={selectedVisit.isPublic ? 'earth-outline' : 'lock-closed-outline'}
                      size={12}
                      color="#fff"
                    />
                    <Text style={styles.reviewBadgeText} numberOfLines={1}>
                      {selectedVisit.note}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.viewerEmpty,
              (subTab === 'shared' ? canStartSharedUpload : canStartPersonalUpload) && styles.viewerEmptyActionable,
            ]}
            onPress={handleViewerPress}
            disabled={subTab === 'shared' ? !canStartSharedUpload : !canStartPersonalUpload}
          >
            <Ionicons
              name={subTab === 'shared' ? 'images-outline' : 'journal-outline'}
              size={48}
              color={theme.colors.textMuted}
            />
            <Text style={styles.viewerEmptyText}>
              {subTab === 'shared' ? t('group.gallerySharedEmpty') : t('group.galleryPersonalEmpty')}
            </Text>
            <Text style={styles.viewerEmptyHint}>
              {subTab === 'shared'
                ? canStartSharedUpload
                  ? t('group.galleryViewerTapUpload')
                  : canUploadShared
                    ? t('group.galleryFull')
                    : t('group.galleryUploadPermissionDenied')
                : canStartPersonalUpload
                  ? t('group.galleryViewerTapReview')
                  : t('group.galleryFull')}
            </Text>
            {subTab === 'shared' && canStartSharedUpload ? (
              <Text style={styles.viewerSlotHint}>
                {t('group.galleryUploadPickLimit', { count: remainingSharedSlots })}
              </Text>
            ) : null}
          </Pressable>
        )}
      </View>

      {/* Horizontal thumbnail strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {Array.from({ length: slotCount }, (_, slotIndex) => {
          const visit = activePhotos[slotIndex];
          if (!visit) {
            return (
              <View key={`empty-${slotIndex}`} style={[styles.thumb, styles.thumbEmpty]} />
            );
          }
          const uri = visit.editedPhotoUri ?? visit.photoUri;
          const isSelected = visit.id === (selectedVisit?.id ?? null);
          return (
            <Pressable
              key={visit.id}
              style={[styles.thumb, isSelected && styles.thumbSelected]}
              onPress={() => setSelectedVisitId(visit.id)}
              onLongPress={() => subTab === 'shared' ? showSharedActions(visit) : showPersonalActions(visit)}
            >
              <Image source={{ uri }} style={styles.thumbImage} />
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.thumb, styles.thumbUnlock, !isOwner && styles.thumbUnlockDisabled]}
          onPress={isOwner ? confirmUnlockSlots : undefined}
          disabled={!isOwner}
        >
          <Ionicons name="lock-closed-outline" size={18} color={theme.colors.star} />
          <StarAmount amount={batchCost} compact textStyle={styles.unlockCost} />
        </Pressable>
      </ScrollView>

      {subTab === 'shared' && sharedPhotos.length > 0 ? (
        <Pressable style={styles.downloadAllBtn} onPress={downloadAllSharedPhotos}>
          <Ionicons name="download-outline" size={14} color={theme.colors.primaryDark} />
          <Text style={styles.downloadAllText}>{t('group.galleryDownloadAll')}</Text>
        </Pressable>
      ) : null}

      {subTab === 'shared' ? (
        <View style={styles.uploadPermissionBox}>
          <View style={styles.uploadPermissionTextCol}>
            <Text style={styles.uploadPermissionLabel}>{t('group.galleryUploadPermissionLabel')}</Text>
            <Text style={styles.uploadPermissionName} numberOfLines={1}>
              {sharedUploaderName}
            </Text>
          </View>
          {canManageSharedUploader ? (
            <Pressable
              style={[styles.delegateBtn, sharedUploading && styles.delegateBtnDisabled]}
              onPress={openSharedUploaderPicker}
              disabled={sharedUploading}
            >
              <Ionicons name="person-add-outline" size={13} color={theme.colors.primaryDark} />
              <Text style={styles.delegateBtnText}>
                {sharedUploading ? t('group.galleryUploading') : t('group.galleryUploadDelegateButton')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Review modal (personal gallery) */}
      <AppModal visible={Boolean(pendingPhotoUri)} animationType="slide" onRequestClose={closeReviewModal}>
        <View style={styles.reviewSheet}>
          <Text style={styles.reviewTitle}>{t('group.reviewWriteTitle')}</Text>
          {pendingPhotoUri ? <Image source={{ uri: pendingPhotoUri }} style={styles.reviewPreview} /> : null}
          <TextInput
            style={styles.reviewInput}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder={t('group.reviewPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            maxLength={500}
          />
          <View style={styles.publicRow}>
            <View style={styles.publicTextCol}>
              <Text style={styles.publicLabel}>{t('group.reviewPublicLabel')}</Text>
              <Text style={styles.publicHint}>{t('group.reviewPublicHint')}</Text>
            </View>
            <Switch
              value={reviewPublic}
              onValueChange={setReviewPublic}
              trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.primaryLight }}
            />
          </View>
          <PremiumButton title={t('group.reviewSave')} onPress={saveReview} loading={savingReview} />
          <PremiumButton title={t('header.cancel')} onPress={closeReviewModal} variant="outline" />
        </View>
      </AppModal>

      <AppModal
        visible={editorOpen}
        variant="fullscreen"
        animationType="slide"
        onRequestClose={confirmCloseSharedEditor}
      >
        <SafeAreaView style={styles.editorScreen} edges={['top', 'bottom']}>
          <View style={styles.editorHeader}>
            <Pressable onPress={confirmCloseSharedEditor} hitSlop={8} disabled={sharedUploading}>
              <Ionicons name="close" size={22} color={theme.colors.textMuted} />
            </Pressable>
            <Text style={styles.editorTitle}>
              {editorQueue.length > 1
                ? t('group.galleryUploadProgress', {
                    current: editorIndex + 1,
                    total: editorQueue.length,
                  })
                : t('group.gallerySharedUpload')}
            </Text>
            <View style={styles.editorHeaderSide} />
          </View>
          {editorQueue[editorIndex] ? (
            <PhotoEditorPanel
              key={`${editorIndex}-${editorQueue[editorIndex]}`}
              sourceUri={editorQueue[editorIndex]}
              showPickAnother={false}
              saveLabel={t('group.galleryUploadToGallery')}
              onSave={uploadEditedSharedPhoto}
            />
          ) : null}
        </SafeAreaView>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  subTabRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  subTabActive: {
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  subTabText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
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
  downloadBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    position: 'absolute',
    top: 12,
    right: 56,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    minWidth: 46,
    height: 28,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewBadge: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reviewBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 },
  viewerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  viewerEmptyActionable: {
    backgroundColor: theme.colors.tint.soft,
  },
  viewerEmptyText: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  viewerEmptyHint: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  viewerSlotHint: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  editorScreen: { flex: 1, backgroundColor: theme.colors.background, gap: theme.spacing.sm },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  editorHeaderSide: { width: 22 },
  editorTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
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
  thumbEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLight,
  },
  thumbUnlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.star,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  thumbUnlockDisabled: {
    opacity: 0.7,
  },
  unlockCost: { fontSize: 9, fontWeight: '800' },
  downloadAllBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  downloadAllText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  uploadPermissionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  uploadPermissionTextCol: { flex: 1, minWidth: 0 },
  uploadPermissionLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  uploadPermissionName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  delegateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  delegateBtnDisabled: {
    opacity: 0.45,
  },
  delegateBtnText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  reviewSheet: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  reviewTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  reviewPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  reviewInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  publicTextCol: { flex: 1, gap: 2 },
  publicLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  publicHint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
});
