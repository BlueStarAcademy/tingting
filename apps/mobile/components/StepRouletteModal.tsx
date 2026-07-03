import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { StarAmount } from '@/components/StarAmount';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const SEGMENTS = [1, 2, 3, 4, 5] as const;
const SEGMENT_ANGLE = 360 / SEGMENTS.length;
const WHEEL_SIZE = 280;
const CX = WHEEL_SIZE / 2;
const CY = WHEEL_SIZE / 2;
const OUTER_R = 128;
const INNER_R = 36;

const SEGMENT_COLORS = ['#F59E0B', '#FBBF24', '#F97316', '#EAB308', '#D97706'];

interface Props {
  visible: boolean;
  milestone: number;
  remainingSpins: number;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
  onContinueAfterWin: () => Promise<boolean>;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePath(index: number) {
  const start = index * SEGMENT_ANGLE;
  const end = start + SEGMENT_ANGLE;
  const p1 = polar(CX, CY, OUTER_R, start);
  const p2 = polar(CX, CY, OUTER_R, end);
  const large = SEGMENT_ANGLE > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

function labelPoint(index: number) {
  const mid = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  return polar(CX, CY, OUTER_R * 0.62, mid);
}

function starPath(cx: number, cy: number, outerR: number, innerR: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const point = polar(cx, cy, i % 2 === 0 ? outerR : innerR, i * 36);
    return `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ') + ' Z';
}

function getSpinTargetRotation(reward: number, currentDeg: number): number {
  const index = reward - 1;
  const segmentCenter = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  const landingMod = (360 - segmentCenter + 360) % 360;
  const minExtraRotations = 5;
  let target = currentDeg + minExtraRotations * 360;
  const targetMod = target % 360;
  let delta = landingMod - targetMod;
  if (delta < 0) delta += 360;
  return target + delta;
}

function RouletteWheelSvg() {
  return (
    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
      <Circle cx={CX} cy={CY} r={OUTER_R + 6} fill="#78350F" />
      <Circle cx={CX} cy={CY} r={OUTER_R + 3} fill="#B45309" />
      {SEGMENTS.map((_, i) => (
        <Path key={`wedge-${i}`} d={wedgePath(i)} fill={SEGMENT_COLORS[i]} stroke="#FFF7ED" strokeWidth={2} />
      ))}
      {SEGMENTS.map((star, i) => {
        const { x, y } = labelPoint(i);
        return (
          <G key={`label-${star}`}>
            <Path d={starPath(x, y - 11, 8, 3.6)} fill="#78350F" />
            <SvgText
              x={x}
              y={y + 12}
              fill="#78350F"
              fontSize={20}
              fontWeight="800"
              textAnchor="middle"
            >
              {star}
            </SvgText>
          </G>
        );
      })}
      {SEGMENTS.map((_, i) => {
        const dot = polar(CX, CY, OUTER_R + 1, i * SEGMENT_ANGLE);
        return <Circle key={`dot-${i}`} cx={dot.x} cy={dot.y} r={3.5} fill="#FDE68A" stroke="#92400E" strokeWidth={1} />;
      })}
      <Circle cx={CX} cy={CY} r={INNER_R + 8} fill="#92400E" />
      <Circle cx={CX} cy={CY} r={INNER_R} fill="#FBBF24" stroke="#78350F" strokeWidth={3} />
      <SvgText x={CX} y={CY + 6} fill="#78350F" fontSize={14} fontWeight="800" textAnchor="middle">
        STAR
      </SvgText>
    </Svg>
  );
}

export function StepRouletteModal({
  visible,
  milestone,
  remainingSpins,
  onClose,
  onComplete,
  onContinueAfterWin,
}: Props) {
  const { t } = useLocale();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef(0);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
  const [reward, setReward] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      spinAnim.setValue(rotationRef.current);
      setPhase('idle');
      setReward(null);
    }
  }, [visible, milestone, spinAnim]);

  const handleClose = () => {
    if (phase === 'spinning') return;
    onClose();
  };

  const spin = async () => {
    if (phase !== 'idle') return;
    setPhase('spinning');
    try {
      const result = await api.spinStepRoulette(milestone);
      const target = getSpinTargetRotation(result.reward, rotationRef.current);
      spinAnim.setValue(rotationRef.current);
      Animated.timing(spinAnim, {
        toValue: target,
        duration: 3800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          rotationRef.current = target;
          setReward(result.reward);
          setPhase('result');
        }
      });
      await onComplete();
    } catch (e: unknown) {
      setPhase('idle');
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('steps.failed'));
    }
  };

  const rotate = spinAnim.interpolate({
    inputRange: [0, 3600],
    outputRange: ['0deg', '3600deg'],
    extrapolate: 'extend',
  });

  const handleContinue = async () => {
    if (phase !== 'result') return;
    const stayOpen = await onContinueAfterWin();
    if (stayOpen) {
      spinAnim.setValue(rotationRef.current);
      setPhase('idle');
      setReward(null);
      return;
    }
    onClose();
  };

  return (
    <AppModal visible={visible} animationType="slide" onRequestClose={handleClose} variant="center">
      <View style={styles.wrap}>
        <Text style={styles.title}>{t('steps.rouletteSpin')}</Text>
        {phase === 'idle' ? (
          <Text style={styles.desc}>
            {t('steps.rouletteDesc', { steps: milestone * 1000 })}
            {remainingSpins > 1 ? `\n${t('steps.rouletteRemaining', { count: remainingSpins })}` : ''}
          </Text>
        ) : null}

        <View style={styles.wheelArea}>
          <View style={styles.pointer}>
            <View style={styles.pointerStem} />
            <View style={styles.pointerHead} />
          </View>
          <Animated.View style={[styles.wheel, { transform: [{ rotate }] }]}>
            <RouletteWheelSvg />
          </Animated.View>
        </View>

        {phase === 'result' && reward !== null ? (
          <>
            <Text style={styles.resultLabel}>{t('steps.rouletteWon')}</Text>
            <StarAmount amount={reward} iconSize={34} textStyle={styles.resultValue} />
            <PremiumButton title={t('common.continue')} onPress={handleContinue} />
          </>
        ) : (
          <PremiumButton
            title={phase === 'spinning' ? t('steps.spinning') : t('steps.spinNow')}
            onPress={spin}
            loading={phase === 'spinning'}
            disabled={phase === 'spinning'}
          />
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
    minWidth: 320,
  },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  desc: { color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
  wheelArea: {
    width: WHEEL_SIZE + 24,
    height: WHEEL_SIZE + 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.sm,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  pointer: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
    alignItems: 'center',
  },
  pointerStem: {
    width: 4,
    height: 14,
    backgroundColor: '#92400E',
    borderRadius: 2,
  },
  pointerHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#DC2626',
    marginTop: -1,
  },
  resultLabel: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  resultValue: { fontSize: 48, fontWeight: '900' },
});
