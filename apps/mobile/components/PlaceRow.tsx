import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPlaceCategory, getRegion, type Place } from '@tingting/shared';
import { CategoryBadge, type IconName } from '@/components/ui';
import { formatDateRange } from '@/lib/dates';
import { thumbUri } from '@/lib/media';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

export function PlaceCover({ place, size }: { place: Place; size: number }) {
  const info = getPlaceCategory(place.category);
  if (place.coverPhotoUri) {
    return (
      <Image
        source={{ uri: thumbUri(place.coverPhotoUri, size) }}
        style={{ width: size, height: size, borderRadius: 14 }}
        resizeMethod="resize"
      />
    );
  }
  return (
    <View style={[styles.coverFallback, { width: size, height: size, backgroundColor: `${info.color}22` }]}>
      <Ionicons name={info.icon as IconName} size={size * 0.38} color={info.color} />
    </View>
  );
}

export function PlaceRow({ place, onPress, showRegion }: { place: Place; onPress: () => void; showRegion?: boolean }) {
  const eventRange = place.category === 'event' ? formatDateRange(place.eventStart, place.eventEnd) : null;
  const region = showRegion ? getRegion(place.regionCode) : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <PlaceCover place={place} size={64} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          {place.status === 'visited' ? (
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
          ) : (
            <Ionicons name="heart-outline" size={17} color={theme.colors.primaryLight} />
          )}
        </View>
        <View style={styles.metaRow}>
          <CategoryBadge category={place.category} small />
          {region ? <Text style={styles.meta}>{region.name}</Text> : null}
          {place.photoCount ? (
            <View style={styles.photoCount}>
              <Ionicons name="images-outline" size={11} color={theme.colors.textMuted} />
              <Text style={styles.meta}>{place.photoCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {eventRange ?? place.address ?? place.memo ?? ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...cardSurface(),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    marginBottom: 10,
  },
  pressed: { opacity: 0.85 },
  coverFallback: { borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  photoCount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sub: { color: theme.colors.textSubtle, fontSize: 12 },
});
