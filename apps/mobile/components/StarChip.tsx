import { View, StyleSheet, Pressable } from 'react-native';
import { StarAmount } from '@/components/StarAmount';
import { shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

export function StarChip({
  stars,
  onPress,
  compact,
}: {
  stars: number;
  onPress?: () => void;
  compact?: boolean;
}) {
  const content = (
    <StarAmount amount={stars} compact={compact} />
  );
  const chipStyle = [styles.chip, shadow('sm'), compact && styles.chipCompact];
  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [...chipStyle, pressed && styles.pressed]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={chipStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.starGlow,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  chipCompact: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 3,
  },
  pressed: { opacity: 0.9 },
});
