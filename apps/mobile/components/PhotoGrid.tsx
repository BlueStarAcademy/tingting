import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Photo } from '@tingting/shared';
import { displayUri } from '@/lib/photo-flow';
import { theme } from '@/constants/theme';

const GAP = 4;

export function PhotoGrid({
  photos,
  width,
  columns = 3,
  onPress,
}: {
  photos: Photo[];
  width: number;
  columns?: number;
  onPress: (photo: Photo) => void;
}) {
  const size = Math.floor((width - GAP * (columns - 1)) / columns);
  return (
    <View style={styles.grid}>
      {photos.map((photo, index) => (
        <Pressable
          key={photo.id}
          onPress={() => onPress(photo)}
          style={[
            styles.cell,
            { width: size, height: size, marginRight: (index + 1) % columns === 0 ? 0 : GAP },
          ]}
        >
          <Image source={{ uri: displayUri(photo) }} style={styles.image} />
          {photo.editedUri ? (
            <View style={styles.editedMark}>
              <Ionicons name="color-wand" size={10} color="#fff" />
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    marginBottom: GAP,
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
});
