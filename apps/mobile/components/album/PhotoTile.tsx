import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { thumbUri } from '@/lib/media';
import { theme } from '@/constants/theme';

export const GRID_GAP = 4;
export const GRID_COLUMNS = 3;

export function tileSize(width: number): number {
  return Math.floor((width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
}

type Props = {
  uri: string;
  size: number;
  selecting: boolean;
  selected: boolean;
  edited?: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export const PhotoTile = memo(function PhotoTile({ uri, size, selecting, selected, edited, onPress, onLongPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={[styles.cell, { width: size, height: size }]}
      accessibilityRole="imagebutton"
      accessibilityState={{ selected }}
    >
      <Image source={{ uri: thumbUri(uri, size) }} style={styles.image} resizeMethod="resize" />
      {edited && !selecting ? (
        <View style={styles.editedMark}>
          <Ionicons name="color-wand" size={10} color="#fff" />
        </View>
      ) : null}
      {selecting ? (
        <>
          {selected ? <View style={styles.selectedVeil} /> : null}
          <View style={[styles.check, selected && styles.checkOn]}>
            {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
        </>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    marginBottom: GRID_GAP,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
  },
  image: { width: '100%', height: '100%' },
  editedMark: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224,96,126,0.85)',
  },
  selectedVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(224,96,126,0.28)' },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
});
