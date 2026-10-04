import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { getRegion, PLACE_CATEGORIES, type PlaceCategory, type PlaceStatus } from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { PlaceRow } from '@/components/PlaceRow';
import { PhotoGrid } from '@/components/PhotoGrid';
import { RegionSheet } from '@/components/recommend/RegionSheet';
import { ActionButton, Chip, EmptyState, Loading, Segment, SectionTitle, type IconName } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

type CategoryFilter = 'all' | PlaceCategory;
type StatusFilter = 'all' | PlaceStatus;

export default function RegionScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const region = getRegion(String(code));
  const innerWidth = useContentWidth() - theme.spacing.lg * 2;
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [showRecommendations, setShowRecommendations] = useState(false);

  const { data, refreshing, refresh } = useFocusLoad(async () => {
    const [places, photos] = await Promise.all([
      api.listPlaces({ regionCode: String(code) }),
      api.listPhotos({ regionCode: String(code) }),
    ]);
    return { places, photos };
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.places.length ?? 0 };
    for (const p of data?.places ?? []) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [data]);

  const places = useMemo(
    () =>
      (data?.places ?? []).filter(
        (p) => (category === 'all' || p.category === category) && (status === 'all' || p.status === status),
      ),
    [data, category, status],
  );

  const addPlace = () => {
    const params = new URLSearchParams({ region: String(code) });
    if (category !== 'all') params.set('category', category);
    router.push(`/place/new?${params.toString()}` as Href);
  };

  if (!region) {
    return (
      <Screen title="지역">
        <EmptyState icon="alert-circle-outline" title="알 수 없는 지역이에요" />
      </Screen>
    );
  }

  const visitedCount = (data?.places ?? []).filter((p) => p.status === 'visited').length;
  const photoCount = data?.photos.length ?? 0;

  return (
    <Screen title={region.name} refreshing={refreshing} onRefresh={refresh}>
      <View style={[styles.summary, { borderColor: `${region.color}55`, backgroundColor: `${region.color}14` }]}>
        <View style={[styles.summaryDot, { backgroundColor: region.color }]} />
        <Text style={styles.summaryText}>
          장소 {counts.all}곳 · 다녀온 곳 {visitedCount}곳 · 사진 {data?.photos.length ?? 0}장
        </Text>
      </View>

      <View style={styles.filters}>
        <Segment<CategoryFilter>
          scroll
          options={[
            { id: 'all', label: `전체 ${counts.all}` },
            ...PLACE_CATEGORIES.map((c) => ({
              id: c.id,
              label: `${c.label} ${counts[c.id] ?? 0}`,
              icon: c.icon as IconName,
              color: c.color,
            })),
          ]}
          value={category}
          onChange={setCategory}
        />
        <View style={styles.statusRow}>
          <Chip label="모두" active={status === 'all'} onPress={() => setStatus('all')} />
          <Chip label="가고 싶어요" active={status === 'wish'} onPress={() => setStatus('wish')} />
          <Chip label="다녀왔어요" active={status === 'visited'} onPress={() => setStatus('visited')} color={theme.colors.success} />
        </View>
      </View>

      <View style={styles.actions}>
        <ActionButton icon="sparkles" label="추천 장소 보기 (맛집 · 볼거리 · 행사)" onPress={() => setShowRecommendations(true)} />
        <ActionButton icon="add-circle" label="장소 추가 (카카오 검색 · 직접 입력)" tone="primary" onPress={addPlace} />
      </View>

      <SectionTitle title="장소" />
      {!data ? (
        <Loading />
      ) : places.length === 0 ? (
        <EmptyState
          icon="compass-outline"
          title={counts.all === 0 ? `${region.name}에 담은 장소가 없어요` : '조건에 맞는 장소가 없어요'}
          message="맛집, 놀거리, 행사, 숙소를 검색해서 담아 보세요."
        />
      ) : (
        places.map((place) => <PlaceRow key={place.id} place={place} onPress={() => router.push(`/place/${place.id}` as Href)} />)
      )}

      {data && data.photos.length > 0 ? (
        <>
          <SectionTitle title={`${region.name} 사진`} />
          <PhotoGrid photos={data.photos} width={innerWidth} onPress={(photo) => router.push(`/photo/${photo.id}` as Href)} />
        </>
      ) : null}

      <RegionSheet
        regionCode={showRecommendations ? region.code : null}
        stat={{
          regionCode: region.code,
          placeCount: counts.all,
          visitedPlaceCount: visitedCount,
          photoCount,
          visited: visitedCount > 0 || photoCount > 0,
        }}
        onClose={() => {
          setShowRecommendations(false);
          void refresh();
        }}
        onOpenPlace={(id) => {
          setShowRecommendations(false);
          router.push(`/place/${id}` as Href);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  summaryDot: { width: 10, height: 10, borderRadius: 5 },
  summaryText: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  filters: { gap: 10, marginVertical: theme.spacing.md },
  statusRow: { flexDirection: 'row', gap: 6 },
  actions: { gap: 8 },
});
