import { useState } from 'react';
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
import { useLocale } from '@/hooks/useLocale';
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
  places,
  visits,
  onFocusPlace,
}: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [category, setCategory] = useState<RegionMenuCategory>('food');

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

  const filteredPlaces = places.filter(
    (p) =>
      p.regionCode === region.code &&
      PLACE_CATEGORY_BY_MENU[category]?.includes(p.category)
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.menuGrid}>
        {MENU_KEYS.map((key) => {
          const selected = category === key;
          return (
            <Pressable
              key={key}
              style={[styles.menuItem, selected && styles.menuItemActive]}
              onPress={() => setCategory(key)}
            >
              <Ionicons
                name={menuIcons[key]}
                size={20}
                color={selected ? theme.colors.primaryDark : theme.colors.primaryLight}
              />
              <Text style={[styles.menuLabel, selected && styles.menuLabelActive]}>{menuLabels[key]}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.viewer}>
        <View style={styles.viewerHeader}>
          <Text style={styles.viewerTitle}>{menuLabels[category]}</Text>
          <Text style={styles.viewerHint}>{t('group.referenceInfo')}</Text>
        </View>
        {filteredPlaces.length === 0 ? (
          <Text style={styles.empty}>{t('group.menuEmpty', { category: menuLabels[category] })}</Text>
        ) : (
          filteredPlaces.map((p) => (
            <PlaceCard
              key={p.id}
              place={p}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  menuGrid: { flexDirection: 'row', gap: 6 },
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
  menuItemActive: {
    backgroundColor: theme.colors.tint.pillActive,
    borderColor: theme.colors.primaryLight,
  },
  menuLabel: { color: theme.colors.text, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  menuLabelActive: { color: theme.colors.primaryDark, fontWeight: '800' },
  viewer: {
    minHeight: 180,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  viewerTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  viewerHint: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.lg },
});
