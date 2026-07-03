import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { formatStageTarget, getGuessStageConfig } from '@/lib/minigames/stages';
import {
  evaluateGuess,
  GUESS_NUMBER_MAX,
  GUESS_NUMBER_MIN,
  parseGuessInput,
  rollSecretNumber,
  type GuessEntry,
  type GuessHint,
} from '@/lib/minigames/guess-logic';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

function hintLabel(t: (key: string) => string, hint: GuessHint): string {
  if (hint === 'up') return t('minigames.guessUp');
  if (hint === 'down') return t('minigames.guessDown');
  return t('minigames.guessCorrect');
}

function hintStyle(hint: GuessHint) {
  if (hint === 'up') return styles.hintUp;
  if (hint === 'down') return styles.hintDown;
  return styles.hintCorrect;
}

export function UpDownGame() {
  const { t } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('guess');
  const [activeStage, setActiveStage] = useState(1);
  const initialStageSynced = useRef(false);
  const hasLoadedOnce = useRef(false);
  const bootedStageRef = useRef<number | null>(null);
  const historyScrollRef = useRef<ScrollView>(null);

  const stageConfig = useMemo(() => getGuessStageConfig(activeStage), [activeStage]);
  const targetLabel = useMemo(() => {
    const target = formatStageTarget('guess', activeStage);
    return t(target.key, target.params);
  }, [activeStage, t]);

  const [secret, setSecret] = useState(() => rollSecretNumber());
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [won, setWon] = useState(false);
  const [finished, setFinished] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const attemptsUsed = history.length;
  const attemptsLeft = Math.max(0, stageConfig.maxAttempts - attemptsUsed);

  useEffect(() => {
    if (!loading) hasLoadedOnce.current = true;
  }, [loading]);

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, loading]);

  const restart = useCallback((stage = activeStage) => {
    setSecret(rollSecretNumber());
    setInput('');
    setHistory([]);
    setWon(false);
    setFinished(false);
    setInputError(null);
  }, [activeStage]);

  useEffect(() => {
    if (loading || !initialStageSynced.current) return;
    if (bootedStageRef.current === activeStage) return;
    bootedStageRef.current = activeStage;
    restart(activeStage);
  }, [activeStage, loading, restart]);

  useEffect(() => {
    if (history.length === 0) return;
    const timer = setTimeout(() => {
      historyScrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [history]);

  const scrollHistoryToEnd = useCallback(() => {
    historyScrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  const submitGuess = () => {
    if (finished) return;
    const value = parseGuessInput(input);
    if (value === null) {
      setInputError(t('minigames.guessInvalid', { min: GUESS_NUMBER_MIN, max: GUESS_NUMBER_MAX }));
      return;
    }

    setInputError(null);
    const hint = evaluateGuess(secret, value);
    const nextHistory = [...history, { value, hint }];
    setHistory(nextHistory);
    setInput('');

    if (hint === 'correct') {
      setWon(true);
      setFinished(true);
      return;
    }

    if (nextHistory.length >= stageConfig.maxAttempts) {
      setFinished(true);
    }
  };

  const handleNextStage = useCallback(async () => {
    await refresh();
    setFinished(false);
    setActiveStage((stage) => Math.min(stage + 1, MINIGAME_MAX_STAGE));
  }, [refresh]);

  const handleRestart = useCallback((stage?: number) => {
    const targetStage = stage ?? 1;
    bootedStageRef.current = null;
    restart(targetStage);
    bootedStageRef.current = targetStage;
    if (targetStage !== activeStage) setActiveStage(targetStage);
  }, [activeStage, restart]);

  const canAdvance = activeStage < MINIGAME_MAX_STAGE && won;

  if (loading && !hasLoadedOnce.current) return null;

  return (
    <View style={styles.wrap}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <GameStatsBar
          stats={[
            { label: t('minigames.stage'), value: `${activeStage}/${MINIGAME_MAX_STAGE}` },
            { label: t('minigames.attempts'), value: `${attemptsUsed}/${stageConfig.maxAttempts}` },
            { label: t('minigames.remaining'), value: attemptsLeft },
          ]}
        />
        <Text style={styles.target}>{targetLabel}</Text>
        <Text style={styles.hint}>{t('minigames.guessHint')}</Text>

        <ScrollView
          ref={historyScrollRef}
          style={styles.historyScroll}
          contentContainerStyle={styles.historyContent}
          onContentSizeChange={scrollHistoryToEnd}
          showsVerticalScrollIndicator={false}
        >
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>{t('minigames.guessEmpty')}</Text>
          ) : (
            history.map((entry, index) => {
              const isLatest = index === history.length - 1;
              return (
                <View
                  key={`${entry.value}-${index}`}
                  style={[styles.historyRow, isLatest && styles.historyRowLatest]}
                >
                  <Text style={styles.historyValue}>{entry.value}</Text>
                  <View style={[styles.historyHint, hintStyle(entry.hint), isLatest && styles.historyHintLatest]}>
                    <Text style={styles.historyHintText}>{hintLabel(t, entry.hint)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {!finished ? (
          <View style={styles.inputArea}>
            <TextInput
              value={input}
              onChangeText={setInput}
              keyboardType="number-pad"
              placeholder={t('minigames.guessPlaceholder', { min: GUESS_NUMBER_MIN, max: GUESS_NUMBER_MAX })}
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.input}
              maxLength={3}
              returnKeyType="done"
              onSubmitEditing={submitGuess}
            />
            {inputError ? <Text style={styles.error}>{inputError}</Text> : null}
            <PremiumButton title={t('minigames.guessSubmit')} onPress={submitGuess} fullWidth size="sm" />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <MinigameResultPanel
        gameId="guess"
        stage={activeStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={won ? t('minigames.guessWin') : t('minigames.guessLose')}
        detail={t('minigames.guessResult', {
          attempts: attemptsUsed,
          max: stageConfig.maxAttempts,
          answer: secret,
        })}
        stageResult={{ won, attemptsUsed }}
        onRestart={handleRestart}
        onProgressUpdated={refresh}
        onNextStage={canAdvance ? handleNextStage : undefined}
        nextStageLabel={t('minigames.nextStage')}
        nextOrExitOnly
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, paddingBottom: theme.spacing.xl },
  target: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 19,
    paddingHorizontal: theme.spacing.sm,
  },
  hintUp: {
    backgroundColor: 'rgba(79,107,149,0.12)',
    borderColor: theme.colors.tint.border,
  },
  hintDown: {
    backgroundColor: 'rgba(251,191,36,0.14)',
    borderColor: theme.colors.borderGold,
  },
  hintCorrect: {
    backgroundColor: theme.colors.successSoft,
    borderColor: 'rgba(91,163,146,0.35)',
  },
  historyScroll: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: 300,
    minHeight: 120,
    marginBottom: theme.spacing.md,
  },
  historyContent: {
    gap: 8,
    paddingBottom: theme.spacing.sm,
    flexGrow: 1,
  },
  emptyHistory: {
    color: theme.colors.textSubtle,
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: theme.spacing.lg,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyRowLatest: {
    borderColor: theme.colors.primaryLight,
    borderWidth: 1.5,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  historyValue: {
    width: 48,
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  historyHint: {
    flex: 1,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  historyHintLatest: {
    borderWidth: 1.5,
  },
  historyHintText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  inputArea: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
