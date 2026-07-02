import { Text, StyleSheet, ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { PremiumPressable } from '@/components/PremiumPressable';
import { type PremiumSize, type PremiumVariant } from '@/lib/premium-pressable-styles';
import { theme } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: PremiumVariant;
  size?: PremiumSize;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function PremiumButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  size = 'md',
  compact,
  style,
  fullWidth = true,
}: Props) {
  const isDisabled = loading || disabled;
  const isPrimary = variant === 'primary' || variant === 'danger';

  return (
    <PremiumPressable
      onPress={onPress}
      disabled={isDisabled}
      variant={variant}
      size={size}
      compact={compact}
      fullWidth={fullWidth}
      style={style}
      accessibilityLabel={title}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={isPrimary ? '#fff' : theme.colors.primaryDark} />
        ) : (
          <Text style={[styles.text, !isPrimary && styles.textOutline, variant === 'danger' && styles.textPrimary]}>
            {title}
          </Text>
        )}
      </View>
    </PremiumPressable>
  );
}

const styles = StyleSheet.create({
  content: {
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textOutline: {
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#fff',
    fontWeight: '700',
  },
});
