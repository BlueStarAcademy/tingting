import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PremiumPressable } from '@/components/PremiumPressable';
import { PremiumButton } from '@/components/PremiumButton';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { formatStageTarget, getTapStageConfig } from '@/lib/minigames/stages';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

type Phase = 'idle' | 'playing' | 'finished';

export function TapChallengeGame() {
  const { t } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('tap');
  const stageConfig = useMemo(() => getTapStageConfig(currentStage), [currentStage]);
  const targetLabel = useMemo(() => {
    const target = formatStageTarget('tap', currentStage);
    return t(target.key, target.params);
  }, [currentStage, t]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(stageConfig.durationSeconds);
  const tapsRef = useRef(0);

  const restart = useCallback(() => {
    const config = getTapStageConfig(currentStage);
    tapsRef.current = 0;
    setTaps(0);
    setTimeLeft(config.durationSeconds);
    setPhase('idle');
  }, [currentStage]);

  useEffect(() => {
    if (loading) return;
    restart();
  }, [currentStage, loading, restart]);

  const start = () => {
    const config = getTapStageConfig(currentStage);
    tapsRef.current = 0;
    setTaps(0);
    setTimeLeft(config.durationSeconds);
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      setPhase('finished');
      return;
    }
    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft]);

  const handleTap = () => {
    if (phase !== 'playing') return;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
  };

  const cps =
    phase === 'finished' && stageConfig.durationSeconds > 0
      ? (taps / stageConfig.durationSeconds).toFixed(1)
      : null;

  if (loading) return null;

  return (
    <View style={styles.wrap}>
      <GameStatsBar
        stats={[
          { label: t('minigames.stage'), value: `${currentStage}/${MINIGAME_MAX_STAGE}` },
          { label: t('minigames.taps'), value: taps },
          { label: t('minigames.time'), value: phase === 'playing' ? `${timeLeft}s` : `${stageConfig.durationSeconds}s` },
        ]}
      />
      <Text style={styles.target}>{targetLabel}</Text>
      <View style={styles.arena}>
        {phase === 'idle' ? (
          <>
            <Text style={styles.intro}>
              {t('minigames.tapIntroStage', {
                seconds: stageConfig.durationSeconds,
                taps: stageConfig.targetTaps,
              })}
            </Text>
            <PremiumButton title={t('minigames.start')} onPress={start} />
          </>
        ) : (
          <PremiumPressable
            onPress={handleTap}
            disabled={phase !== 'playing'}
            variant="primary"
            size="lg"
            shape="circle"
            style={styles.tapButton}
            faceStyle={styles.tapButtonFace}
            accessibilityLabel={t('minigames.tap')}
          >
            <Text style={styles.tapLabel}>{phase === 'playing' ? t('minigames.tapNow') : t('minigames.tapDone')}</Text>
            <Text style={styles.tapCount}>{taps}</Text>
          </PremiumPressable>
        )}
      </View>
      <MinigameResultPanel
        gameId="tap"
        stage={currentStage}
        finished={phase === 'finished'}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={String(taps)}
        detail={t('minigames.tapResult', { taps, cps: cps ?? '0' })}
        stageResult={{ taps }}
        onRestart={restart}
        onProgressUpdated={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  target: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  arena: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    minHeight: 280,
  },
  intro: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  tapButton: {
    width: 220,
    height: 220,
  },
  tapButtonFace: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tapLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  tapCount: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
  },
});
