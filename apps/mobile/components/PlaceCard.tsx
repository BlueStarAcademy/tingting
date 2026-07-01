import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Place } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

export function PlaceCard({ place, onPress }: { place: Place; onPress: () => void }) {
  const region = getRegion(place.regionCode);
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: region?.color ?? theme.colors.primary }]}>
        <Ionicons name="location" size={20} color="#fff" />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.region}>{region?.name ?? place.regionCode} · {place.category}</Text>
        <Text style={styles.desc} numberOfLines={2}>{place.description}</Text>
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
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  pressed: { opacity: 0.92 },
  badge: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  body: { flex: 1, minWidth: 0 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1, letterSpacing: -0.2 },
  region: { color: theme.colors.primaryDark, fontSize: 12, marginTop: 3, fontWeight: '600' },
  desc: { color: theme.colors.textMuted, fontSize: 13, marginTop: 5, lineHeight: 18 },
});
