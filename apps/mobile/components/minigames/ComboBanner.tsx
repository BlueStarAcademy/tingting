import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  combo: number;
  label: string;
  minCombo?: number;
  reserveSpace?: boolean;
  variant?: 'inline' | 'float';
}

export function ComboBanner({
  combo,
  label,
  minCombo = 2,
  reserveSpace = false,
  variant = 'inline',
}: Props) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (combo < minCombo) return;

    scale.setValue(variant === 'float' ? 0.85 : 0.6);
    opacity.setValue(0);
    translateY.setValue(0);

    if (variant === 'float') {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, { toValue: -56, duration: 880, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 880, useNativeDriver: true }),
        ]),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(opacity, { toValue: 0, duration: 400, delay: 500, useNativeDriver: true }).start();
    });
  }, [combo, minCombo, opacity, scale, translateY, variant]);

  if (combo < minCombo) {
    if (!reserveSpace) return null;
    return <View style={styles.slot} />;
  }

  if (variant === 'float') {
    return (
      <View style={styles.floatHost} pointerEvents="none">
        <Animated.View
          style={[
            styles.banner,
            styles.floatBanner,
            { opacity, transform: [{ translateY }, { scale }] },
          ]}
        >
          <Text style={styles.text}>{label}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={reserveSpace ? styles.slot : undefined}>
      <Animated.View
        style={[
          styles.banner,
          reserveSpace && styles.bannerReserved,
          { opacity, transform: [{ scale }] },
        ]}
      >
        <Text style={styles.text}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const COMBO_SLOT_HEIGHT = 34;

const styles = StyleSheet.create({
  slot: {
    height: COMBO_SLOT_HEIGHT,
    marginTop: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatHost: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },
  banner: {
    alignSelf: 'center',
    zIndex: 5,
    backgroundColor: 'rgba(251,191,36,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    marginTop: theme.spacing.sm,
  },
  floatBanner: {
    marginTop: 0,
  },
  bannerReserved: {
    marginTop: 0,
  },
  text: {
    color: '#78350F',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
