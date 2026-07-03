import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { ComboBanner } from '@/components/minigames/ComboBanner';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import {
  MATCH_COLS,
  MATCH_ROWS,
  applyGravityWithMoves,
  applySpecialSpawns,
  areAdjacent,
  buildMatchResolution,
  createMatchGrid,
  delay,
  findMatchCells,
  getTileEmoji,
  isSpecial,
  maxFallAnimationMs,
  removeMatches,
  resolveSwapActivation,
  scoreForClear,
  swapCells,
} from '@/lib/minigames/match-logic';
import { getMatchStageConfig } from '@/lib/minigames/stages';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

const CELL_SIZE = 46;
const CELL_GAP = 6;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const GRID_WIDTH = MATCH_COLS * CELL_SIZE + (MATCH_COLS - 1) * CELL_GAP;
const GRID_HEIGHT = MATCH_ROWS * CELL_SIZE + (MATCH_ROWS - 1) * CELL_GAP;

function cellPosition(index: number): { left: number; top: number } {
  const col = index % MATCH_COLS;
  const row = Math.floor(index / MATCH_COLS);
  return { left: col * CELL_STEP, top: row * CELL_STEP };
}

interface FloatingScore {
  id: string;
  amount: number;
  x: number;
  y: number;
}

interface MatchCellProps {
  tile: number;
  index: number;
  positionStyle: StyleProp<ViewStyle>;
  isSelected: boolean;
  isHighlighted: boolean;
  isRemoving: boolean;
  fallFromRows: number;
  disabled: boolean;
  onPress: (index: number) => void;
}

function MatchCell({
  tile,
  index,
  positionStyle,
  isSelected,
  isHighlighted,
  isRemoving,
  fallFromRows,
  disabled,
  onPress,
}: MatchCellProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const fallToken = useRef(0);

  useEffect(() => {
    if (isHighlighted) {
      glow.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]),
        { iterations: 3 },
      ).start();
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 140, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [glow, isHighlighted, scale]);

  useEffect(() => {
    if (isRemoving) {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.2, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(1);
      opacity.setValue(1);
    }
  }, [isRemoving, opacity, scale]);

  useEffect(() => {
    if (fallFromRows === 0) return;

    const token = ++fallToken.current;
    translateY.setValue(-fallFromRows * CELL_STEP);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 200 + fallFromRows * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished: done }) => {
      if (!done || token !== fallToken.current) return;
      translateY.setValue(0);
    });
  }, [fallFromRows, translateY]);

  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const special = isSpecial(tile);

  return (
    <Pressable
      onPress={() => onPress(index)}
      disabled={disabled}
      style={[styles.cellPressable, positionStyle, isSelected && styles.cellSelectedShell]}
    >
      <Animated.View
        style={[
          styles.cell,
          special && styles.cellSpecial,
          isSelected && styles.cellSelected,
          isHighlighted && styles.cellHighlighted,
          {
            opacity,
            transform: [{ translateY }, { scale: Animated.multiply(scale, isHighlighted ? glowScale : 1) }],
          },
        ]}
      >
        <Text style={[styles.emoji, special && styles.emojiSpecial]}>{getTileEmoji(tile)}</Text>
      </Animated.View>
    </Pressable>
  );
}

function FloatingScorePop({ item, onDone }: { item: FloatingScore; onDone: (id: string) => void }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -36, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start(() => onDone(item.id));
  }, [item.id, onDone, opacity, translateY]);

  return (
    <Animated.Text
      style={[
        styles.floatingScore,
        { left: item.x, top: item.y, opacity, transform: [{ translateY }] },
      ]}
    >
      +{item.amount}
    </Animated.Text>
  );
}

export function MatchPuzzleGame() {
  const { t } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('match');
  const [activeStage, setActiveStage] = useState(1);
  const stageConfig = useMemo(() => getMatchStageConfig(activeStage), [activeStage]);

  const [grid, setGrid] = useState<number[]>(() =>
    createMatchGrid(MATCH_ROWS, MATCH_COLS, stageConfig.tileTypeCount),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(stageConfig.timeSeconds);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [removing, setRemoving] = useState<Set<number>>(new Set());
  const [fallOffsets, setFallOffsets] = useState<Map<number, number>>(new Map());
  const [combo, setCombo] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [sessionId, setSessionId] = useState(0);

  const busyRef = useRef(false);
  const scoreRef = useRef(0);
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const floatId = useRef(0);
  const initialStageSynced = useRef(false);
  const pendingTimeoutRef = useRef(false);

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, loading]);

  const restart = useCallback(
    (stage = activeStage) => {
      const config = getMatchStageConfig(stage);
      setGrid(createMatchGrid(MATCH_ROWS, MATCH_COLS, config.tileTypeCount));
      setSelected(null);
      setScore(0);
      scoreRef.current = 0;
      setDisplayScore(0);
      scoreAnim.setValue(0);
      setTimeLeft(config.timeSeconds);
      setFinished(false);
      setBusy(false);
      setHighlighted(new Set());
      setRemoving(new Set());
      setFallOffsets(new Map());
      setCombo(0);
      setFloatingScores([]);
      setSessionId((id) => id + 1);
      busyRef.current = false;
      pendingTimeoutRef.current = false;
    },
    [activeStage, scoreAnim],
  );

  useEffect(() => {
    if (loading || !initialStageSynced.current) return;
    restart(activeStage);
  }, [activeStage, loading, restart]);

  const tryFinishGame = useCallback(() => {
    if (finished) return;
    if (scoreRef.current >= stageConfig.targetScore || pendingTimeoutRef.current) {
      setFinished(true);
    }
  }, [finished, stageConfig.targetScore]);

  useEffect(() => {
    if (finished || timeLeft > 0) return;
    if (busyRef.current) {
      pendingTimeoutRef.current = true;
      return;
    }
    setFinished(true);
  }, [finished, timeLeft]);

  useEffect(() => {
    if (finished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [finished, sessionId]);

  useEffect(() => {
    const listener = scoreAnim.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => scoreAnim.removeListener(listener);
  }, [scoreAnim]);

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

  const addFloatingScore = useCallback((amount: number, cellIndex: number) => {
    const { left, top } = cellPosition(cellIndex);
    const id = `float-${floatId.current++}`;
    setFloatingScores((prev) => [
      ...prev,
      {
        id,
        amount,
        x: left + CELL_SIZE / 2 - 16,
        y: top,
      },
    ]);
  }, []);

  const removeFloatingScore = useCallback((id: string) => {
    setFloatingScores((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const finishInteraction = useCallback(async () => {
    await delay(450);
    busyRef.current = false;
    setBusy(false);
    tryFinishGame();
  }, [tryFinishGame]);

  const processClearStep = useCallback(
    async (
      current: number[],
      cleared: Set<number>,
      specials: Map<number, number>,
      comboLevel: number,
    ) => {
      setHighlighted(new Set(cleared));
      setRemoving(new Set());
      await delay(360);

      const points = scoreForClear(cleared.size, comboLevel);
      const nextScore = scoreRef.current + points;
      scoreRef.current = nextScore;
      setScore(nextScore);
      animateScoreTo(nextScore);
      setCombo(comboLevel);
      const sampleCell = cleared.values().next().value;
      if (sampleCell !== undefined) addFloatingScore(points, sampleCell);

      setRemoving(new Set(cleared));
      setHighlighted(new Set());
      await delay(240);

      let next = removeMatches(current, cleared);
      next = applySpecialSpawns(next, specials);
      const { grid: afterGravity, moves } = applyGravityWithMoves(
        next,
        MATCH_ROWS,
        MATCH_COLS,
        stageConfig.tileTypeCount,
      );

      const offsets = new Map<number, number>();
      for (const move of moves) {
        if (move.isNew) {
          offsets.set(move.index, move.toRow + 1);
        } else if (move.fromRow >= 0 && move.fromRow !== move.toRow) {
          offsets.set(move.index, move.fromRow - move.toRow);
        }
      }

      setFallOffsets(offsets);
      setRemoving(new Set());
      setGrid(afterGravity);
      await delay(maxFallAnimationMs(moves));
      setFallOffsets(new Map());

      return afterGravity;
    },
    [addFloatingScore, animateScoreTo, stageConfig.tileTypeCount],
  );

  const resolveCascade = useCallback(
    async (startGrid: number[], initialCleared?: Set<number>) => {
      let current = startGrid;
      let comboLevel = 0;

      if (initialCleared && initialCleared.size > 0) {
        comboLevel += 1;
        current = await processClearStep(current, initialCleared, new Map(), comboLevel);
      }

      while (true) {
        const resolution = buildMatchResolution(current, MATCH_ROWS, MATCH_COLS);
        if (resolution.cleared.size === 0) break;
        comboLevel += 1;
        current = await processClearStep(
          current,
          resolution.cleared,
          resolution.specialsToSpawn,
          comboLevel,
        );
      }

      if (comboLevel === 0) setCombo(0);
    },
    [processClearStep],
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
      await delay(140);

      const specialActivation = resolveSwapActivation(next, first, index, MATCH_ROWS, MATCH_COLS);
      if (specialActivation && specialActivation.size > 0) {
        await resolveCascade(next, specialActivation);
        await finishInteraction();
        return;
      }

      const matches = findMatchCells(next, MATCH_ROWS, MATCH_COLS);
      if (matches.size === 0) {
        await delay(180);
        next = swapCells(next, first, index);
        setGrid(next);
        await finishInteraction();
        return;
      }

      await resolveCascade(next);
      await finishInteraction();
    },
    [finishInteraction, finished, grid, resolveCascade, selected],
  );

  const handleNextStage = useCallback(async () => {
    await refresh();
    setFinished(false);
    setActiveStage((stage) => Math.min(stage + 1, MINIGAME_MAX_STAGE));
  }, [refresh]);

  const comboLabel = t('minigames.combo', { count: combo });
  const canAdvance = activeStage < MINIGAME_MAX_STAGE;

  if (loading) return null;

  return (
    <View style={styles.wrap}>
      <GameStatsBar
        stats={[
          { label: t('minigames.stage'), value: `${activeStage}/${MINIGAME_MAX_STAGE}` },
          { label: t('minigames.score'), value: `${displayScore}/${stageConfig.targetScore}` },
          { label: t('minigames.time'), value: `${timeLeft}s` },
        ]}
      />

      <View style={styles.boardWrap}>
        <View style={[styles.grid, { width: GRID_WIDTH, height: GRID_HEIGHT }]}>
          {grid.map((tile, index) => (
            <MatchCell
              key={index}
              tile={tile}
              index={index}
              positionStyle={cellPosition(index)}
              isSelected={selected === index}
              isHighlighted={highlighted.has(index)}
              isRemoving={removing.has(index)}
              fallFromRows={fallOffsets.get(index) ?? 0}
              disabled={finished || busy}
              onPress={handleCellPress}
            />
          ))}
        </View>
        {floatingScores.map((item) => (
          <FloatingScorePop key={item.id} item={item} onDone={removeFloatingScore} />
        ))}
        <ComboBanner combo={combo} label={comboLabel} reserveSpace />
      </View>

      <MinigameResultPanel
        gameId="match"
        stage={activeStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={String(score)}
        detail={t('minigames.matchResult', { score })}
        stageResult={{ score }}
        onRestart={() => restart(activeStage)}
        onProgressUpdated={refresh}
        onNextStage={canAdvance ? handleNextStage : undefined}
        nextStageLabel={t('minigames.nextStage')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
  boardWrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  grid: {
    position: 'relative',
  },
  cellPressable: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cellSpecial: {
    borderColor: theme.colors.star,
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  cellSelectedShell: {
    zIndex: 2,
  },
  cellSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tint.soft,
  },
  cellHighlighted: {
    borderColor: theme.colors.success,
    backgroundColor: 'rgba(34,197,94,0.18)',
    shadowColor: theme.colors.success,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  emoji: { fontSize: 24 },
  emojiSpecial: { fontSize: 22 },
  floatingScore: {
    position: 'absolute',
    color: theme.colors.star,
    fontSize: 18,
    fontWeight: '900',
    zIndex: 6,
  },
});
