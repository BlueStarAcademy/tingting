import type { ReactNode } from 'react';
import { Pressable, View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BUTTON_DEPTH,
  getBorderRadius,
  getDepthShadow,
  getFacePadding,
  getVariantColors,
  uses3D,
  usesHighlight,
  type PremiumShape,
  type PremiumSize,
  type PremiumVariant,
} from '@/lib/premium-pressable-styles';
import { theme } from '@/constants/theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: PremiumVariant;
  size?: PremiumSize;
  shape?: PremiumShape;
  compact?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  hitSlop?: number;
}

export function PremiumPressable({
  children,
  onPress,
  disabled = false,
  variant = 'soft',
  size = 'md',
  shape = 'rect',
  compact,
  fullWidth,
  style,
  faceStyle,
  accessibilityLabel,
  hitSlop,
}: Props) {
  const colors = getVariantColors(variant);
  const isGhost = variant === 'ghost';
  const is3D = uses3D(variant);
  const facePad = getFacePadding(size, shape, compact);
  const flatFace = StyleSheet.flatten([facePad, faceStyle]) as ViewStyle;
  const borderRadius = getBorderRadius(shape, size, flatFace);
  const faceDimensions: ViewStyle = {
    borderRadius,
    ...(flatFace.width != null ? { width: flatFace.width } : null),
    ...(flatFace.height != null ? { height: flatFace.height } : null),
  };

  return (
    <View
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        shape === 'circle' && styles.circleContainer,
        is3D && { paddingBottom: BUTTON_DEPTH },
        style,
      ]}
    >
      {is3D ? (
        <View
          style={[
            styles.depth,
            faceDimensions,
            { backgroundColor: colors.depth, borderRadius },
          ]}
          pointerEvents="none"
        />
      ) : null}

      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={hitSlop}
        style={({ pressed }) => [
          styles.faceWrap,
          faceDimensions,
          fullWidth && styles.fullWidth,
          getDepthShadow(variant, pressed && !disabled),
          pressed && !disabled && is3D && styles.pressed,
          pressed && !disabled && isGhost && styles.pressedGhost,
          disabled && styles.disabled,
        ]}
      >
        {({ pressed }) =>
          variant === 'primary' || variant === 'danger' ? (
            <LinearGradient
              colors={
                variant === 'danger'
                  ? ['#C44D4D', theme.colors.error, '#E89090']
                  : [theme.colors.primaryDark, theme.colors.primary, theme.colors.primaryLight]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[
                styles.face,
                facePad,
                faceDimensions,
                flatFace,
                pressed && !disabled && styles.pressedFace,
              ]}
            >
              {usesHighlight(variant) ? (
                <View style={styles.highlight} pointerEvents="none" />
              ) : null}
              {children}
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.face,
                facePad,
                faceDimensions,
                flatFace,
                !isGhost && {
                  backgroundColor: colors.face,
                  borderColor: colors.faceBorder,
                  borderWidth: 1.5,
                },
                pressed && !disabled && styles.pressedFace,
              ]}
            >
              {children}
            </View>
          )
        }
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  circleContainer: {
    alignSelf: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  depth: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  faceWrap: {
    overflow: 'hidden',
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pressed: {
    transform: [{ translateY: BUTTON_DEPTH }],
  },
  pressedGhost: {
    transform: [{ scale: 0.97 }],
    opacity: 0.75,
  },
  pressedFace: {
    opacity: 0.97,
  },
  disabled: {
    opacity: 0.45,
  },
});
