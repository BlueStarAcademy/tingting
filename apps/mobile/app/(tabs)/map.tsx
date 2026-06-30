import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REGIONS } from '@tingting/shared';
import { RegionChip } from '@/components/RegionChip';
import { PlaceCard } from '@/components/PlaceCard';
import { api } from '@/lib/api';
import type { Place } from '@tingting/shared';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function MapScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setPlaces(await api.getPlaces(selected ?? undefined));
  };

  useFocusEffect(useCallback(() => { load(); }, [selected]));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Korea Map</Text>
        <Text style={styles.sub}>17 regions · tap to filter places</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <RegionChip region={{ code: 'ALL', name: 'All', nameEn: 'All', color: theme.colors.primary }} visited onPress={() => setSelected(null)} />
          {REGIONS.map((r) => (
            <RegionChip key={r.code} region={r} visited={profile?.visitedRegions.includes(r.code)} onPress={() => { setSelected(r.code); router.push('/region/' + r.code); }} />
          ))}
        </ScrollView>
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
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  chips: { marginBottom: theme.spacing.md },
});
