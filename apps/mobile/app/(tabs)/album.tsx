import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { getRegion, REGIONS, type Photo } from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { PhotoGrid } from '@/components/PhotoGrid';
import { ActionButton, Chip, EmptyState, Loading } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { monthLabel } from '@/lib/dates';
import { pickGalleryPhotos } from '@/lib/pick-photo';
import { uploadManyPhotos } from '@/lib/photo-flow';
import { theme } from '@/constants/theme';

const NO_PLACE = '__none__';

export default function AlbumScreen() {
  const router = useRouter();
  const innerWidth = useContentWidth() - theme.spacing.lg * 2;
  const [filter, setFilter] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const { data: photos, refreshing, refresh, reload } = useFocusLoad(() => api.listPhotos());

  const regionCodes = useMemo(() => {
    const set = new Set((photos ?? []).map((p) => p.regionCode).filter(Boolean) as string[]);
    return REGIONS.filter((r) => set.has(r.code)).map((r) => r.code);
  }, [photos]);
  const hasUnlinked = (photos ?? []).some((p) => !p.placeId);

  const sections = useMemo(() => {
    const list = (photos ?? []).filter((p) =>
      filter === null ? true : filter === NO_PLACE ? !p.placeId : p.regionCode === filter,
    );
    const groups: { title: string; photos: Photo[] }[] = [];
    for (const photo of list) {
      const title = monthLabel(photo.takenAt);
      const last = groups[groups.length - 1];
      if (last?.title === title) last.photos.push(photo);
      else groups.push({ title, photos: [photo] });
    }
    return groups;
  }, [photos, filter]);

  const upload = async () => {
    const uris = await pickGalleryPhotos(30, {
      permissionTitle: '사진 권한 필요',
      permissionMessage: '갤러리 접근을 허용해 주세요',
    });
    if (uris.length === 0) return;
    setUploading(`0 / ${uris.length}`);
    const ok = await uploadManyPhotos(uris, null, (done, total) => setUploading(`${done} / ${total}`));
    setUploading(null);
    if (ok < uris.length) Alert.alert('일부 실패', `${uris.length - ok}장을 올리지 못했어요`);
    await reload();
  };

  return (
    <Screen tab title="앨범" refreshing={refreshing} onRefresh={refresh}>
      <ActionButton
        icon="cloud-upload-outline"
        label={uploading ? `올리는 중 ${uploading}` : '갤러리에서 여러 장 올리기'}
        loading={uploading !== null}
        onPress={upload}
      />

      {regionCodes.length > 0 || hasUnlinked ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Chip label={`전체 ${photos?.length ?? 0}`} active={filter === null} onPress={() => setFilter(null)} />
          {regionCodes.map((code) => {
            const region = getRegion(code)!;
            return <Chip key={code} label={region.name} active={filter === code} color={region.color} onPress={() => setFilter(code)} />;
          })}
          {hasUnlinked ? <Chip label="장소 미지정" active={filter === NO_PLACE} onPress={() => setFilter(NO_PLACE)} /> : null}
        </ScrollView>
      ) : null}

      {photos === null ? (
        <Loading />
      ) : sections.length === 0 ? (
        <EmptyState icon="images-outline" title="앨범이 비어 있어요" message="카메라로 찍거나 갤러리 사진을 올려 우리만의 여행 앨범을 채워요." />
      ) : (
        sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.title} <Text style={styles.count}>{section.photos.length}</Text>
            </Text>
            <PhotoGrid photos={section.photos} width={innerWidth} onPress={(photo) => router.push(`/photo/${photo.id}` as Href)} />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 6, paddingVertical: theme.spacing.md },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  count: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
});
