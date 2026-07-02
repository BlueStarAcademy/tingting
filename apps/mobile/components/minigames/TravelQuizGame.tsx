import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PremiumButton } from '@/components/PremiumButton';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { formatStageTarget, getQuizStageConfig } from '@/lib/minigames/stages';
import { pickQuizQuestions, pickLocalizedOptions, pickLocalizedText } from '@/lib/minigames/travel-quiz-data';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function TravelQuizGame() {
  const { t, locale } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('quiz');
  const stageConfig = useMemo(() => getQuizStageConfig(currentStage), [currentStage]);
  const targetLabel = useMemo(() => {
    const target = formatStageTarget('quiz', currentStage);
    return t(target.key, target.params);
  }, [currentStage, t]);

  const [round, setRound] = useState(0);
  const questions = useMemo(
    () => pickQuizQuestions(stageConfig.questionCount),
    [round, stageConfig.questionCount],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const current = questions[index];
  const total = questions.length;

  const restart = useCallback(() => {
    setRound((value) => value + 1);
    setIndex(0);
    setScore(0);
    setPicked(null);
    setFinished(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    restart();
  }, [currentStage, loading, restart]);

  const handlePick = (optionIndex: number) => {
    if (picked !== null || !current) return;
    setPicked(optionIndex);
    if (optionIndex === current.correctIndex) {
      setScore((value) => value + 1);
    }
  };

  const handleNext = () => {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
  };

  if (loading || !current) return null;

  return (
    <View style={styles.wrap}>
      <GameStatsBar
        stats={[
          { label: t('minigames.stage'), value: `${currentStage}/${MINIGAME_MAX_STAGE}` },
          { label: t('minigames.score'), value: score },
          { label: t('minigames.question'), value: `${index + 1}/${total}` },
        ]}
      />
      <Text style={styles.target}>{targetLabel}</Text>
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
                key={option}
                title={option}
                onPress={() => handlePick(optionIndex)}
                disabled={picked !== null}
                variant={variant}
                compact
                fullWidth
              />
            );
          })}
        </View>
        {picked !== null ? (
          <Text style={[styles.feedback, picked === current.correctIndex ? styles.correct : styles.wrong]}>
            {picked === current.correctIndex ? t('minigames.correct') : t('minigames.wrong')}
          </Text>
        ) : null}
        {picked !== null ? (
          <PremiumButton
            title={index + 1 >= total ? t('minigames.seeResult') : t('minigames.next')}
            onPress={handleNext}
          />
        ) : null}
      </View>
      <MinigameResultPanel
        gameId="quiz"
        stage={currentStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={`${score}/${total}`}
        detail={t('minigames.quizResult', { score, total })}
        stageResult={{ correctCount: score }}
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
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
});
