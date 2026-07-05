import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PremiumButton } from '@/components/PremiumButton';
import { ComboBanner } from '@/components/minigames/ComboBanner';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { HowToPlayModal } from '@/components/minigames/HowToPlayModal';
import { MinigameHelpButton } from '@/components/minigames/MinigameHelpButton';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { QUIZ_LIVES, QUIZ_TARGET_CORRECT } from '@/lib/minigames/quiz-scoring';
import {
  pickLocalizedOptions,
  pickLocalizedText,
  pickNextQuizQuestion,
  type QuizQuestion,
} from '@/lib/minigames/travel-quiz-data';
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { theme } from '@/constants/theme';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
const QUESTION_BOX_HEIGHT = 96;
const NEXT_BUTTON_SLOT_HEIGHT = 46;

type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

function QuizProgressDots({ correct, target }: { correct: number; target: number }) {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: target }, (_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index < correct ? styles.progressDotFilled : styles.progressDotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

function QuizLivesBar({ lives, maxLives }: { lives: number; maxLives: number }) {
  return (
    <View style={styles.livesRow}>
      {Array.from({ length: maxLives }, (_, index) => (
        <Ionicons
          key={index}
          name={index < lives ? 'heart' : 'heart-outline'}
          size={20}
          color={index < lives ? '#E85D6A' : theme.colors.textSubtle}
        />
      ))}
    </View>
  );
}

function QuizOption({
  letter,
  label,
  state,
  disabled,
  onPress,
}: {
  letter: string;
  label: string;
  state: OptionState;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        state === 'idle' && styles.optionIdle,
        state === 'correct' && styles.optionCorrect,
        state === 'wrong' && styles.optionWrong,
        state === 'dimmed' && styles.optionDimmed,
        pressed && !disabled && styles.optionPressed,
      ]}
    >
      <View
        style={[
          styles.optionLetter,
          state === 'correct' && styles.optionLetterCorrect,
          state === 'wrong' && styles.optionLetterWrong,
        ]}
      >
        <Text
          style={[
            styles.optionLetterText,
            (state === 'correct' || state === 'wrong') && styles.optionLetterTextActive,
          ]}
        >
          {letter}
        </Text>
      </View>
      <Text
        style={[
          styles.optionLabel,
          state === 'dimmed' && styles.optionLabelDimmed,
          (state === 'correct' || state === 'wrong') && styles.optionLabelActive,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {state === 'correct' ? (
        <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
      ) : state === 'wrong' ? (
        <Ionicons name="close-circle" size={18} color={theme.colors.error} />
      ) : null}
    </Pressable>
  );
}

export function TravelQuizGame({ initialStage }: { initialStage?: number } = {}) {
  const { t, tArray, locale } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('quiz');
  const [activeStage, setActiveStage] = useState(initialStage ?? 1);
  const initialStageSynced = useRef(false);
  const usedQuestionIds = useRef<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  const [current, setCurrent] = useState<QuizQuestion | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(QUIZ_LIVES);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [combo, setCombo] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const loadQuestion = useCallback(() => {
    const question = pickNextQuizQuestion(usedQuestionIds.current);
    usedQuestionIds.current.add(question.id);
    setCurrent(question);
  }, []);

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    if (!initialStage) setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, initialStage, loading]);

  const restart = useCallback(
    (stage = activeStage) => {
      if (stage === 1) {
        usedQuestionIds.current = new Set();
      }
      setCorrectCount(0);
      setLives(QUIZ_LIVES);
      setQuestionsAnswered(0);
      setCombo(0);
      setPicked(null);
      setNextCountdown(null);
      setFinished(false);
      loadQuestion();
    },
    [activeStage, loadQuestion],
  );

  useEffect(() => {
    if (loading || !initialStageSynced.current) return;
    restart(activeStage);
  }, [activeStage, loading, restart]);

  const handlePick = useCallback(
    (optionIndex: number) => {
      if (!gameStarted || picked !== null || !current || finished) return;
      setPicked(optionIndex);

      if (optionIndex === current.correctIndex) {
        setCombo((value) => value + 1);
        setCorrectCount((value) => value + 1);
      } else {
        setCombo(0);
        setLives((value) => Math.max(0, value - 1));
      }
    },
    [current, finished, gameStarted, picked],
  );

  const handleNext = useCallback(() => {
    if (finished) return;
    setQuestionsAnswered((value) => value + 1);
    loadQuestion();
    setPicked(null);
    setNextCountdown(null);
  }, [finished, loadQuestion]);

  useEffect(() => {
    if (picked === null || finished) {
      setNextCountdown(null);
      return;
    }

    const ended = correctCount >= QUIZ_TARGET_CORRECT || lives <= 0;

    setNextCountdown(3);
    const interval = setInterval(() => {
      setNextCountdown((prev) => (prev !== null && prev > 1 ? prev - 1 : prev));
    }, 1000);

    const timer = setTimeout(() => {
      if (ended) {
        setFinished(true);
      } else {
        handleNext();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [correctCount, finished, handleNext, lives, picked]);

  const continueAfterAd = useCallback(() => {
    setLives(QUIZ_LIVES);
    setPicked(null);
    setNextCountdown(null);
    setFinished(false);
    loadQuestion();
  }, [loadQuestion]);

  const cleared = finished && correctCount >= QUIZ_TARGET_CORRECT;
  const comboLabel = t('minigames.combo', { count: combo });
  const quizEnded = correctCount >= QUIZ_TARGET_CORRECT || lives <= 0;
  const nextButtonTitle =
    picked !== null && nextCountdown !== null && !finished
      ? quizEnded
        ? t('minigames.quizSeeResultCountdown', { seconds: nextCountdown })
        : t('minigames.quizNextCountdown', { seconds: nextCountdown })
      : quizEnded
        ? t('minigames.seeResult')
        : t('minigames.next');

  const handleHelpClose = () => {
    if (!gameStarted) setGameStarted(true);
    setShowHelp(false);
  };

  const getOptionState = (optionIndex: number): OptionState => {
    if (picked === null) return 'idle';
    if (optionIndex === current?.correctIndex) return 'correct';
    if (optionIndex === picked) return 'wrong';
    return 'dimmed';
  };

  if (loading || !current) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.topBarMain}>
          <View style={styles.topBarLives}>
            <QuizLivesBar lives={lives} maxLives={QUIZ_LIVES} />
            <Text style={styles.topBarLivesLabel}>{t('minigames.quizLives')}</Text>
          </View>
          <View style={styles.topBarProgress}>
            <View style={styles.topBarProgressHeader}>
              <Text style={styles.topBarProgressLabel}>{t('minigames.quizProgress')}</Text>
              <Text style={styles.topBarProgressValue}>
                {correctCount}/{QUIZ_TARGET_CORRECT}
              </Text>
            </View>
            <QuizProgressDots correct={correctCount} target={QUIZ_TARGET_CORRECT} />
          </View>
        </View>
      </View>
      <View style={styles.helpRow}>
        <MinigameHelpButton
          accessibilityLabel={t('minigames.howToPlay')}
          label={t('minigames.howToPlay')}
          onPress={() => setShowHelp(true)}
        />
      </View>

      <View style={styles.panelArea}>
        <View style={styles.card}>
          <View style={styles.cardAccent} />
          <ComboBanner combo={combo} label={comboLabel} variant="float" minCombo={2} />

          <View style={styles.questionBox}>
            <ScrollView
              style={styles.questionScroll}
              contentContainerStyle={styles.questionScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.question}>
                <Text style={styles.questionNumber}>Q{questionsAnswered + 1}. </Text>
                {pickLocalizedText(current.question, locale)}
              </Text>
            </ScrollView>
          </View>

          <View style={styles.options}>
            {pickLocalizedOptions(current.options, locale).map((option, optionIndex) => (
              <QuizOption
                key={`${current.id}-${optionIndex}`}
                letter={OPTION_LETTERS[optionIndex]}
                label={option}
                state={getOptionState(optionIndex)}
                disabled={!gameStarted || picked !== null || finished}
                onPress={() => handlePick(optionIndex)}
              />
            ))}
          </View>

          <View style={styles.answerArea}>
            <View style={styles.feedbackSlot}>
              {picked !== null && !finished ? (
                <Text style={[styles.feedback, picked === current.correctIndex ? styles.correct : styles.wrong]}>
                  {picked === current.correctIndex ? t('minigames.correct') : t('minigames.wrong')}
                </Text>
              ) : null}
            </View>
            <View style={styles.nextButtonSlot}>
              <PremiumButton
                title={nextButtonTitle}
                disabled={picked === null || finished || !gameStarted}
                onPress={() => {
                  if (quizEnded) {
                    setFinished(true);
                  } else {
                    handleNext();
                  }
                }}
              />
            </View>
          </View>
        </View>
      </View>

      <MinigameResultPanel
        gameId="quiz"
        stage={activeStage}
        finished={finished}
        scoreLabel={t('minigames.quizProgress')}
        scoreValue={`${correctCount}/${QUIZ_TARGET_CORRECT}`}
        detail={
          cleared
            ? t('minigames.quizResultWin', { correct: correctCount, target: QUIZ_TARGET_CORRECT })
            : t('minigames.quizResultLose', { correct: correctCount, target: QUIZ_TARGET_CORRECT })
        }
        stageResult={{ correctCount }}
        onRestart={(stage) => {
          const target = stage ?? 1;
          if (target !== activeStage) setActiveStage(target);
          else restart(target);
        }}
        onContinueStage={continueAfterAd}
        onProgressUpdated={refresh}
      />
      <HowToPlayModal
        visible={showHelp}
        onClose={handleHelpClose}
        title={t('minigames.howToPlay')}
        rules={tArray('minigames.rulesQuiz')}
        actionLabel={!gameStarted ? t('minigames.startGame') : undefined}
        dismissible={gameStarted}
      />
    </View>
  );
}

const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: { elevation: 4 },
  default: {},
});

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
    marginBottom: theme.spacing.xs,
  },
  panelArea: {
    flex: 1,
    minHeight: 0,
    paddingBottom: MAIN_TAB_BAR_HEIGHT + theme.spacing.sm,
  },
  topBarMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    ...CARD_SHADOW,
  },
  topBarLives: {
    alignItems: 'center',
    gap: 2,
    paddingRight: theme.spacing.sm,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  topBarLivesLabel: {
    color: theme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
  },
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 20,
  },
  topBarProgress: {
    flex: 1,
    gap: 6,
  },
  topBarProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarProgressLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  topBarProgressValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  progressDotFilled: {
    backgroundColor: theme.colors.teal,
  },
  progressDotEmpty: {
    backgroundColor: theme.colors.tint.light,
  },
  card: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    overflow: 'visible',
    ...CARD_SHADOW,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: theme.colors.star,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  questionNumber: {
    color: '#9A6B12',
    fontSize: 16,
    fontWeight: '800',
  },
  questionBox: {
    height: QUESTION_BOX_HEIGHT,
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  questionScroll: {
    flex: 1,
  },
  questionScrollContent: {
    padding: theme.spacing.sm,
  },
  question: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    letterSpacing: -0.15,
  },
  options: {
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.sm,
    minHeight: 40,
  },
  optionIdle: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  optionCorrect: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
  },
  optionWrong: {
    backgroundColor: 'rgba(217,112,112,0.12)',
    borderColor: theme.colors.error,
  },
  optionDimmed: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    opacity: 0.55,
  },
  optionPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.tint.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterCorrect: {
    backgroundColor: theme.colors.success,
  },
  optionLetterWrong: {
    backgroundColor: theme.colors.error,
  },
  optionLetterText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  optionLetterTextActive: {
    color: theme.colors.onPrimary,
  },
  optionLabel: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  optionLabelDimmed: {
    color: theme.colors.textMuted,
  },
  optionLabelActive: {
    fontWeight: '700',
  },
  answerArea: {
    marginTop: 'auto',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  feedbackSlot: {
    minHeight: 18,
    justifyContent: 'center',
  },
  nextButtonSlot: {
    minHeight: NEXT_BUTTON_SLOT_HEIGHT,
    justifyContent: 'center',
  },
  feedback: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  correct: { color: theme.colors.success },
  wrong: { color: theme.colors.error },
});
