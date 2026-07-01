import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

export function GradientBackground({ style, children }: { style?: ViewStyle; children?: React.ReactNode }) {
  return (
    <LinearGradient
      colors={[theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd, theme.colors.backgroundAlt]}
      locations={[0, 0.35, 0.72, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1, minHeight: 0, width: '100%', maxWidth: '100%' },
});
