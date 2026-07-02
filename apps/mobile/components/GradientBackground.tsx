import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

export function GradientBackground({ style, children }: { style?: ViewStyle; children?: React.ReactNode }) {
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient
        colors={[
          theme.colors.gradientStart,
          theme.colors.gradientMid,
          theme.colors.gradientEnd,
          theme.colors.backgroundAlt,
        ]}
        locations={[0, 0.3, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbTop]} />
      <View style={[styles.orb, styles.orbBottom]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, width: '100%', maxWidth: '100%' },
  orb: { position: 'absolute', borderRadius: 999, pointerEvents: 'none' },
  orbTop: {
    width: 320,
    height: 320,
    top: -100,
    left: -80,
    backgroundColor: theme.colors.orbBlue,
  },
  orbBottom: {
    width: 240,
    height: 240,
    bottom: -60,
    right: -50,
    backgroundColor: theme.colors.orbCoral,
  },
});
