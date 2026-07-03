import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  PLACE_CATEGORY_BY_MENU,
  type Place,
  type Region,
  type RegionMenuCategory,
  type Visit,
} from '@tingting/shared';
import { PlaceCard } from '@/components/PlaceCard';
import { TravelProgressBar } from '@/components/TravelProgressBar';
import { PremiumIconLabelButton } from '@/components/PremiumIconButton';
import { useLocale } from '@/hooks/useLocale';
import {
  getCategoryMaxProgressPercent,
  getPlaceProgressPercent,
  getRegionTravelProgress,
} from '@/lib/travel-progress';
import { theme } from '@/constants/theme';

const MENU_KEYS: RegionMenuCategory[] = ['food', 'stay', 'play', 'sight', 'event'];

interface Props {
  region: Region;
  visitedRegionCodes: string[];
  places: Place[];
  visits: Visit[];
  onFocusPlace?: (place: Place) => void;
}

export function GroupPlacesPanel({
  region,
  visitedRegionCodes,
  places,
  visits,
  onFocusPlace,
}: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [category, setCategory] = useState<RegionMenuCategory | null>(null);

  const visitedPlaceIds = useMemo(() => new Set(visits.map((v) => v.placeId)), [visits]);

  const regionProgress = useMemo(
    () => getRegionTravelProgress(region.code, places, visits, visitedRegionCodes),
    [region.code, places, visits, visitedRegionCodes]
  );

  const placeProgressPercent = getPlaceProgressPercent(region.code, places);

  const menuLabels: Record<RegionMenuCategory, string> = {
    food: t('group.menuFood'),
    stay: t('group.menuStay'),
    play: t('group.menuPlay'),
    sight: t('group.menuSight'),
    event: t('group.menuEvent'),
  };

  const menuIcons: Record<RegionMenuCategory, keyof typeof Ionicons.glyphMap> = {
    food: 'restaurant-outline',
    stay: 'bed-outline',
    play: 'game-controller-outline',
    sight: 'eye-outline',
    event: 'calendar-outline',
  };

  const filteredPlaces =
    category != null
      ? places.filter(
          (p) =>
            p.regionCode === region.code &&
            PLACE_CATEGORY_BY_MENU[category]?.includes(p.category)
        )
      : [];

  return (
    <View style={styles.wrap}>
      <TravelProgressBar
        title={t('map.regionProgressTitle')}
        subtitle={t('map.regionProgressSub', {
          visited: regionProgress.visited,
          total: regionProgress.total,
        })}
        inlineSubtitle
        progress={regionProgress.ratio}
        accentColor={region.color}
      />

      {!category ? (
        <View style={styles.menuGrid}>
          {MENU_KEYS.map((key) => {
            const categoryPercent = getCategoryMaxProgressPercent(region.code, key, places);
            return (
              <Pressable key={key} style={styles.menuItem} onPress={() => setCategory(key)}>
                <Ionicons name={menuIcons[key]} size={20} color={theme.colors.primaryLight} />
                <Text style={styles.menuLabel}>{menuLabels[key]}</Text>
                {categoryPercent > 0 ? (
                  <Text style={styles.menuProgress}>
                    {t('group.categoryProgressGain', { percent: categoryPercent })}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          <PremiumIconLabelButton
            icon={<Ionicons name="arrow-back" size={18} color={theme.colors.primaryLight} />}
            label={menuLabels[category]}
            onPress={() => setCategory(null)}
            style={styles.backMenu}
          />
          {filteredPlaces.length === 0 ? (
            <Text style={styles.empty}>{t('group.menuEmpty', { category: menuLabels[category] })}</Text>
          ) : (
            filteredPlaces.map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                progressPercent={placeProgressPercent}
                progressVisited={visitedPlaceIds.has(p.id)}
                onPress={() => {
                  if (onFocusPlace) {
                    onFocusPlace(p);
                  } else {
                    router.push(`/place/${p.id}`);
                  }
                }}
              />
            ))
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  menuGrid: { flexDirection: 'row', gap: 6, marginTop: theme.spacing.xs },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  menuLabel: { color: theme.colors.text, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  menuProgress: { color: theme.colors.primaryLight, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  backMenu: { marginTop: theme.spacing.xs },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.lg },
});
