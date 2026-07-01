import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getRegion,
  PLACE_CATEGORY_BY_MENU,
  type Place,
  type Region,
  type RegionMenuCategory,
} from '@tingting/shared';
import { KoreaMapPicker } from '@/components/group/KoreaMapPicker';
import { PlaceCard } from '@/components/PlaceCard';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visitedRegionCodes: string[];
  places: Place[];
}

const MENU_KEYS: RegionMenuCategory[] = ['food', 'stay', 'play', 'sight', 'event'];

export function GroupMapTab({ visitedRegionCodes, places }: Props) {
  const { t, locale } = useLocale();
  const [selected, setSelected] = useState<Region | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<RegionMenuCategory | null>(null);

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

  const onRegionPress = (region: Region) => {
    setSelected(region);
    setCategory(null);
    setMenuOpen(true);
  };

  const filteredPlaces = selected && category
    ? places.filter(
        (p) =>
          p.regionCode === selected.code &&
          PLACE_CATEGORY_BY_MENU[category]?.includes(p.category)
      )
    : [];

  const regionLabel = selected
    ? locale === 'en' && selected.nameEn
      ? selected.nameEn
      : selected.name
    : '';

  return (
    <View style={styles.wrap}>
      <KoreaMapPicker
        visitedRegionCodes={visitedRegionCodes}
        selectedCode={selected?.code}
        onRegionPress={onRegionPress}
      />

      <Modal visible={menuOpen} animationType="slide" transparent onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{regionLabel}</Text>
            <Pressable onPress={() => setMenuOpen(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          {selected ? (
            <>
              <View style={[styles.badge, visitedRegionCodes.includes(selected.code) && styles.badgeVisited]}>
                <Text style={styles.badgeText}>
                  {visitedRegionCodes.includes(selected.code) ? t('region.visited') : t('region.notVisited')}
                </Text>
              </View>
              <Text style={styles.sub}>
                {getRegion(selected.code)?.nameEn ?? ''} · {t('region.placeCount', {
                  count: places.filter((p) => p.regionCode === selected.code).length,
                })}
              </Text>
            </>
          ) : null}

          {!category ? (
            <View style={styles.menuGrid}>
              {MENU_KEYS.map((key) => (
                <Pressable key={key} style={styles.menuItem} onPress={() => setCategory(key)}>
                  <Ionicons name={menuIcons[key]} size={24} color={theme.colors.primaryLight} />
                  <Text style={styles.menuLabel}>{menuLabels[key]}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              <Pressable style={styles.backMenu} onPress={() => setCategory(null)}>
                <Ionicons name="arrow-back" size={18} color={theme.colors.primaryLight} />
                <Text style={styles.backMenuText}>{menuLabels[category]}</Text>
              </Pressable>
              {filteredPlaces.length === 0 ? (
                <Text style={styles.empty}>{t('group.menuEmpty', { category: menuLabels[category] })}</Text>
              ) : (
                filteredPlaces.map((p) => <PlaceCard key={p.id} place={p} onPress={() => {}} />)
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md, alignItems: 'stretch', alignSelf: 'stretch' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  sheetTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.sm,
  },
  badgeVisited: { backgroundColor: 'rgba(52,211,153,0.2)' },
  badgeText: { color: theme.colors.text, fontWeight: '600', fontSize: 13 },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.md, fontSize: 13 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  menuItem: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    minWidth: 90,
  },
  menuLabel: { color: theme.colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  list: { maxHeight: 320 },
  backMenu: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.spacing.sm },
  backMenuText: { color: theme.colors.primaryLight, fontSize: 15, fontWeight: '700' },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.lg },
});
