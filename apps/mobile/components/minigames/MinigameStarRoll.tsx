import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MINIGAME_FINAL_STAR_MAX, MINIGAME_FINAL_STAR_MIN } from '@tingting/shared';
import { StarIcon } from '@/components/StarAmount';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  amount: number;
}

export function MinigameStarRoll({ amount }: Props) {
  const { t } = useLocale();
  const [display, setDisplay] = useState(MINIGAME_FINAL_STAR_MIN);
  const [rolling, setRolling] = useState(true);
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let tick = 0;
    const totalTicks = 24;
    let delay = 60;

    const runTick = () => {
      tick += 1;

      if (tick >= totalTicks) {
        setDisplay(amount);
        setRolling(false);
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 1, duration: 320, useNativeDriver: true }),
        ]).start();
        return;
      }

      if (tick >= totalTicks - 4) {
        setDisplay(amount);
        delay = 140;
      } else {
        setDisplay(
          MINIGAME_FINAL_STAR_MIN +
            Math.floor(Math.random() * (MINIGAME_FINAL_STAR_MAX - MINIGAME_FINAL_STAR_MIN + 1)),
        );
        delay = tick < 14 ? 65 : 95;
      }

      timer = setTimeout(runTick, delay);
    };

    let timer = setTimeout(runTick, delay);
    return () => clearTimeout(timer);
  }, [amount, glow, scale]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {rolling ? t('minigames.starRolling') : t('minigames.finalStarReward')}
      </Text>
      <LinearGradient
        colors={['rgba(251,191,36,0.22)', 'rgba(251,191,36,0.08)']}
        style={styles.panel}
      >
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
        <Animated.View style={[styles.valueRow, { transform: [{ scale }] }]}>
          <StarIcon size={28} />
          <Text style={[styles.value, rolling && styles.valueRolling]}>{display}</Text>
        </Animated.View>
        {!rolling ? (
          <Text style={styles.earned}>{t('minigames.starEarned', { amount })}</Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'stretch',
    gap: 8,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  panel: {
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    overflow: 'hidden',
  },
  glowRing: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  value: {
    color: theme.colors.star,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    minWidth: 36,
    textAlign: 'center',
  },
  valueRolling: {
    opacity: 0.92,
  },
  earned: {
    marginTop: 8,
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
