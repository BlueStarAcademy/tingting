import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Place } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { getPlaceImageUrl } from '@/lib/place-images';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

export function PlaceCard({
  place,
  onPress,
  progressPercent,
  progressVisited,
}: {
  place: Place;
  onPress: () => void;
  progressPercent?: number;
  progressVisited?: boolean;
}) {
  const region = getRegion(place.regionCode);
  const imageUri = getPlaceImageUrl(place);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.thumbWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: region?.color ?? theme.colors.surfaceLight }]}>
            <Ionicons name="image-outline" size={22} color={theme.colors.textSubtle} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.region} numberOfLines={1}>
          {region?.name ?? place.regionCode} · {place.category}
        </Text>
        <Text style={styles.desc} numberOfLines={2}>
          {place.description}
        </Text>
        {progressPercent != null ? (
          <Text style={[styles.progress, progressVisited && styles.progressDone]}>
            {progressVisited ? `✓ +${progressPercent}%` : `+${progressPercent}%`}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface(),
    flexDirection: 'row',
    width: '100%',
    maxWidth: '100%',
    alignItems: 'center',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  pressed: { opacity: 0.92 },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceLight,
    flexShrink: 0,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  region: { color: theme.colors.primaryDark, fontSize: 12, marginTop: 3, fontWeight: '600' },
  desc: { color: theme.colors.textMuted, fontSize: 13, marginTop: 5, lineHeight: 18 },
  progress: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '700', marginTop: 6 },
  progressDone: { color: theme.colors.success },
});
