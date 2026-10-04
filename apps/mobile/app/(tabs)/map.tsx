import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PLACE_CATEGORIES, REGIONS, TOTAL_REGIONS, type Place, type PlaceCategory, type RegionVisitStat } from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { KoreaSvgMap } from '@/components/KoreaSvgMap';
import { PlacesMap } from '@/components/PlacesMap';
import { PlaceRow } from '@/components/PlaceRow';
import { useToast } from '@/components/album/Toast';
import { NearbySearch } from '@/components/recommend/NearbySearch';
import { RegionSheet } from '@/components/recommend/RegionSheet';
import { Card, EmptyState, Loading, Segment, SectionTitle, type IconName } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { HEAT_LEGEND, heatColor, heatFills, heatLevel } from '@/lib/korea-map-visual';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

type Mode = 'regions' | 'nearby' | 'places';
type CategoryFilter = 'all' | PlaceCategory;

export default function MapScreen() {
  const router = useRouter();
  const contentWidth = useContentWidth();
  const { height: windowHeight } = useWindowDimensions();
  const innerWidth = contentWidth - theme.spacing.lg * 2;
  const [mode, setMode] = useState<Mode>('regions');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetCode, setSheetCode] = useState<string | null>(null);
  const [toast, showToast] = useToast();
  const { state: location, locate } = useCurrentLocation();
  const { data, error, refreshing, refresh, reload } = useFocusLoad(async () => {
    const [stats, places] = await Promise.all([api.getRegionStats(), api.listPlaces()]);
    return { stats, places };
  });
  const places = data?.places ?? null;

  const statByCode = useMemo(() => {
    const map: Record<string, RegionVisitStat> = {};
    for (const s of data?.stats ?? []) map[s.regionCode] = s;
    return map;
  }, [data]);
  const fills = useMemo(() => heatFills(data?.stats ?? []), [data]);
  const visitedCount = (data?.stats ?? []).filter((s) => s.visited).length;
  const progress = visitedCount / TOTAL_REGIONS;

  const filteredPlaces = useMemo(
    () => (places ?? []).filter((p) => category === 'all' || p.category === category),
    [places, category],
  );

  const openPlace = (place: Place) => router.push(`/place/${place.id}` as Href);
  const openRegion = (code: string) => {
    setSelected(code);
    setSheetCode(code);
  };
  const closeSheet = useCallback(() => {
    setSheetCode(null);
    void reload();
  }, [reload]);
  const leaveSheetTo = (href: Href) => {
    setSheetCode(null);
    router.push(href);
  };
  // Edge to edge inside the card's 1px border
  const mapSize = innerWidth - 2;

  return (
    <Screen tab title="지도" refreshing={refreshing} onRefresh={refresh} overlay={toast}>
      <Segment<Mode>
        scroll
        options={[
          { id: 'regions', label: '색칠 지도', icon: 'color-fill-outline' },
          { id: 'nearby', label: '근처 검색', icon: 'navigate-outline' },
          { id: 'places', label: '저장 장소', icon: 'location-outline' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {error && !data ? <Text style={styles.error}>{error}</Text> : null}

      {mode === 'regions' ? (
        <>
          <Card style={styles.summary}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryLabel}>우리가 색칠한 전국</Text>
                <Text style={styles.summaryCount}>
                  {visitedCount}
                  <Text style={styles.summaryTotal}> / {TOTAL_REGIONS} 지역</Text>
                </Text>
              </View>
              <Text style={styles.summaryPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <View style={styles.legend}>
              <LegendSwatch color={theme.colors.mapUnvisited} label="아직" />
              {HEAT_LEGEND.map((label, i) => (
                <LegendSwatch key={label} color={heatColor(i + 1)} label={label} />
              ))}
            </View>
            <Text style={styles.legendHint}>다녀온 장소와 사진이 많을수록 진하게 칠해져요</Text>
          </Card>

          <Card style={styles.mapCard}>
            {data ? (
              <KoreaSvgMap
                width={mapSize}
                height={mapSize}
                fillByCode={fills}
                labelPx={10}
                selectedCode={selected}
                onRegionPress={(region) => openRegion(region.code)}
                frameless
              />
            ) : (
              <View style={{ height: mapSize, justifyContent: 'center' }}>
                <Loading />
              </View>
            )}
            <View style={styles.hintRow}>
              <Ionicons name="hand-left-outline" size={13} color={theme.colors.textMuted} />
              <Text style={styles.hint}>지역을 누르면 맛집 · 볼거리 · 행사 추천이 열려요</Text>
            </View>
          </Card>

          <SectionTitle title="17개 지역" />
          <View style={styles.grid}>
            {REGIONS.map((region) => {
              const s = statByCode[region.code];
              const level = heatLevel(s);
              return (
                <Pressable
                  key={region.code}
                  style={({ pressed }) => [
                    styles.regionCard,
                    { width: (innerWidth - 10) / 2 },
                    selected === region.code && styles.regionCardSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => openRegion(region.code)}
                >
                  <View style={[styles.regionDot, { backgroundColor: heatColor(level) }]} />
                  <View style={styles.regionBody}>
                    <Text style={styles.regionName}>{region.name}</Text>
                    <Text style={styles.regionMeta} numberOfLines={1}>
                      {s ? `장소 ${s.placeCount} · 사진 ${s.photoCount}` : '아직 비어 있어요'}
                    </Text>
                  </View>
                  {s?.visited ? <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : mode === 'nearby' ? (
        <NearbySearch
          location={location}
          onLocate={locate}
          initialRegion={selected}
          onOpenPlace={(id) => router.push(`/place/${id}` as Href)}
          onToast={showToast}
        />
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
            <EmptyState
              icon="location-outline"
              title="저장된 장소가 없어요"
              message="색칠 지도에서 지역을 눌러 추천 장소를 담으면 여기 지도에 핀으로 보여요."
            />
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

      <RegionSheet
        regionCode={sheetCode}
        stat={sheetCode ? statByCode[sheetCode] : undefined}
        from={location.status === 'ready' ? location.coords : null}
        onClose={closeSheet}
        onOpenRegion={(code) => leaveSheetTo(`/region/${code}` as Href)}
        onOpenPlace={(id) => leaveSheetTo(`/place/${id}` as Href)}
      />
    </Screen>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: theme.colors.error, textAlign: 'center', marginTop: theme.spacing.md },
  summary: { marginTop: theme.spacing.md, gap: 10 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  summaryLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800' },
  summaryCount: { color: theme.colors.primaryDark, fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  summaryTotal: { color: theme.colors.textMuted, fontSize: 15, fontWeight: '700' },
  summaryPct: { color: theme.colors.primary, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: theme.colors.tint.medium, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: theme.colors.primary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  legendText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  legendHint: { color: theme.colors.textSubtle, fontSize: 11 },
  mapCard: { alignItems: 'center', marginTop: theme.spacing.md, padding: 0, overflow: 'hidden' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 12 },
  hint: { flexShrink: 1, color: theme.colors.textMuted, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  regionCard: {
    ...cardSurface(),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  regionCardSelected: { borderColor: theme.colors.primary },
  pressed: { opacity: 0.85 },
  regionDot: { width: 12, height: 12, borderRadius: 6 },
  regionBody: { flex: 1, gap: 2 },
  regionName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  regionMeta: { color: theme.colors.textMuted, fontSize: 11 },
  filters: { marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
});
