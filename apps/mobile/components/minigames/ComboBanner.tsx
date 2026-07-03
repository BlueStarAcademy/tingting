import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  combo: number;
  label: string;
  minCombo?: number;
}

export function ComboBanner({ combo, label, minCombo = 2 }: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (combo < minCombo) return;
    scale.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(opacity, { toValue: 0, duration: 400, delay: 500, useNativeDriver: true }).start();
    });
  }, [combo, minCombo, opacity, scale]);

  if (combo < minCombo) return null;

  return (
    <Animated.View style={[styles.banner, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    zIndex: 5,
    backgroundColor: 'rgba(251,191,36,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.sm,
  },
  text: {
    color: '#78350F',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
