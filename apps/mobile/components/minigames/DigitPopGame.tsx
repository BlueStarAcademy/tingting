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
import { formatStageTarget, getCodeStageConfig } from '@/lib/minigames/stages';
import {
  CODE_DIGIT_COUNT,
  evaluateCodeGuess,
  isCodeCorrect,
  parseCodeInput,
  rollSecretCode,
  type CodeFeedback,
  type CodeGuessEntry,
} from '@/lib/minigames/code-logic';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

function feedbackStyle(feedback: CodeFeedback) {
  if (feedback === 'exact') return styles.cellExact;
  if (feedback === 'present') return styles.cellPresent;
  return styles.cellAbsent;
}

function DigitCells({ digits, feedback }: { digits: number[]; feedback?: CodeFeedback[] }) {
  return (
    <View style={styles.digitRow}>
      {digits.map((digit, index) => (
        <View
          key={`${digit}-${index}`}
          style={[styles.digitCell, feedback ? feedbackStyle(feedback[index]) : styles.digitCellEmpty]}
        >
          <Text style={styles.digitText}>{digit}</Text>
        </View>
      ))}
    </View>
  );
}

export function DigitPopGame() {
  const { t } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('code');
  const [activeStage, setActiveStage] = useState(1);
  const initialStageSynced = useRef(false);
  const inputRef = useRef<TextInput>(null);

  const stageConfig = useMemo(() => getCodeStageConfig(activeStage), [activeStage]);
  const targetLabel = useMemo(() => {
    const target = formatStageTarget('code', activeStage);
    return t(target.key, target.params);
  }, [activeStage, t]);

  const [secret, setSecret] = useState(() => rollSecretCode(stageConfig.digitCount));
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CodeGuessEntry[]>([]);
  const [won, setWon] = useState(false);
  const [finished, setFinished] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const attemptsUsed = history.length;
  const attemptsLeft = Math.max(0, stageConfig.maxAttempts - attemptsUsed);
  const previewDigits = useMemo(() => {
    return Array.from({ length: CODE_DIGIT_COUNT }, (_, index) => {
      const char = input[index];
      return char && /\d/.test(char) ? Number(char) : null;
    });
  }, [input]);

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, loading]);

  const restart = useCallback(() => {
    setSecret(rollSecretCode(CODE_DIGIT_COUNT));
    setInput('');
    setHistory([]);
    setWon(false);
    setFinished(false);
    setInputError(null);
  }, []);

  useEffect(() => {
    if (loading || !initialStageSynced.current) return;
    restart();
  }, [activeStage, loading, restart]);

  useEffect(() => {
    if (loading || finished) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [loading, finished, activeStage]);

  const applyGuess = useCallback(
    (raw: string) => {
      if (finished) return;
      const digits = parseCodeInput(raw);
      if (!digits) {
        setInputError(t('minigames.codeInvalid', { count: CODE_DIGIT_COUNT }));
        return;
      }

      setInputError(null);
      const feedback = evaluateCodeGuess(secret, digits);

      setHistory((prev) => {
        const nextHistory = [...prev, { digits, feedback }];

        if (isCodeCorrect(feedback)) {
          setWon(true);
          setFinished(true);
        } else if (nextHistory.length >= stageConfig.maxAttempts) {
          setFinished(true);
        }

        return nextHistory;
      });
      setInput('');
    },
    [finished, secret, stageConfig.maxAttempts, t],
  );

  const handleInputChange = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, CODE_DIGIT_COUNT);
    setInput(next);
    setInputError(null);
    if (next.length === CODE_DIGIT_COUNT) {
      applyGuess(next);
    }
  };

  const submitGuess = () => applyGuess(input);

  const handleNextStage = useCallback(async () => {
    await refresh();
    setFinished(false);
    setActiveStage((stage) => Math.min(stage + 1, MINIGAME_MAX_STAGE));
  }, [refresh]);

  const canAdvance = activeStage < MINIGAME_MAX_STAGE && won;

  if (loading) return null;

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
        <Text style={styles.hint}>{t('minigames.codeHint')}</Text>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.cellExact]} />
            <Text style={styles.legendText}>{t('minigames.codeExact')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.cellPresent]} />
            <Text style={styles.legendText}>{t('minigames.codePresent')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.cellAbsent]} />
            <Text style={styles.legendText}>{t('minigames.codeAbsent')}</Text>
          </View>
        </View>

        <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent}>
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>{t('minigames.codeEmpty')}</Text>
          ) : (
            history.map((entry, index) => (
              <DigitCells key={`guess-${index}`} digits={entry.digits} feedback={entry.feedback} />
            ))
          )}
        </ScrollView>

        {!finished ? (
          <View style={styles.inputArea}>
            <View style={styles.digitRow}>
              {previewDigits.map((digit, index) => (
                <View
                  key={`preview-${index}`}
                  style={[
                    styles.digitCell,
                    digit === null ? styles.digitCellEmpty : styles.digitCellFilled,
                    input.length === index && styles.digitCellActive,
                  ]}
                >
                  <Text style={styles.digitText}>{digit ?? ''}</Text>
                </View>
              ))}
            </View>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={handleInputChange}
              keyboardType="number-pad"
              inputMode="numeric"
              style={styles.codeInput}
              maxLength={CODE_DIGIT_COUNT}
              placeholder={t('minigames.codePlaceholder')}
              placeholderTextColor={theme.colors.textSubtle}
              returnKeyType="done"
              onSubmitEditing={submitGuess}
              autoFocus
            />
            {inputError ? <Text style={styles.error}>{inputError}</Text> : null}
            <PremiumButton title={t('minigames.codeSubmit')} onPress={submitGuess} fullWidth size="sm" />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <MinigameResultPanel
        gameId="code"
        stage={activeStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={won ? t('minigames.codeWin') : t('minigames.codeLose')}
        detail={t('minigames.codeResult', {
          attempts: attemptsUsed,
          max: stageConfig.maxAttempts,
          answer: secret.join(''),
        })}
        stageResult={{ won, attemptsUsed }}
        onRestart={restart}
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
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  historyScroll: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: 260,
    minHeight: 100,
    marginBottom: theme.spacing.md,
  },
  historyContent: {
    gap: 8,
    paddingBottom: theme.spacing.sm,
  },
  emptyHistory: {
    color: theme.colors.textSubtle,
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: theme.spacing.lg,
  },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  digitCell: {
    width: 34,
    height: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  digitCellEmpty: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
  },
  digitCellFilled: {
    backgroundColor: theme.colors.tint.soft,
    borderColor: theme.colors.tint.border,
  },
  digitCellActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  digitText: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text,
  },
  cellExact: {
    backgroundColor: 'rgba(91,163,146,0.28)',
    borderColor: theme.colors.success,
  },
  cellPresent: {
    backgroundColor: 'rgba(251,191,36,0.28)',
    borderColor: theme.colors.star,
  },
  cellAbsent: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  inputArea: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  codeInput: {
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
    letterSpacing: 8,
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
