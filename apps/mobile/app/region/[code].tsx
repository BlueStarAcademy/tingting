import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getRegion } from '@tingting/shared';
import { PlaceCard } from '@/components/PlaceCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/lib/api';
import type { Place } from '@tingting/shared';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function RegionScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const region = getRegion(code);

  useFocusEffect(
    useCallback(() => {
      api.getPlaces(code).then(setPlaces);
    }, [code])
  );

  const visited = profile?.visitedRegions.includes(code);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={region?.name ?? code} showBack />
        <Text style={styles.sub}>{region?.nameEn}</Text>
        <View style={[styles.badge, visited && styles.badgeVisited]}>
          <Text style={styles.badgeText}>{visited ? 'Visited' : 'Not visited yet'}</Text>
        </View>
        <Text style={styles.count}>{places.length} places</Text>
        {places.map((p) => (
          <PlaceCard key={p.id} place={p} onPress={() => router.push('/place/' + p.id)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  badge: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.full, marginBottom: theme.spacing.md },
  badgeVisited: { backgroundColor: 'rgba(52,211,153,0.2)' },
  badgeText: { color: theme.colors.text, fontWeight: '600' },
  count: { color: theme.colors.primaryLight, marginBottom: theme.spacing.md },
});
