import { Platform, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

export const BUTTON_DEPTH = 3;

export type PremiumVariant = 'primary' | 'outline' | 'soft' | 'ghost' | 'danger';
export type PremiumSize = 'sm' | 'md' | 'lg';
export type PremiumShape = 'rect' | 'circle' | 'pill';

interface VariantColors {
  depth: string;
  face: string;
  faceBorder: string;
}

const VARIANT_COLORS: Record<PremiumVariant, VariantColors> = {
  primary: {
    depth: theme.colors.primaryDark,
    face: theme.colors.primary,
    faceBorder: 'rgba(255,255,255,0.18)',
  },
  outline: {
    depth: theme.colors.tint.strong,
    face: theme.colors.surface,
    faceBorder: theme.colors.tint.border,
  },
  soft: {
    depth: theme.colors.tint.medium,
    face: theme.colors.surfaceElevated,
    faceBorder: theme.colors.tint.border,
  },
  ghost: {
    depth: 'transparent',
    face: 'transparent',
    faceBorder: 'transparent',
  },
  danger: {
    depth: '#B91C1C',
    face: theme.colors.error,
    faceBorder: 'rgba(255,255,255,0.15)',
  },
};

const SIZE_PADDING: Record<PremiumSize, number> = { sm: 10, md: 14, lg: 17 };
const SIZE_RADIUS: Record<PremiumSize, number> = {
  sm: theme.radius.sm,
  md: theme.radius.md,
  lg: theme.radius.lg,
};

export function getVariantColors(variant: PremiumVariant): VariantColors {
  return VARIANT_COLORS[variant];
}

export function getFacePadding(size: PremiumSize, shape: PremiumShape, compact?: boolean): ViewStyle {
  if (shape === 'circle') {
    return { paddingHorizontal: 0, paddingVertical: 0 };
  }

  const py = SIZE_PADDING[size];
  return {
    paddingVertical: compact ? py - 2 : py,
    paddingHorizontal: compact ? 14 : 18,
    borderRadius: shape === 'pill' ? theme.radius.full : SIZE_RADIUS[size],
  };
}

export function getBorderRadius(
  shape: PremiumShape,
  size: PremiumSize,
  faceStyle?: ViewStyle | null,
): number {
  if (faceStyle?.borderRadius != null && typeof faceStyle.borderRadius === 'number') {
    return faceStyle.borderRadius;
  }
  if (shape === 'circle') {
    const dim = faceStyle?.width ?? faceStyle?.height;
    if (typeof dim === 'number') return dim / 2;
    return getIconSize(size) / 2;
  }
  if (shape === 'pill') return theme.radius.full;
  return SIZE_RADIUS[size];
}

export function uses3D(variant: PremiumVariant): boolean {
  return variant !== 'ghost';
}

export function usesHighlight(variant: PremiumVariant): boolean {
  return variant === 'primary' || variant === 'danger';
}

export function getDepthShadow(variant: PremiumVariant, pressed: boolean): ViewStyle {
  if (variant === 'ghost') return {};

  const base: ViewStyle = {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: pressed ? 1 : 2 },
    shadowOpacity: pressed ? 0.06 : 0.12,
    shadowRadius: pressed ? 3 : 6,
    elevation: pressed ? 1 : 3,
  };

  if (Platform.OS === 'android') {
    const { shadowColor: _s, shadowOffset: _o, shadowOpacity: _p, shadowRadius: _r, ...rest } = base;
    return rest;
  }
  return base;
}

export function getIconSize(size: PremiumSize): number {
  return size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
}
