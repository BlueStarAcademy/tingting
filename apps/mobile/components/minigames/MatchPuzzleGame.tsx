import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import {
  MATCH_COLS,
  MATCH_ROWS,
  TILE_EMOJIS,
  applyGravity,
  areAdjacent,
  createMatchGrid,
  delay,
  findMatchCells,
  removeMatches,
  swapCells,
} from '@/lib/minigames/match-logic';
import { formatStageTarget, getMatchStageConfig } from '@/lib/minigames/stages';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

const SCORE_PER_TILE = 10;

export function MatchPuzzleGame() {
  const { t } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('match');
  const stageConfig = useMemo(() => getMatchStageConfig(currentStage), [currentStage]);
  const targetLabel = useMemo(() => {
    const target = formatStageTarget('match', currentStage);
    return t(target.key, target.params);
  }, [currentStage, t]);

  const [grid, setGrid] = useState<number[]>(() =>
    createMatchGrid(MATCH_ROWS, MATCH_COLS, stageConfig.tileTypeCount),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(stageConfig.timeSeconds);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const restart = useCallback(() => {
    const config = getMatchStageConfig(currentStage);
    setGrid(createMatchGrid(MATCH_ROWS, MATCH_COLS, config.tileTypeCount));
    setSelected(null);
    setScore(0);
    setTimeLeft(config.timeSeconds);
    setFinished(false);
    setBusy(false);
    busyRef.current = false;
  }, [currentStage]);

  useEffect(() => {
    if (loading) return;
    restart();
  }, [currentStage, loading, restart]);

  useEffect(() => {
    if (finished) return;
    if (timeLeft <= 0) {
      setFinished(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [finished, timeLeft]);

  const resolveMatches = useCallback(
    async (startGrid: number[]) => {
      let current = startGrid;
      while (true) {
        const matches = findMatchCells(current, MATCH_ROWS, MATCH_COLS);
        if (matches.size === 0) break;
        setScore((value) => value + matches.size * SCORE_PER_TILE);
        await delay(180);
        current = applyGravity(
          removeMatches(current, matches),
          MATCH_ROWS,
          MATCH_COLS,
          stageConfig.tileTypeCount,
        );
        setGrid(current);
        await delay(120);
      }
    },
    [stageConfig.tileTypeCount],
  );

  const handleCellPress = useCallback(
    async (index: number) => {
      if (finished || busyRef.current) return;

      if (selected === null) {
        setSelected(index);
        return;
      }

      if (selected === index) {
        setSelected(null);
        return;
      }

      if (!areAdjacent(selected, index, MATCH_COLS)) {
        setSelected(index);
        return;
      }

      busyRef.current = true;
      setBusy(true);
      const first = selected;
      setSelected(null);

      let next = swapCells(grid, first, index);
      setGrid(next);

      let matches = findMatchCells(next, MATCH_ROWS, MATCH_COLS);
      if (matches.size === 0) {
        await delay(220);
        next = swapCells(next, first, index);
        setGrid(next);
        busyRef.current = false;
        setBusy(false);
        return;
      }

      await resolveMatches(next);
      busyRef.current = false;
      setBusy(false);
    },
    [finished, grid, resolveMatches, selected],
  );

  if (loading) return null;

  return (
    <View style={styles.wrap}>
      <GameStatsBar
        stats={[
          { label: t('minigames.stage'), value: `${currentStage}/${MINIGAME_MAX_STAGE}` },
          { label: t('minigames.score'), value: score },
          { label: t('minigames.time'), value: `${timeLeft}s` },
        ]}
      />
      <Text style={styles.target}>{targetLabel}</Text>
      <Text style={styles.hint}>{t('minigames.matchHint')}</Text>
      <View style={styles.grid}>
        {grid.map((tile, index) => {
          const isSelected = selected === index;
          return (
            <Pressable
              key={index}
              onPress={() => handleCellPress(index)}
              disabled={finished || busy}
              style={[
                styles.cell,
                isSelected && styles.cellSelected,
                (finished || busy) && styles.cellDisabled,
              ]}
            >
              <Text style={styles.emoji}>{TILE_EMOJIS[tile] ?? '·'}</Text>
            </Pressable>
          );
        })}
      </View>
      <MinigameResultPanel
        gameId="match"
        stage={currentStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={String(score)}
        detail={t('minigames.matchResult', { score })}
        stageResult={{ score }}
        onRestart={restart}
        onProgressUpdated={refresh}
      />
    </View>
  );
}

const cellSize = 46;

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  target: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: MATCH_COLS * (cellSize + 6),
  },
  cell: {
    width: cellSize,
    height: cellSize,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cellSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint.soft,
    transform: [{ scale: 1.05 }],
  },
  cellDisabled: { opacity: 0.85 },
  emoji: { fontSize: 24 },
});
