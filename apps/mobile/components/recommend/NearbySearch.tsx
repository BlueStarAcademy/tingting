import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getRecommendationCategory,
  getRegion,
  NEARBY_RADII,
  REGION_HUBS,
  type RecommendationCategory,
} from '@tingting/shared';
import { RegionChips } from '@/components/RegionChips';
import { CategoryChips } from '@/components/recommend/CategoryChips';
import { formatDistance } from '@/components/recommend/RecommendationCard';
import { RecommendationResults } from '@/components/recommend/RecommendationResults';
import { Card, Chip, Segment } from '@/components/ui';
import type { LocationState } from '@/hooks/useCurrentLocation';
import { usePagedRecommendations } from '@/hooks/usePagedRecommendations';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

type Origin = 'me' | 'region';

function locationText(state: LocationState): { title: string; message?: string } {
  switch (state.status) {
    case 'idle':
    case 'locating':
      return { title: '내 위치를 찾고 있어요' };
    case 'ready':
      return { title: '지금 내 위치 기준' };
    case 'denied':
      return {
        title: '위치 권한이 꺼져 있어요',
        message: state.canAskAgain
          ? '다시 찾기를 눌러 위치를 허용하거나, 지역을 골라 그 중심에서 찾아보세요.'
          : '설정에서 위치 권한을 켜거나, 지역을 골라 그 중심에서 찾아보세요.',
      };
    case 'outside':
      return { title: '지금은 한국 밖에 있어요', message: '지역을 골라 그 중심에서 찾아보세요.' };
    case 'error':
      return {
        title: '위치를 확인하지 못했어요',
        message: Platform.OS === 'web' ? '브라우저 위치 권한을 확인하거나 지역을 골라 주세요.' : state.message,
      };
  }
}

export function NearbySearch({
  location,
  onLocate,
  initialRegion,
  onOpenPlace,
  onToast,
}: {
  location: LocationState;
  onLocate: () => void;
  /** Region to fall back to when location is unavailable */
  initialRegion?: string | null;
  onOpenPlace: (placeId: string) => void;
  onToast: (message: string) => void;
}) {
  const [origin, setOrigin] = useState<Origin>('me');
  const [regionCode, setRegionCode] = useState<string | null>(initialRegion ?? null);
  const [radius, setRadius] = useState<number>(1000);
  const [category, setCategory] = useState<RecommendationCategory>('food');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (location.status === 'idle') onLocate();
  }, [location.status, onLocate]);

  useEffect(() => {
    if (location.status === 'denied' || location.status === 'outside' || location.status === 'error') {
      setOrigin('region');
      setRegionCode((code) => code ?? initialRegion ?? 'SEO');
    }
  }, [location.status, initialRegion]);

  const hub = regionCode ? REGION_HUBS[regionCode] : undefined;
  const point =
    origin === 'me'
      ? location.status === 'ready'
        ? location.coords
        : null
      : hub
        ? { lat: hub.lat, lng: hub.lng }
        : null;

  const key = point ? `${point.lat.toFixed(4)},${point.lng.toFixed(4)}:${radius}:${query ? `q:${query}` : `c:${category}`}` : null;
  const state = usePagedRecommendations(key, (page, source) =>
    api.searchNearby({ lat: point!.lat, lng: point!.lng, radius, category, query: query || undefined, page, source }),
  );

  const submit = () => setQuery(draft.trim());
  const clearQuery = () => {
    setDraft('');
    setQuery('');
  };
  const pickCategory = (c: RecommendationCategory) => {
    setCategory(c);
    clearQuery();
  };

  const info = locationText(location);
  const region = regionCode ? getRegion(regionCode) : undefined;
  const what = query ? `'${query}'` : getRecommendationCategory(category).label;

  return (
    <View>
      <Card style={styles.originCard}>
        <Segment<Origin>
          options={[
            { id: 'me', label: '내 위치', icon: 'navigate' },
            { id: 'region', label: '지역에서 찾기', icon: 'map-outline' },
          ]}
          value={origin}
          onChange={setOrigin}
        />
        {origin === 'me' ? (
          <View style={styles.locRow}>
            <View style={[styles.locIcon, location.status === 'ready' && styles.locIconOn]}>
              {location.status === 'locating' ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name={location.status === 'ready' ? 'locate' : 'location-outline'} size={18} color={theme.colors.primary} />
              )}
            </View>
            <View style={styles.locBody}>
              <Text style={styles.locTitle}>{info.title}</Text>
              {info.message ? <Text style={styles.locMessage}>{info.message}</Text> : null}
            </View>
            <Pressable onPress={onLocate} hitSlop={8} style={styles.relocate} disabled={location.status === 'locating'}>
              <Ionicons name="refresh" size={14} color={theme.colors.primaryDark} />
              <Text style={styles.relocateText}>다시 찾기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.regionPick}>
            <Text style={styles.locMessage}>
              {region ? `${region.name} 중심(주요 여행지)에서 찾아요` : '찾아볼 지역을 골라 주세요'}
            </Text>
            <RegionChips value={regionCode} onChange={setRegionCode} />
          </View>
        )}
        {origin === 'me' && location.status === 'denied' && !location.canAskAgain && Platform.OS !== 'web' ? (
          <Pressable onPress={() => void Linking.openSettings()} style={styles.settings}>
            <Text style={styles.settingsText}>설정 열기</Text>
          </Pressable>
        ) : null}
      </Card>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={theme.colors.textSubtle} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="검색어로 찾기 (예: 국밥, 전시, 루프탑)"
          placeholderTextColor={theme.colors.textSubtle}
          style={styles.search}
        />
        {draft ? (
          <Pressable onPress={clearQuery} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSubtle} />
          </Pressable>
        ) : null}
        <Pressable onPress={submit} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>검색</Text>
        </Pressable>
      </View>

      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>반경</Text>
        {NEARBY_RADII.map((r) => (
          <Chip key={r} label={formatDistance(r)} active={radius === r} onPress={() => setRadius(r)} />
        ))}
      </View>

      <CategoryChips value={query ? null : category} onChange={pickCategory} inset={theme.spacing.lg} />

      <View style={styles.results}>
        {point && state.status === 'ready' && state.items.length > 0 ? (
          <Text style={styles.resultTitle}>
            {formatDistance(radius)} 안의 {what} · 가까운 순
          </Text>
        ) : null}
        {point ? (
          <RecommendationResults
            state={state}
            emptyTitle={
              query ? `${formatDistance(radius)} 안에 ${what} 검색 결과가 없어요` : `${formatDistance(radius)} 안에 ${what} 정보가 없어요`
            }
            emptyMessage="반경을 넓히거나 다른 카테고리를 골라 보세요."
            onOpenSaved={onOpenPlace}
            onToast={onToast}
          />
        ) : origin === 'me' && location.status === 'locating' ? null : (
          <Text style={styles.waiting}>위치를 정하면 주변 장소를 보여 드려요.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  originCard: { gap: 12, marginTop: theme.spacing.md },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  locIconOn: { backgroundColor: theme.colors.tint.pillActive },
  locBody: { flex: 1, gap: 2 },
  locTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  locMessage: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17 },
  relocate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.light,
  },
  relocateText: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '800' },
  regionPick: { gap: 8 },
  settings: { alignSelf: 'flex-start' },
  settingsText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.md,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  search: { flex: 1, paddingVertical: 11, color: theme.colors.text, fontSize: 15 },
  searchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
  },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  radiusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 12 },
  radiusLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', marginRight: 2 },
  results: { marginTop: theme.spacing.md },
  resultTitle: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', marginBottom: 8 },
  waiting: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: theme.spacing.xl },
});
