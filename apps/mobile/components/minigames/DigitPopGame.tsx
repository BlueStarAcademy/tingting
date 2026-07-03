import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { NumberPad } from '@/components/minigames/NumberPad';
import { HowToPlayModal } from '@/components/minigames/HowToPlayModal';
import { MinigameHelpButton } from '@/components/minigames/MinigameHelpButton';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { getCodeStageConfig } from '@/lib/minigames/stages';
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
import { MAIN_TAB_BAR_HEIGHT } from '@/constants/layout';
import { theme } from '@/constants/theme';

function feedbackStyle(feedback: CodeFeedback) {
  if (feedback === 'exact') return styles.cellExact;
  if (feedback === 'present') return styles.cellPresent;
  return styles.cellAbsent;
}

function DigitCells({
  digits,
  feedback,
  cellSize,
  gap,
}: {
  digits: number[];
  feedback?: CodeFeedback[];
  cellSize: number;
  gap: number;
}) {
  return (
    <View style={[styles.digitRow, { gap }]}>
      {digits.map((digit, index) => (
        <View
          key={`${digit}-${index}`}
          style={[
            styles.digitCell,
            { width: cellSize, height: cellSize + 4, borderRadius: Math.max(6, cellSize * 0.2) },
            feedback ? feedbackStyle(feedback[index]) : styles.digitCellEmpty,
          ]}
        >
          <Text
            includeFontPadding={false}
            style={[styles.digitText, { fontSize: Math.max(15, cellSize * 0.48), lineHeight: cellSize + 2 }]}
          >
            {digit}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function DigitPopGame({ initialStage }: { initialStage?: number } = {}) {
  const { t, tArray } = useLocale();
  const { width: windowWidth } = useWindowDimensions();
  const { currentStage, loading, refresh } = useMinigameProgress('code');
  const [activeStage, setActiveStage] = useState(initialStage ?? 1);
  const initialStageSynced = useRef(false);
  const hasLoadedOnce = useRef(false);
  const bootedStageRef = useRef<number | null>(null);
  const historyScrollRef = useRef<ScrollView>(null);
  const [showHelp, setShowHelp] = useState(false);

  const digitGap = 5;
  const digitCellSize = useMemo(() => {
    const horizontalPadding = theme.spacing.lg * 2 + theme.spacing.md * 2;
    const available = Math.max(260, windowWidth - horizontalPadding);
    return Math.min(36, Math.floor((available - digitGap * (CODE_DIGIT_COUNT - 1)) / CODE_DIGIT_COUNT));
  }, [windowWidth]);

  const stageConfig = useMemo(() => getCodeStageConfig(activeStage), [activeStage]);

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
    if (!loading) hasLoadedOnce.current = true;
  }, [loading]);

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    if (!initialStage) setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, initialStage, loading]);

  const restart = useCallback((stage = activeStage) => {
    const config = getCodeStageConfig(stage);
    setSecret(rollSecretCode(config.digitCount));
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

  const scrollHistoryToEnd = useCallback(() => {
    const node = historyScrollRef.current;
    if (!node) return;
    const scroll = (animated: boolean) => node.scrollToEnd({ animated });
    scroll(false);
    requestAnimationFrame(() => {
      scroll(true);
      setTimeout(() => scroll(false), 100);
    });
  }, []);

  useEffect(() => {
    if (history.length === 0) return;
    scrollHistoryToEnd();
  }, [history, scrollHistoryToEnd]);

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

  const handleDigit = useCallback((digit: string) => {
    if (finished) return;
    setInput((prev) => {
      if (prev.length >= CODE_DIGIT_COUNT) return prev;
      const next = prev + digit;
      if (next.length === CODE_DIGIT_COUNT) {
        setTimeout(() => applyGuess(next), 50);
      }
      return next;
    });
  }, [finished, applyGuess]);

  const handleDelete = useCallback(() => {
    setInput((prev) => prev.slice(0, -1));
    setInputError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    applyGuess(input);
  }, [applyGuess, input]);

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
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <GameStatsBar
            stats={[
              { label: t('minigames.stage'), value: `${activeStage}/${MINIGAME_MAX_STAGE}` },
              { label: t('minigames.attempts'), value: `${attemptsUsed}/${stageConfig.maxAttempts}` },
              { label: t('minigames.remaining'), value: attemptsLeft },
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

        <ScrollView
          ref={historyScrollRef}
          style={styles.historyScroll}
          contentContainerStyle={[
            styles.historyContent,
            history.length > 0 ? styles.historyContentFilled : null,
          ]}
          onContentSizeChange={scrollHistoryToEnd}
          showsVerticalScrollIndicator={false}
          clipToPadding={false}
          nestedScrollEnabled
        >
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>{t('minigames.codeEmpty')}</Text>
          ) : (
            history.map((entry, index) => (
              <View key={`guess-${index}`} style={styles.historyRow}>
                <DigitCells
                  digits={entry.digits}
                  feedback={entry.feedback}
                  cellSize={digitCellSize}
                  gap={digitGap}
                />
              </View>
            ))
          )}
        </ScrollView>

        {!finished ? (
          <View style={styles.inputArea}>
            <View style={[styles.digitRow, { gap: digitGap }]}>
              {previewDigits.map((digit, index) => (
                <View
                  key={`preview-${index}`}
                  style={[
                    styles.digitCell,
                    {
                      width: digitCellSize,
                      height: digitCellSize + 4,
                      borderRadius: Math.max(6, digitCellSize * 0.2),
                    },
                    digit === null ? styles.digitCellEmpty : styles.digitCellFilled,
                    input.length === index && styles.digitCellActive,
                  ]}
                >
                  <Text
                    includeFontPadding={false}
                    style={[
                      styles.digitText,
                      { fontSize: Math.max(15, digitCellSize * 0.48), lineHeight: digitCellSize + 2 },
                    ]}
                  >
                    {digit ?? ''}
                  </Text>
                </View>
              ))}
            </View>
            {inputError ? <Text style={styles.error}>{inputError}</Text> : null}
            <NumberPad
              onDigit={handleDigit}
              onDelete={handleDelete}
              onSubmit={handleSubmit}
              submitLabel={t('minigames.codeSubmit')}
              disabled={finished}
            />
          </View>
        ) : null}
      </View>

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
        onRestart={handleRestart}
        onProgressUpdated={refresh}
        onNextStage={canAdvance ? handleNextStage : undefined}
        nextStageLabel={t('minigames.nextStage')}
        nextOrExitOnly
      />

      <HowToPlayModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('minigames.howToPlay')}
        rules={tArray('minigames.rulesCode')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0 },
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
    maxHeight: 200,
    minHeight: 80,
    marginBottom: theme.spacing.sm,
  },
  historyContent: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
    gap: 10,
  },
  historyContentFilled: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  historyRow: {
    paddingVertical: 3,
    alignItems: 'center',
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
    alignItems: 'center',
    flexWrap: 'nowrap',
    maxWidth: '100%',
  },
  digitCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'visible',
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
    fontWeight: '900',
    color: theme.colors.text,
    textAlign: 'center',
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
    gap: theme.spacing.xs,
    paddingBottom: MAIN_TAB_BAR_HEIGHT + theme.spacing.sm,
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
