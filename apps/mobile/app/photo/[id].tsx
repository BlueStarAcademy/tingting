import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRegion, type Place } from '@tingting/shared';
import { PlacePickerModal } from '@/components/PlacePickerModal';
import { type IconName } from '@/components/ui';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { formatTimestamp } from '@/lib/dates';
import { safeBack } from '@/lib/navigation';
import { savePhotoToGallery } from '@/lib/save-photo';
import { theme } from '@/constants/theme';

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const photoId = String(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: photo, setData, error } = useFocusLoad(() => api.getPhoto(photoId));
  const [showOriginal, setShowOriginal] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해 주세요');
    } finally {
      setBusy(false);
    }
  };

  if (!photo) {
    return (
      <View style={[styles.root, styles.center]}>
        {error ? <Text style={styles.errorText}>{error}</Text> : <ActivityIndicator color="#fff" />}
      </View>
    );
  }

  const shownUri = showOriginal || !photo.editedUri ? photo.originalUri : photo.editedUri;
  const region = photo.regionCode ? getRegion(photo.regionCode) : null;

  const edit = () => {
    const params = new URLSearchParams({ uri: shownUri, photoId });
    router.push(`/editor?${params.toString()}` as Href);
  };

  const revert = () =>
    Alert.alert('원본으로 되돌리기', '편집본을 지우고 원본만 남길까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '되돌리기',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            setData(await api.updatePhoto(photoId, { editedUri: null }));
            setShowOriginal(false);
          }),
      },
    ]);

  const remove = () =>
    Alert.alert('사진 삭제', '원본과 편집본이 모두 삭제돼요. 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await api.deletePhoto(photoId);
            safeBack(router);
          }),
      },
    ]);

  const saveToDevice = () =>
    run(async () => {
      await savePhotoToGallery(shownUri, {
        permissionTitle: '저장 권한 필요',
        permissionMessage: '사진을 갤러리에 저장하려면 접근을 허용해 주세요',
        savedTitle: '저장 완료',
        savedMessage: '휴대폰 갤러리의 TingTing 앨범에 저장했어요',
        failed: '저장에 실패했어요',
        webUnsupported: '웹에서는 파일 다운로드로 저장돼요.',
      });
    });

  const linkPlace = (place: Place | null) =>
    run(async () => {
      setData(await api.updatePhoto(photoId, { placeId: place?.id ?? null }));
    });

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => safeBack(router)} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.time}>{formatTimestamp(photo.takenAt)}</Text>
        <Pressable onPress={remove} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="trash-outline" size={21} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.imageWrap}>
        <Image source={{ uri: shownUri }} style={styles.image} resizeMode="contain" />
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>

      {photo.editedUri ? (
        <View style={styles.toggle}>
          <Pressable style={[styles.toggleItem, !showOriginal && styles.toggleActive]} onPress={() => setShowOriginal(false)}>
            <Text style={[styles.toggleText, !showOriginal && styles.toggleTextActive]}>편집본</Text>
          </Pressable>
          <Pressable style={[styles.toggleItem, showOriginal && styles.toggleActive]} onPress={() => setShowOriginal(true)}>
            <Text style={[styles.toggleText, showOriginal && styles.toggleTextActive]}>원본</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Pressable
          style={styles.placeRow}
          onPress={() => (photo.placeId ? router.push(`/place/${photo.placeId}` as Href) : setPickerOpen(true))}
          onLongPress={() => setPickerOpen(true)}
        >
          <Ionicons name="location" size={16} color={theme.colors.primaryLight} />
          <Text style={styles.placeText} numberOfLines={1}>
            {photo.placeName ? `${photo.placeName}${region ? ` · ${region.name}` : ''}` : '장소 연결하기'}
          </Text>
          {photo.placeId ? (
            <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
              <Text style={styles.changeText}>변경</Text>
            </Pressable>
          ) : null}
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actions}>
          <Action icon="color-wand" label={showOriginal ? '원본 편집' : '편집하기'} onPress={edit} primary />
          <Action icon="download-outline" label="휴대폰 저장" onPress={saveToDevice} />
          {photo.editedUri ? <Action icon="arrow-undo-outline" label="원본으로" onPress={revert} /> : null}
          <Action icon="location-outline" label="장소 연결" onPress={() => setPickerOpen(true)} />
        </ScrollView>
      </View>

      <PlacePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={photo.placeId}
        onSelect={linkPlace}
        title="사진을 연결할 장소"
      />
    </View>
  );
}

function Action({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable style={[styles.action, primary && styles.actionPrimary]} onPress={onPress}>
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0A0B' },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  time: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  imageWrap: { flex: 1 },
  image: { width: '100%', height: '100%' },
  busy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 10,
    padding: 3,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  toggleItem: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: theme.radius.full },
  toggleActive: { backgroundColor: '#fff' },
  toggleText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  toggleTextActive: { color: theme.colors.primaryDark, fontWeight: '900' },
  bottom: { paddingHorizontal: theme.spacing.lg, paddingTop: 12, gap: 12 },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  placeText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
  changeText: { color: theme.colors.primaryLight, fontSize: 13, fontWeight: '800' },
  actions: { gap: 8 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  actionPrimary: { backgroundColor: theme.colors.primary },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
