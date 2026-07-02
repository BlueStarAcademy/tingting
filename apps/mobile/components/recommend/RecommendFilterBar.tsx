import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REGIONS } from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { useLocale } from '@/hooks/useLocale';
import {
  DEFAULT_RECOMMEND_FILTERS,
  RECOMMEND_CATEGORY_FILTERS,
  getRegionLabel,
  hasActiveRecommendFilters,
  type RecommendCategoryFilter,
  type RecommendFilterState,
} from '@/lib/recommend-filter';
import { tabPill } from '@/lib/ui';
import { theme } from '@/constants/theme';

interface Props {
  filters: RecommendFilterState;
  onChange: (next: RecommendFilterState) => void;
}

const CATEGORY_LABEL_KEYS: Record<RecommendCategoryFilter, string> = {
  food: 'recommend.categoryFood',
  sight: 'recommend.categorySight',
  play: 'recommend.categoryPlay',
  stay: 'recommend.categoryStay',
};

export function RecommendFilterBar({ filters, onChange }: Props) {
  const { t, locale } = useLocale();
  const [regionOpen, setRegionOpen] = useState(false);

  const regionLabel =
    filters.regionCode == null
      ? t('recommend.allRegions')
      : getRegionLabel(filters.regionCode, locale);

  const toggleCategory = (category: RecommendCategoryFilter) => {
    const exists = filters.categories.includes(category);
    const categories = exists
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category];
    onChange({ ...filters, categories });
  };

  const resetFilters = () => onChange({ ...DEFAULT_RECOMMEND_FILTERS, sort: filters.sort });

  return (
    <View style={styles.wrap}>
      <View style={styles.sortRow}>
        <Pressable
          style={[tabPill(filters.sort === 'latest'), styles.sortChip]}
          onPress={() => onChange({ ...filters, sort: 'latest' })}
        >
          <Text style={[styles.chipText, filters.sort === 'latest' && styles.chipTextActive]}>
            {t('recommend.sortLatest')}
          </Text>
        </Pressable>
        <Pressable
          style={[tabPill(filters.sort === 'recommended'), styles.sortChip]}
          onPress={() => onChange({ ...filters, sort: 'recommended' })}
        >
          <Text style={[styles.chipText, filters.sort === 'recommended' && styles.chipTextActive]}>
            {t('recommend.sortRecommended')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchEventRow}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={filters.query}
            onChangeText={(query) => onChange({ ...filters, query })}
            placeholder={t('recommend.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSubtle}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {filters.query.length > 0 ? (
            <Pressable onPress={() => onChange({ ...filters, query: '' })} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSubtle} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={styles.eventChip}
          onPress={() => onChange({ ...filters, includeEvents: !filters.includeEvents })}
        >
          <Ionicons
            name={filters.includeEvents ? 'checkbox' : 'square-outline'}
            size={18}
            color={filters.includeEvents ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text style={styles.eventText} numberOfLines={1}>
            {t('recommend.includeEvents')}
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable style={styles.regionButton} onPress={() => setRegionOpen(true)}>
          <Ionicons name="map-outline" size={15} color={theme.colors.primaryLight} />
          <Text style={styles.regionButtonText} numberOfLines={1}>
            {regionLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
        </Pressable>

        <Pressable
          style={[tabPill(filters.categories.length === 0), styles.chip]}
          onPress={() => onChange({ ...filters, categories: [] })}
        >
          <Text style={[styles.chipText, filters.categories.length === 0 && styles.chipTextActive]}>
            {t('recommend.allCategories')}
          </Text>
        </Pressable>

        {RECOMMEND_CATEGORY_FILTERS.map((category) => {
          const active = filters.categories.includes(category);
          return (
            <Pressable
              key={category}
              style={[tabPill(active), styles.chip]}
              onPress={() => toggleCategory(category)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(CATEGORY_LABEL_KEYS[category])}
              </Text>
            </Pressable>
          );
        })}

        {hasActiveRecommendFilters(filters) ? (
          <Pressable style={styles.resetChip} onPress={resetFilters}>
            <Ionicons name="refresh" size={14} color={theme.colors.primaryLight} />
            <Text style={styles.resetText}>{t('recommend.clearFilters')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <AppModal visible={regionOpen} animationType="fade" onRequestClose={() => setRegionOpen(false)} variant="center">
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('recommend.filterRegion')}</Text>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            <Pressable
              style={[styles.regionOpt, filters.regionCode == null && styles.regionOptActive]}
              onPress={() => {
                onChange({ ...filters, regionCode: null });
                setRegionOpen(false);
              }}
            >
              <Text style={[styles.regionOptText, filters.regionCode == null && styles.regionOptTextActive]}>
                {t('recommend.allRegions')}
              </Text>
              {filters.regionCode == null ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.primaryLight} />
              ) : null}
            </Pressable>
            {REGIONS.map((region) => {
              const active = filters.regionCode === region.code;
              const label = getRegionLabel(region.code, locale);
              return (
                <Pressable
                  key={region.code}
                  style={[styles.regionOpt, active && styles.regionOptActive]}
                  onPress={() => {
                    onChange({ ...filters, regionCode: region.code });
                    setRegionOpen(false);
                  }}
                >
                  <Text style={[styles.regionOptText, active && styles.regionOptTextActive]}>{label}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color={theme.colors.primaryLight} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  searchEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  searchRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: theme.spacing.sm,
  },
  regionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 148,
  },
  regionButtonText: {
    flexShrink: 1,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  chipText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: '800',
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxWidth: 112,
  },
  eventText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resetText: {
    color: theme.colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  modalSheet: {
    padding: theme.spacing.md,
    maxHeight: 420,
    minWidth: 280,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  modalList: {
    maxHeight: 340,
  },
  regionOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLight,
  },
  regionOptActive: {
    backgroundColor: theme.colors.tint.soft,
  },
  regionOptText: {
    color: theme.colors.text,
    fontSize: 15,
  },
  regionOptTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
});
