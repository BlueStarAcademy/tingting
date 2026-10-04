import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  COURSE_SLOT_LABELS,
  distanceMeters,
  formatMeters,
  slotCategory,
  type CourseDay,
  type CourseDraft,
  type RecommendedPlace,
} from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { SheetHeader } from '@/components/SheetHeader';
import { SLOT_STYLE } from '@/components/course/course-style';
import { EmptyState } from '@/components/ui';
import { theme } from '@/constants/theme';

/** Alternatives for one stop, closest to the neighbouring stops first. */
export function SwapSheet({
  day,
  index,
  alternatives,
  onPick,
  onClose,
}: {
  day: CourseDay | undefined;
  index: number | null;
  alternatives: CourseDraft['alternatives'];
  onPick: (place: RecommendedPlace) => void;
  onClose: () => void;
}) {
  const stop = day && index !== null ? day.stops[index] : undefined;
  const options = useMemo(() => {
    if (!day || !stop || index === null) return [];
    const prev = index > 0 ? day.stops[index - 1].place : day.start;
    const next = day.stops[index + 1]?.place;
    const detour = (p: RecommendedPlace) =>
      distanceMeters(prev.lat, prev.lng, p.lat, p.lng) + (next ? distanceMeters(p.lat, p.lng, next.lat, next.lng) : 0);
    const pool = alternatives[slotCategory(stop.slot, stop.place.category)] ?? [];
    return pool
      .map((place) => ({ place, detour: detour(place), fromStop: distanceMeters(stop.place.lat, stop.place.lng, place.lat, place.lng) }))
      .sort((a, b) => a.detour - b.detour)
      .slice(0, 12);
  }, [alternatives, day, index, stop]);

  return (
    <AppModal visible={Boolean(stop)} onRequestClose={onClose} sheetStyle={styles.sheet}>
      {stop ? (
        <View style={styles.flex}>
          <SheetHeader title={`${COURSE_SLOT_LABELS[stop.slot]} 바꾸기`} onClose={onClose} />
          <Text style={styles.current} numberOfLines={1}>
            지금: {stop.place.name}
          </Text>
          <ScrollView style={styles.flex} contentContainerStyle={styles.list}>
            {options.length === 0 ? (
              <EmptyState icon="search-outline" title="바꿀 만한 곳이 더 없어요" message="'다시 추천'으로 코스를 새로 받아 보세요." />
            ) : (
              options.map(({ place, fromStop }) => (
                <Pressable key={place.id} onPress={() => onPick(place)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  {place.thumbnailUrl || place.imageUrl ? (
                    <Image source={{ uri: place.thumbnailUrl ?? place.imageUrl }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}>
                      <Ionicons name={SLOT_STYLE[stop.slot].icon} size={20} color={SLOT_STYLE[stop.slot].color} />
                    </View>
                  )}
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {[place.categoryLabel, place.address].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={styles.dist}>{formatMeters(fromStop)}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: { height: '70%' },
  flex: { flex: 1 },
  current: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700', paddingHorizontal: theme.spacing.lg, marginBottom: 8 },
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: { opacity: 0.8 },
  thumb: { width: 46, height: 46, borderRadius: 10, backgroundColor: theme.colors.surfaceLight },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  name: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  sub: { color: theme.colors.textMuted, fontSize: 12 },
  dist: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '800' },
});
