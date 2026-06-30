import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Place } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function PlaceCard({ place, onPress }: { place: Place; onPress: () => void }) {
  const region = getRegion(place.regionCode);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: region?.color ?? theme.colors.primary }]}>
        <Ionicons name="location" size={20} color="#fff" />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.region}>{region?.name ?? place.regionCode} · {place.category}</Text>
        <Text style={styles.desc} numberOfLines={2}>{place.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.15)',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  body: { flex: 1 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  region: { color: theme.colors.primaryLight, fontSize: 12, marginTop: 2 },
  desc: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
});
