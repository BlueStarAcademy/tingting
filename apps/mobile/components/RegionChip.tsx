import { Pressable, Text, StyleSheet } from 'react-native';
import type { Region } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function RegionChip({ region, visited, onPress }: { region: Region; visited?: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        visited && styles.visited,
        { borderColor: visited ? region.color : theme.colors.border },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.text, visited && styles.textVisited]}>{region.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  visited: {
    backgroundColor: theme.colors.tint.strong,
  },
  pressed: { opacity: 0.88 },
  text: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  textVisited: { color: theme.colors.text, fontWeight: '700' },
});
