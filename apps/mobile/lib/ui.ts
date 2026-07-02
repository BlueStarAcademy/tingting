import { Platform, TextStyle, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type ShadowLevel = 'sm' | 'md' | 'lg' | 'glow' | 'tab';

export function shadow(level: ShadowLevel): ViewStyle {
  const shadowBase = theme.colors.primaryDark;
  const presets: Record<ShadowLevel, ViewStyle> = {
    sm: {
      shadowColor: shadowBase,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 2,
    },
    md: {
      shadowColor: shadowBase,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 4,
    },
    lg: {
      shadowColor: shadowBase,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    glow: {
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 3,
    },
    tab: {
      shadowColor: theme.colors.primaryDark,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 12,
    },
  };
  if (Platform.OS === 'android') {
    const { shadowColor: _s, shadowOffset: _o, shadowOpacity: _p, shadowRadius: _r, ...rest } = presets[level];
    return rest;
  }
  return presets[level];
}

export function cardSurface(): ViewStyle {
  return {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...shadow('sm'),
  };
}

export function accentCard(): ViewStyle {
  return {
    ...cardSurface(),
    borderTopWidth: 3,
    borderTopColor: theme.colors.primary,
  };
}

export function glassSurface(): ViewStyle {
  return {
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: theme.colors.border,
  };
}

export function iconButton(): ViewStyle {
  return {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  };
}

export function screenTitleStyle(): TextStyle {
  return {
    ...theme.typography.screenTitle,
    color: theme.colors.text,
  };
}

export function screenSubStyle(): TextStyle {
  return {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 20,
  };
}

export function sectionTitleStyle(): TextStyle {
  return {
    ...theme.typography.sectionTitle,
    color: theme.colors.text,
  };
}

export function inputSurface(): ViewStyle {
  return {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  };
}

export function tabPill(active: boolean): ViewStyle {
  return {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    backgroundColor: active ? theme.colors.tint.pillActive : 'transparent',
    borderWidth: active ? 1 : 0,
    borderColor: active ? theme.colors.tint.border : 'transparent',
  };
}
