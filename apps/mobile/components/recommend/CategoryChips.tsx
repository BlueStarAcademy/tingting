import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RECOMMENDATION_CATEGORIES, type RecommendationCategory } from '@tingting/shared';
import type { IconName } from '@/components/ui';
import { theme } from '@/constants/theme';

/** One-row, horizontally scrolling category pills; `value` null shows none selected (free-text search). */
export function CategoryChips({
  value,
  onChange,
  inset = 0,
}: {
  value: RecommendationCategory | null;
  onChange: (category: RecommendationCategory) => void;
  /** Horizontal padding so the row can bleed to the screen edge */
  inset?: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
      style={inset ? { marginHorizontal: -inset } : undefined}
    >
      {RECOMMENDATION_CATEGORIES.map((c) => {
        const active = c.id === value;
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && { backgroundColor: c.color, borderColor: c.color }]}
          >
            <Ionicons name={c.icon as IconName} size={14} color={active ? '#fff' : c.color} />
            <Text style={[styles.label, active && styles.labelActive]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surfaceElevated,
  },
  label: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
  labelActive: { color: '#fff', fontWeight: '800' },
});
