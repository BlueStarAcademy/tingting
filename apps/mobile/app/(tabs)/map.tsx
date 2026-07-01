import { useCallback, useMemo, useState } from 'react';
import { Text, StyleSheet, View, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { REGIONS, type Place, type Region, type Visit } from '@tingting/shared';
import { ScrollableKoreaMap } from '@/components/ScrollableKoreaMap';
import { RegionProgressModal } from '@/components/RegionProgressModal';
import { RegionChip } from '@/components/RegionChip';
import { PlaceCard } from '@/components/PlaceCard';
import { TabPage } from '@/components/TabPage';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { getNationalTravelProgress, getRegionTravelProgress } from '@/lib/travel-progress';
import { theme } from '@/constants/theme';

export default function MapScreen() {
  const router = useRouter();
  const { profile, refresh: refreshAuth } = useAuth();
  const { t } = useLocale();
  const [places, setPlaces] = useState<Place[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [modalRegion, setModalRegion] = useState<Region | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const visited = profile?.visitedRegions ?? [];
  const national = useMemo(() => getNationalTravelProgress(visited), [visited]);

  const regionProgress = useMemo(() => {
    if (!modalRegion) return { visited: 0, total: 0, ratio: 0 };
    return getRegionTravelProgress(modalRegion.code, allPlaces, visits, visited);
  }, [modalRegion, allPlaces, visits, visited]);

  const load = async () => {
    const [placeList, visitList] = await Promise.all([api.getPlaces(), api.getVisits()]);
    setAllPlaces(placeList);
    setVisits(visitList);
    setPlaces(await api.getPlaces(selected ?? undefined));
    await refreshAuth();
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [selected])
  );

  const openRegion = (region: Region) => {
    setSelected(region.code);
    setModalRegion(region);
  };

  const closeModal = () => {
    setModalRegion(null);
  };

  return (
    <TabPage
      nestedScrollEnabled
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      contentContainerStyle={styles.scroll}
    >
      <PageHeader title={t('map.title')} subtitle={t('map.sub')} />

      <ScrollableKoreaMap
        visitedRegionCodes={visited}
        selectedCode={selected}
        onRegionPress={openRegion}
        showLabels
        nationalProgress={national.ratio}
        nationalVisited={national.visited}
        nationalTotal={national.total}
      />

      <View style={styles.legend}>
        <Text style={styles.hint}>{t('map.panHint')}</Text>
        <Text style={styles.hint}>{t('map.tapRegion')}</Text>
      </View>

      <View style={styles.chips}>
        <RegionChip
          region={{ code: 'ALL', name: t('map.all'), nameEn: 'All', color: theme.colors.primary }}
          visited
          onPress={() => {
            setSelected(null);
            closeModal();
          }}
        />
        {REGIONS.map((r) => (
          <RegionChip
            key={r.code}
            region={r}
            visited={visited.includes(r.code)}
            onPress={() => openRegion(r)}
          />
        ))}
      </View>

      {places.map((p) => (
        <PlaceCard key={p.id} place={p} onPress={() => router.push(`/place/${p.id}` as Href)} />
      ))}

      <RegionProgressModal
        visible={modalRegion != null}
        region={modalRegion}
        progress={regionProgress.ratio}
        visitedCount={regionProgress.visited}
        totalCount={regionProgress.total}
        regionVisited={modalRegion ? visited.includes(modalRegion.code) : false}
        onClose={closeModal}
        onViewPlaces={() => {
          if (!modalRegion) return;
          closeModal();
          router.push(`/region/${modalRegion.code}` as Href);
        }}
      />
    </TabPage>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 0, gap: theme.spacing.sm },
  legend: { gap: 4, paddingHorizontal: theme.spacing.xs },
  hint: { color: theme.colors.textMuted, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
});
