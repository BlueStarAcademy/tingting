import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/GradientBackground';
import { ProgressRing } from '@/components/ProgressRing';
import { StarChip } from '@/components/StarChip';
import { GroupCard } from '@/components/GroupCard';
import { PhotoThumb } from '@/components/PhotoThumb';
import { MiniKoreaMap } from '@/components/MiniKoreaMap';
import { api } from '@/lib/api';
import type { HomeDashboard } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [dash, setDash] = useState<HomeDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await api.getHomeDashboard();
    setDash(data);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!dash) return <GradientBackground />;

  const progress = dash.visitedCount / dash.totalRegions;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greet}>안녕, {dash.profile.displayName}</Text>
              <Text style={styles.sub}>전국일주 여행자</Text>
            </View>
            <StarChip stars={dash.profile.stars} onPress={() => router.push('/shop')} />
          </View>

          <View style={styles.progressCard}>
            <ProgressRing progress={progress} label="전국" />
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>전국일주 진행도</Text>
              <Text style={styles.progressCount}>
                {dash.visitedCount} / {dash.totalRegions} 시·도
              </Text>
              <Text style={styles.progressSub}>여행을 이어가며 지도를 완성해 보세요</Text>
              <MiniKoreaMap visitedRegionCodes={dash.profile.visitedRegions} width={140} height={88} />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>여행 그룹</Text>
              <Pressable onPress={() => router.push('/group/create')}>
                <Text style={styles.link}>+ 새 그룹</Text>
              </Pressable>
            </View>
            {dash.groups.length === 0 ? (
              <Text style={styles.empty}>첫 그룹을 만들고 전국일주를 시작해요 — 무료!</Text>
            ) : (
              dash.groups.map((g) => <GroupCard key={g.id} group={g} onPress={() => router.push('/group/' + g.id)} />)
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>최근 사진</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dash.recentVisits.length === 0 ? (
                <Text style={styles.empty}>아직 방문 기록이 없어요 — 지도에서 탐색을 시작해 보세요!</Text>
              ) : (
                dash.recentVisits.map((v) => (
                  <PhotoThumb key={v.id} uri={v.editedPhotoUri ?? v.photoUri} onPress={() => router.push('/editor/' + v.id)} />
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  greet: { color: '#fff', fontSize: 24, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30,27,75,0.7)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.25)',
  },
  progressInfo: { flex: 1, marginLeft: theme.spacing.lg, gap: 4 },
  progressTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  progressCount: { color: theme.colors.star, fontSize: 20, fontWeight: '800' },
  progressSub: { color: theme.colors.textMuted, fontSize: 13, marginBottom: theme.spacing.sm },
  section: { marginBottom: theme.spacing.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: theme.spacing.sm },
  link: { color: theme.colors.primaryLight, fontWeight: '600' },
  empty: { color: theme.colors.textMuted, fontSize: 14 },
});
