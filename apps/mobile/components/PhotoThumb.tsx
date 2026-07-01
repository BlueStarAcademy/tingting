import { Image, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

export function PhotoThumb({ uri, onPress }: { uri: string; onPress?: () => void }) {
  const inner = <Image source={{ uri }} style={styles.img} />;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.wrap}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.wrap}>{inner}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  img: { width: '100%', height: '100%' },
});
