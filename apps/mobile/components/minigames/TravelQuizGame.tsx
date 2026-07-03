import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { PremiumButton } from '@/components/PremiumButton';
import { ComboBanner } from '@/components/minigames/ComboBanner';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { HowToPlayModal } from '@/components/minigames/HowToPlayModal';
import { MinigameHelpButton } from '@/components/minigames/MinigameHelpButton';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { scoreQuizCorrect } from '@/lib/minigames/quiz-scoring';
import { getQuizStageConfig } from '@/lib/minigames/stages';
import { pickQuizQuestions, pickLocalizedOptions, pickLocalizedText } from '@/lib/minigames/travel-quiz-data';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function TravelQuizGame({ initialStage }: { initialStage?: number } = {}) {
  const { t, tArray, locale } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('quiz');
  const [activeStage, setActiveStage] = useState(initialStage ?? 1);
  const initialStageSynced = useRef(false);
  const answeredCorrectlyRef = useRef<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  const stageConfig = useMemo(() => getQuizStageConfig(activeStage), [activeStage]);

  const [round, setRound] = useState(0);
  const questions = useMemo(
    () => pickQuizQuestions(stageConfig.questionCount, answeredCorrectlyRef.current),
    [round, stageConfig.questionCount],
  );
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [lastGain, setLastGain] = useState<number | null>(null);

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const gainOpacity = useRef(new Animated.Value(0)).current;
  const gainTranslate = useRef(new Animated.Value(0)).current;

  const current = questions[index];
  const total = questions.length;

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    if (!initialStage) setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, initialStage, loading]);

  const restart = useCallback(
    (stage = activeStage) => {
      if (stage === 1) {
        answeredCorrectlyRef.current = new Set();
      }
      const config = getQuizStageConfig(stage);
      setRound((value) => value + 1);
      setIndex(0);
      setPoints(0);
      setDisplayScore(0);
      scoreAnim.setValue(0);
      setCorrectCount(0);
      setCombo(0);
      setPicked(null);
      setFinished(false);
      setLastGain(null);
      void config;
    },
    [activeStage, scoreAnim],
  );

  useEffect(() => {
    if (loading || !initialStageSynced.current) return;
    restart(activeStage);
  }, [activeStage, loading, restart]);

  useEffect(() => {
    const listener = scoreAnim.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => scoreAnim.removeListener(listener);
  }, [scoreAnim]);

  useEffect(() => {
    if (finished || correctCount < stageConfig.requiredCorrect) return;
    const timer = setTimeout(() => setFinished(true), 700);
    return () => clearTimeout(timer);
  }, [correctCount, finished, stageConfig.requiredCorrect]);

  const animateScoreTo = useCallback(
    (next: number) => {
      Animated.timing(scoreAnim, {
        toValue: next,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    },
    [scoreAnim],
  );

  const showGainPopup = useCallback(
    (amount: number) => {
      setLastGain(amount);
      gainOpacity.setValue(0);
      gainTranslate.setValue(8);
      Animated.parallel([
        Animated.timing(gainOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(gainTranslate, { toValue: -12, duration: 600, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(gainOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() =>
          setLastGain(null),
        );
      });
    },
    [gainOpacity, gainTranslate],
  );

  const handlePick = (optionIndex: number) => {
    if (picked !== null || !current || finished) return;
    setPicked(optionIndex);

    if (optionIndex === current.correctIndex) {
      answeredCorrectlyRef.current.add(current.id);
      const nextCombo = combo + 1;
      const gain = scoreQuizCorrect(nextCombo);
      setCombo(nextCombo);
      setCorrectCount((value) => value + 1);
      setPoints((value) => {
        const next = value + gain;
        animateScoreTo(next);
        return next;
      });
      showGainPopup(gain);
    } else {
      setCombo(0);
    }
  };

  const handleNext = () => {
    if (finished) return;
    if (correctCount >= stageConfig.requiredCorrect) {
      setFinished(true);
      return;
    }
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
  };

  const handleNextStage = useCallback(async () => {
    await refresh();
    setFinished(false);
    setActiveStage((stage) => Math.min(stage + 1, MINIGAME_MAX_STAGE));
  }, [refresh]);

  const comboLabel = t('minigames.combo', { count: combo });
  const canAdvance = activeStage < MINIGAME_MAX_STAGE;

  if (loading || !current) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <GameStatsBar
          stats={[
            { label: t('minigames.stage'), value: `${activeStage}/${MINIGAME_MAX_STAGE}` },
            { label: t('minigames.score'), value: displayScore },
            { label: t('minigames.question'), value: `${index + 1}/${total}` },
          ]}
        />
      </View>
      <View style={styles.helpRow}>
        <MinigameHelpButton
          accessibilityLabel={t('minigames.howToPlay')}
          label={t('minigames.howToPlay')}
          onPress={() => setShowHelp(true)}
        />
      </View>
      <ComboBanner combo={combo} label={comboLabel} minCombo={2} />
      <View style={styles.card}>
        <Text style={styles.question}>{pickLocalizedText(current.question, locale)}</Text>
        <View style={styles.options}>
          {pickLocalizedOptions(current.options, locale).map((option, optionIndex) => {
            const isPicked = picked === optionIndex;
            const isCorrect = optionIndex === current.correctIndex;
            const showResult = picked !== null;
            const variant =
              showResult && isCorrect
                ? 'primary'
                : showResult && isPicked && !isCorrect
                  ? 'danger'
                  : 'outline';

            return (
              <PremiumButton
                key={`${current.id}-${optionIndex}`}
                title={option}
                onPress={() => handlePick(optionIndex)}
                disabled={picked !== null || finished}
                variant={variant}
                compact
                fullWidth
              />
            );
          })}
        </View>
        {picked !== null ? (
          <Text style={[styles.feedback, picked === current.correctIndex ? styles.correct : styles.wrong]}>
            {picked === current.correctIndex
              ? combo >= 2
                ? t('minigames.correctCombo', { combo, gain: scoreQuizCorrect(combo) })
                : t('minigames.correct')
              : t('minigames.wrong')}
          </Text>
        ) : null}
        {lastGain !== null ? (
          <Animated.Text
            style={[
              styles.gainPop,
              { opacity: gainOpacity, transform: [{ translateY: gainTranslate }] },
            ]}
          >
            +{lastGain}
          </Animated.Text>
        ) : null}
        {picked !== null && !finished ? (
          <PremiumButton
            title={index + 1 >= total ? t('minigames.seeResult') : t('minigames.next')}
            onPress={handleNext}
          />
        ) : null}
      </View>
      <MinigameResultPanel
        gameId="quiz"
        stage={activeStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={String(points)}
        detail={t('minigames.quizResult', { correct: correctCount, total, points })}
        stageResult={{ correctCount }}
        onRestart={(stage) => {
          const target = stage ?? 1;
          if (target !== activeStage) setActiveStage(target);
          else restart(target);
        }}
        onProgressUpdated={refresh}
        onNextStage={canAdvance ? handleNextStage : undefined}
        nextStageLabel={t('minigames.nextStage')}
      />
      <HowToPlayModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('minigames.howToPlay')}
        rules={tArray('minigames.rulesQuiz')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  helpRow: {
    alignItems: 'flex-end',
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  question: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
  },
  options: { gap: theme.spacing.sm },
  feedback: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  correct: { color: theme.colors.success },
  wrong: { color: theme.colors.error },
  gainPop: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: theme.spacing.md,
    color: theme.colors.star,
    fontSize: 22,
    fontWeight: '900',
  },
});
