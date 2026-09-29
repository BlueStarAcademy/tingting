import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PLACE_CATEGORIES, REGIONS, TOTAL_REGIONS, type Place, type PlaceCategory } from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { KoreaSvgMap } from '@/components/KoreaSvgMap';
import { PlacesMap } from '@/components/PlacesMap';
import { PlaceRow } from '@/components/PlaceRow';
import { Card, EmptyState, Loading, Segment, SectionTitle, type IconName } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

type Mode = 'regions' | 'places';
type CategoryFilter = 'all' | PlaceCategory;

type RegionStat = { places: number; visited: number; photos: number };

export default function MapScreen() {
  const router = useRouter();
  const contentWidth = useContentWidth();
  const { height: windowHeight } = useWindowDimensions();
  const innerWidth = contentWidth - theme.spacing.lg * 2;
  const [mode, setMode] = useState<Mode>('regions');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const { data: places, refreshing, refresh } = useFocusLoad(() => api.listPlaces());

  const stats = useMemo(() => {
    const map: Record<string, RegionStat> = {};
    for (const p of places ?? []) {
      const s = (map[p.regionCode] ??= { places: 0, visited: 0, photos: 0 });
      s.places += 1;
      if (p.status === 'visited') s.visited += 1;
      s.photos += p.photoCount ?? 0;
    }
    return map;
  }, [places]);

  const visitedRegionCodes = useMemo(
    () => Object.entries(stats).filter(([, s]) => s.visited > 0 || s.photos > 0).map(([code]) => code),
    [stats],
  );

  const filteredPlaces = useMemo(
    () => (places ?? []).filter((p) => category === 'all' || p.category === category),
    [places, category],
  );

  const openPlace = (place: Place) => router.push(`/place/${place.id}` as Href);

  return (
    <Screen tab title="지도" refreshing={refreshing} onRefresh={refresh}>
      <Segment<Mode>
        options={[
          { id: 'regions', label: '지역별', icon: 'grid-outline' },
          { id: 'places', label: '장소 지도', icon: 'location-outline' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'regions' ? (
        <>
          <Card style={styles.mapCard}>
            <Text style={styles.progress}>
              {visitedRegionCodes.length} / {TOTAL_REGIONS} 지역 방문
            </Text>
            <KoreaSvgMap
              width={innerWidth - theme.spacing.md * 2}
              height={innerWidth - theme.spacing.md * 2}
              visitedRegionCodes={visitedRegionCodes}
              onRegionPress={(region) => router.push(`/region/${region.code}` as Href)}
              frameless
            />
            <Text style={styles.hint}>지역을 눌러 맛집 · 놀거리 · 행사 · 숙소를 모아 보세요</Text>
          </Card>

          <SectionTitle title="17개 지역" />
          <View style={styles.grid}>
            {REGIONS.map((region) => {
              const s = stats[region.code];
              const visited = visitedRegionCodes.includes(region.code);
              return (
                <Pressable
                  key={region.code}
                  style={({ pressed }) => [styles.regionCard, { width: (innerWidth - 10) / 2 }, pressed && styles.pressed]}
                  onPress={() => router.push(`/region/${region.code}` as Href)}
                >
                  <View style={[styles.regionDot, { backgroundColor: visited ? region.color : theme.colors.mapUnvisited }]} />
                  <View style={styles.regionBody}>
                    <Text style={styles.regionName}>{region.name}</Text>
                    <Text style={styles.regionMeta}>
                      {s ? `장소 ${s.places} · 사진 ${s.photos}` : '아직 비어 있어요'}
                    </Text>
                  </View>
                  {visited ? <Ionicons name="checkmark-circle" size={18} color={region.color} /> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <View style={styles.filters}>
            <Segment<CategoryFilter>
              scroll
              options={[
                { id: 'all', label: '전체' },
                ...PLACE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon as IconName, color: c.color })),
              ]}
              value={category}
              onChange={setCategory}
            />
          </View>
          {places === null ? (
            <Loading />
          ) : places.length === 0 ? (
            <EmptyState icon="location-outline" title="저장된 장소가 없어요" message="지역별 화면에서 장소를 추가하면 여기 지도에 핀으로 보여요." />
          ) : (
            <>
              <PlacesMap places={filteredPlaces} height={Math.round(windowHeight * 0.5)} onPlacePress={openPlace} />
              <SectionTitle title={`장소 ${filteredPlaces.length}곳`} />
              {filteredPlaces.map((place) => (
                <PlaceRow key={place.id} place={place} showRegion onPress={() => openPlace(place)} />
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapCard: { alignItems: 'center', marginTop: theme.spacing.md, gap: 8 },
  progress: { alignSelf: 'flex-start', color: theme.colors.primaryDark, fontSize: 15, fontWeight: '800' },
  hint: { color: theme.colors.textMuted, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  regionCard: { ...cardSurface(), flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  pressed: { opacity: 0.85 },
  regionDot: { width: 12, height: 12, borderRadius: 6 },
  regionBody: { flex: 1, gap: 2 },
  regionName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  regionMeta: { color: theme.colors.textMuted, fontSize: 11 },
  filters: { marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
});
