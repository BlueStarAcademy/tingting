import { Pressable, Text, StyleSheet } from 'react-native';
import type { Region } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function RegionChip({ region, visited, onPress }: { region: Region; visited?: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, visited && styles.visited, { borderColor: region.color }]}
      onPress={onPress}
    >
      <Text style={[styles.text, visited && styles.textVisited]}>{region.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    backgroundColor: 'rgba(30,27,75,0.8)',
    marginRight: 8,
    marginBottom: 8,
  },
  visited: { backgroundColor: 'rgba(99,102,241,0.35)' },
  text: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  textVisited: { color: theme.colors.text },
});
