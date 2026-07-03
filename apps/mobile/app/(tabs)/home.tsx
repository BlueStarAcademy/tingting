import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { TabPage } from '@/components/TabPage';
import { ProfileSection } from '@/components/ProfileSection';
import { GroupSlotGrid } from '@/components/GroupSlotGrid';
import { RecommendedPlacesSection } from '@/components/RecommendedPlacesSection';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { HomeDashboard } from '@tingting/shared';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function HomeScreen() {
  const { refresh: refreshAuth } = useAuth();
  const { t } = useLocale();
  const [dash, setDash] = useState<HomeDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const data = await api.getHomeDashboard();
      setDash(data);
      await refreshAuth();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading && !dash) {
    return (
      <GradientBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primaryLight} />
        </View>
      </GradientBackground>
    );
  }

  if (error && !dash) {
    return (
      <GradientBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textMuted, textAlign: 'center' }}>{error}</Text>
          <PremiumButton title={t('common.retry')} onPress={() => { setLoading(true); load(); }} />
        </View>
      </GradientBackground>
    );
  }

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
