import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getRegion, REGIONS, TOTAL_REGIONS } from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { PlaceCover } from '@/components/PlaceRow';
import { Card, CategoryBadge, EmptyState, Loading, SectionTitle } from '@/components/ui';
import { PhotoGrid } from '@/components/PhotoGrid';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { dDayLabel, formatDateKey } from '@/lib/dates';
import { cardSurface, shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

const STAMPS_PER_ROW = 6;
const STAMP_GAP = 6;

export default function HomeScreen() {
  const router = useRouter();
  const { user, partner } = useAuth();
  const contentWidth = useContentWidth();
  const innerWidth = contentWidth - theme.spacing.lg * 2;
  const { data, error, refreshing, refresh } = useFocusLoad(() => api.getDashboard());

  const visitedCount = data?.visitedRegionCodes.length ?? 0;
  const progress = visitedCount / TOTAL_REGIONS;
  const visited = new Set(data?.visitedRegionCodes ?? []);
  // 2px for the card border
  const stampWidth = Math.floor((innerWidth - theme.spacing.md * 2 - 2 - STAMP_GAP * (STAMPS_PER_ROW - 1)) / STAMPS_PER_ROW);

  return (
    <Screen tab title="TingTing" refreshing={refreshing} onRefresh={refresh}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, shadow('md')]}
      >
        <Text style={styles.couple}>
          {user?.displayName ?? '나'} <Text style={styles.heart}>♥</Text> {partner?.displayName ?? '너'}
        </Text>
        <Text style={styles.heroTitle}>우리의 전국일주</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.heroSub}>
          {TOTAL_REGIONS}개 지역 중 {visitedCount}곳 다녀왔어요 · {Math.round(progress * 100)}%
        </Text>
        <View style={styles.stats}>
          <Stat label="저장한 장소" value={data?.placeCount ?? 0} />
          <Stat label="다녀온 곳" value={data?.visitedPlaceCount ?? 0} />
          <Stat label="사진" value={data?.photoCount ?? 0} />
        </View>
      </LinearGradient>

      {error && !data ? <Text style={styles.error}>{error}</Text> : null}
      {!data && !error ? <Loading /> : null}

      <SectionTitle title="전국일주 도장판" action="지도 보기" onAction={() => router.push('/map')} />
      <Pressable
        style={({ pressed }) => [styles.stampCard, pressed && styles.pressed]}
        onPress={() => router.push('/map')}
        accessibilityRole="button"
        accessibilityLabel={`전국일주 지도 보기, ${TOTAL_REGIONS}개 지역 중 ${visitedCount}곳 방문`}
      >
        <View style={styles.stampGrid}>
          {REGIONS.map((region) => {
            const on = visited.has(region.code);
            return (
              <View key={region.code} style={[styles.stamp, { width: stampWidth }, on && styles.stampOn]}>
                <Text style={[styles.stampText, on && styles.stampTextOn]}>{region.name}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.stampFooter}>
          <View style={styles.stampIcon}>
            <Ionicons name="map" size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.stampHint}>지도에서 색칠된 곳을 보고, 지역별 맛집 · 놀거리 · 행사를 찾아보세요</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} />
        </View>
      </Pressable>

      <SectionTitle title="다가오는 일정" action="전체" onAction={() => router.push('/plans')} />
      {data && data.upcomingPlans.length === 0 ? (
        <Card>
          <Text style={styles.muted}>예정된 일정이 없어요. 다음 여행을 계획해 볼까요?</Text>
        </Card>
      ) : (
        data?.upcomingPlans.map((plan) => (
          <Pressable
            key={plan.id}
            style={styles.planRow}
            onPress={() => (plan.placeId ? router.push(`/place/${plan.placeId}` as Href) : router.push('/plans'))}
          >
            <View style={styles.dday}>
              <Text style={styles.ddayText}>{dDayLabel(plan.date)}</Text>
            </View>
            <View style={styles.planBody}>
              <Text style={styles.planTitle} numberOfLines={1}>
                {plan.title}
              </Text>
              <Text style={styles.planSub} numberOfLines={1}>
                {formatDateKey(plan.date)}
                {plan.placeName ? ` · ${plan.placeName}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} />
          </Pressable>
        ))
      )}

      <SectionTitle title="가고 싶은 곳" />
      {data && data.wishPlaces.length === 0 ? (
        <Card>
          <Text style={styles.muted}>지도에서 지역을 눌러 맛집, 놀거리, 행사, 숙소를 담아 두세요.</Text>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wishRow}>
          {data?.wishPlaces.map((place) => (
            <Pressable key={place.id} style={styles.wishCard} onPress={() => router.push(`/place/${place.id}` as Href)}>
              <PlaceCover place={place} size={132} />
              <Text style={styles.wishName} numberOfLines={1}>
                {place.name}
              </Text>
              <View style={styles.wishMeta}>
                <CategoryBadge category={place.category} small />
                <Text style={styles.wishRegion}>{getRegion(place.regionCode)?.name}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <SectionTitle title="최근 사진" action="앨범" onAction={() => router.push('/album')} />
      {data && data.recentPhotos.length === 0 ? (
        <EmptyState icon="camera-outline" title="아직 사진이 없어요" message="가운데 카메라 버튼으로 첫 사진을 남겨 보세요." />
      ) : data ? (
        <PhotoGrid photos={data.recentPhotos} width={innerWidth} onPress={(photo) => router.push(`/photo/${photo.id}` as Href)} />
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: theme.radius.xl, padding: theme.spacing.lg, gap: 8 },
  couple: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '700' },
  heart: { color: '#fff' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 4, backgroundColor: '#fff' },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '600' },
  stats: { flexDirection: 'row', marginTop: 8, gap: 8 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: theme.radius.md, backgroundColor: 'rgba(255,255,255,0.18)' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  error: { color: theme.colors.error, textAlign: 'center', marginTop: theme.spacing.md },
  pressed: { opacity: 0.88 },
  stampCard: { ...cardSurface(), padding: theme.spacing.md, gap: 12 },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: STAMP_GAP },
  stamp: {
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.background,
  },
  stampOn: { borderStyle: 'solid', borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  stampText: { color: theme.colors.textSubtle, fontSize: 12, fontWeight: '800' },
  stampTextOn: { color: '#fff' },
  stampFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stampIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  stampHint: { flex: 1, color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  muted: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  planRow: { ...cardSurface(), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8 },
  dday: {
    minWidth: 58,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  ddayText: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '900' },
  planBody: { flex: 1, gap: 2 },
  planTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  planSub: { color: theme.colors.textMuted, fontSize: 12 },
  wishRow: { gap: 12, paddingRight: theme.spacing.lg },
  wishCard: { width: 132, gap: 6 },
  wishName: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  wishMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wishRegion: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
});
