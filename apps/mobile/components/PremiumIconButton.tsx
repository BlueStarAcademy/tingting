import type { ReactNode } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PremiumPressable } from '@/components/PremiumPressable';
import { getIconSize, type PremiumSize, type PremiumVariant } from '@/lib/premium-pressable-styles';
import { theme } from '@/constants/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: PremiumSize;
  variant?: PremiumVariant;
  color?: string;
  iconSize?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  badge?: number | string;
  style?: StyleProp<ViewStyle>;
}

export function PremiumIconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'soft',
  color = theme.colors.text,
  iconSize,
  disabled,
  accessibilityLabel,
  badge,
  style,
}: Props) {
  const dim = getIconSize(size);
  const glyph = iconSize ?? (size === 'sm' ? 16 : size === 'lg' ? 22 : 18);

  return (
    <View style={style}>
      <PremiumPressable
        onPress={onPress}
        disabled={disabled}
        variant={variant}
        size={size}
        shape="circle"
        compact
        accessibilityLabel={accessibilityLabel}
        faceStyle={{ width: dim, height: dim, borderRadius: dim / 2 }}
      >
        <Ionicons name={icon} size={glyph} color={color} />
      </PremiumPressable>
      {badge != null && Number(badge) > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{typeof badge === 'number' && badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

interface TextButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PremiumTextButton({ title, onPress, disabled, style }: TextButtonProps) {
  return (
    <PremiumPressable onPress={onPress} disabled={disabled} variant="ghost" size="sm" compact style={style}>
      <Text style={styles.textBtn}>{title}</Text>
    </PremiumPressable>
  );
}

interface IconLabelProps {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Text + icon link style — no 3D depth */
export function PremiumIconLabelButton({ icon, label, onPress, style }: IconLabelProps) {
  return (
    <PremiumPressable onPress={onPress} variant="ghost" size="sm" compact style={style}>
      <View style={styles.iconLabel}>
        {icon}
        <Text style={styles.iconLabelText}>{label}</Text>
      </View>
    </PremiumPressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    zIndex: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  textBtn: {
    color: theme.colors.primaryLight,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  iconLabelText: {
    color: theme.colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
});
