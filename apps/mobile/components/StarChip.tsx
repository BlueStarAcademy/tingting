import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

export function StarChip({ stars, onPress }: { stars: number; onPress?: () => void }) {
  const content = (
    <>
      <Ionicons name="star" size={16} color={theme.colors.star} />
      <Text style={styles.text}>{stars}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable style={styles.chip} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.chip}>{content}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  text: { color: theme.colors.star, fontWeight: '700', fontSize: 15 },
});
