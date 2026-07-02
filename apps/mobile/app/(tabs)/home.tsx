import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { TabPage } from '@/components/TabPage';
import { ProfileSection } from '@/components/ProfileSection';
import { GroupSlotGrid } from '@/components/GroupSlotGrid';
import { RecommendedPlacesSection } from '@/components/RecommendedPlacesSection';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { HomeDashboard } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function HomeScreen() {
  const { refresh: refreshAuth } = useAuth();
  const [dash, setDash] = useState<HomeDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await api.getHomeDashboard();
    setDash(data);
    await refreshAuth();
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

  return (
    <GradientBackground>
      <TabPage
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <ProfileSection profile={dash.profile} onUpdated={load} embedded />
        <GroupSlotGrid profile={dash.profile} groups={dash.groups} onUpdated={load} />
        <RecommendedPlacesSection />
      </TabPage>
    </GradientBackground>
  );
}
