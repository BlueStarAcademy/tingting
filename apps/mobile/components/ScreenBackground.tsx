import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';

export function ScreenBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbBlue]} />
      <View style={[styles.orb, styles.orbCoral]} />
      <View style={[styles.orb, styles.orbSage]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbBlue: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
    backgroundColor: theme.colors.orbBlue,
  },
  orbCoral: {
    width: 200,
    height: 200,
    bottom: 120,
    left: -70,
    backgroundColor: theme.colors.orbCoral,
  },
  orbSage: {
    width: 140,
    height: 140,
    top: '42%',
    right: -30,
    backgroundColor: theme.colors.orbSage,
  },
});
