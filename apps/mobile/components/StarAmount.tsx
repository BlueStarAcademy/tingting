import { View, Text, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface Props {
  amount: number | string;
  compact?: boolean;
  iconSize?: number;
  color?: string;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function StarIcon({ size = 16, color = theme.colors.star }: { size?: number; color?: string }) {
  return <Ionicons name="star" size={size} color={color} />;
}

export function StarAmount({
  amount,
  compact,
  iconSize,
  color = theme.colors.star,
  prefix,
  suffix,
  style,
  textStyle,
}: Props) {
  const formatted = typeof amount === 'number' ? amount.toLocaleString() : amount;
  return (
    <View style={[styles.row, compact && styles.rowCompact, style]}>
      <StarIcon size={iconSize ?? (compact ? 13 : 16)} color={color} />
      <Text style={[styles.text, compact && styles.textCompact, { color }, textStyle]}>
        {prefix ? `${prefix} ` : ''}
        {formatted}
        {suffix ? ` ${suffix}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowCompact: {
    gap: 3,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  textCompact: {
    fontSize: 12,
  },
});
