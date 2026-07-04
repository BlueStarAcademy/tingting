import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { ComboBanner } from '@/components/minigames/ComboBanner';
import { HowToPlayModal } from '@/components/minigames/HowToPlayModal';
import { MinigameHelpButton } from '@/components/minigames/MinigameHelpButton';
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
  createObstacles,
  damageObstacles,
  delay,
  findMatchCells,
  getTileEmoji,
  isSpecial,
  maxFallAnimationMs,
  removeMatches,
  resolveSwapActivation,
  scoreForClear,
  swapCells,
  type ObstacleCell,
} from '@/lib/minigames/match-logic';
import { getMatchStageConfig } from '@/lib/minigames/stages';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

const CELL_SIZE = 44;
const CELL_GAP = 4;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const GRID_WIDTH = MATCH_COLS * CELL_SIZE + (MATCH_COLS - 1) * CELL_GAP;
const GRID_HEIGHT = MATCH_ROWS * CELL_SIZE + (MATCH_ROWS - 1) * CELL_GAP;
const MATCH_ITEM_INITIAL_COUNT = 3;
const MATCH_TIME_EXTENSION_SECONDS = 10;
const DRAG_SWAP_THRESHOLD = 18;

type MatchItemKey = 'shuffle' | 'time' | 'hint';
type MatchItemCounts = Record<MatchItemKey, number>;

const INITIAL_MATCH_ITEMS: MatchItemCounts = {
  shuffle: MATCH_ITEM_INITIAL_COUNT,
  time: MATCH_ITEM_INITIAL_COUNT,
  hint: MATCH_ITEM_INITIAL_COUNT,
};

function cellPosition(index: number): { left: number; top: number } {
  const col = index % MATCH_COLS;
  const row = Math.floor(index / MATCH_COLS);
  return { left: col * CELL_STEP, top: row * CELL_STEP };
}

function getDragSwapTarget(index: number, dx: number, dy: number): number | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SWAP_THRESHOLD) return null;

  const row = Math.floor(index / MATCH_COLS);
  const col = index % MATCH_COLS;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && col < MATCH_COLS - 1) return index + 1;
    if (dx < 0 && col > 0) return index - 1;
    return null;
  }

  if (dy > 0 && row < MATCH_ROWS - 1) return index + MATCH_COLS;
  if (dy < 0 && row > 0) return index - MATCH_COLS;
  return null;
}

function findHintMove(grid: number[], obstacles: Map<number, ObstacleCell>): [number, number] | null {
  for (let index = 0; index < grid.length; index += 1) {
    if (obstacles.has(index)) continue;

    const candidates = [index + 1, index + MATCH_COLS];
    for (const target of candidates) {
      if (target >= grid.length || obstacles.has(target)) continue;
      if (!areAdjacent(index, target, MATCH_COLS)) continue;

      const next = swapCells(grid, index, target);
      const specialActivation = resolveSwapActivation(next, index, target, MATCH_ROWS, MATCH_COLS);
      if ((specialActivation?.size ?? 0) > 0 || findMatchCells(next, MATCH_ROWS, MATCH_COLS).size > 0) {
        return [index, target];
      }
    }
  }

  return null;
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
  obstacle: ObstacleCell | undefined;
  onDragSwap: (from: number, to: number) => void;
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
  obstacle,
  onDragSwap,
}: MatchCellProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const fallToken = useRef(0);
  const dragHandled = useRef(false);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onStartShouldSetPanResponderCapture: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) >= 4,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          !disabled && Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) >= 4,
        onPanResponderGrant: () => {
          dragHandled.current = false;
        },
        onPanResponderMove: (_, gesture) => {
          if (disabled || dragHandled.current) return;
          const target = getDragSwapTarget(index, gesture.dx, gesture.dy);
          if (target === null) return;
          dragHandled.current = true;
          onDragSwap(index, target);
        },
        onPanResponderRelease: (_, gesture) => {
          if (disabled || dragHandled.current) return;
          const target = getDragSwapTarget(index, gesture.dx, gesture.dy);
          if (target !== null) onDragSwap(index, target);
        },
        onPanResponderTerminate: (_, gesture) => {
          if (disabled || dragHandled.current) return;
          const target = getDragSwapTarget(index, gesture.dx, gesture.dy);
          if (target !== null) onDragSwap(index, target);
        },
      }),
    [disabled, index, onDragSwap],
  );

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

  if (obstacle) {
    return (
      <View style={[styles.cellPressable, positionStyle]}>
        <View style={[styles.cell, styles.cellObstacle, obstacle.health >= 2 && styles.cellObstacleStrong]}>
        <Text selectable={false} style={styles.obstacleEmoji}>{obstacle.health >= 2 ? '🧱' : '🪨'}</Text>
          {obstacle.health >= 2 ? (
            <View style={styles.obstacleHealthBadge}>
              <Text style={styles.obstacleHealthText}>{obstacle.health}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      {...panResponder.panHandlers}
      accessible={false}
      style={[styles.cellPressable, positionStyle]}
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
        <Text selectable={false} style={[styles.emoji, special && styles.emojiSpecial]}>{getTileEmoji(tile)}</Text>
      </Animated.View>
    </View>
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

function TimeProgressBar({ timeLeft, totalTime }: { timeLeft: number; totalTime: number }) {
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const isLow = progress <= 0.25;
  const isMid = progress > 0.25 && progress <= 0.5;

  return (
    <View style={styles.timerWrap}>
      <View style={styles.timerTrack}>
        <View
          style={[
            styles.timerFill,
            { width: `${progress * 100}%` },
            isLow && styles.timerFillLow,
            isMid && styles.timerFillMid,
          ]}
        />
      </View>
      <Text style={[styles.timerText, isLow && styles.timerTextLow]}>{timeLeft}s</Text>
    </View>
  );
}

function MatchItemButton({
  icon,
  label,
  count,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  count: number;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.itemButton, disabled && styles.itemButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.itemIcon}>{icon}</Text>
      <Text style={styles.itemLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.itemCount}>x{count}</Text>
    </Pressable>
  );
}

export function MatchPuzzleGame({ initialStage }: { initialStage?: number } = {}) {
  const { t, tArray } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('match');
  const [activeStage, setActiveStage] = useState(initialStage ?? 1);
  const stageConfig = useMemo(() => getMatchStageConfig(activeStage), [activeStage]);
  const [showHelp, setShowHelp] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  const [grid, setGrid] = useState<number[]>(() =>
    createMatchGrid(MATCH_ROWS, MATCH_COLS, stageConfig.tileTypeCount),
  );
  const [obstacles, setObstacles] = useState<Map<number, ObstacleCell>>(() =>
    createObstacles(MATCH_ROWS, MATCH_COLS, activeStage),
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
  const [itemCounts, setItemCounts] = useState<MatchItemCounts>(INITIAL_MATCH_ITEMS);

  const busyRef = useRef(false);
  const scoreRef = useRef(0);
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const floatId = useRef(0);
  const initialStageSynced = useRef(false);
  const pendingTimeoutRef = useRef(false);

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    if (!initialStage) setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, initialStage, loading]);

  const restart = useCallback(
    (stage = activeStage) => {
      const config = getMatchStageConfig(stage);
      setGrid(createMatchGrid(MATCH_ROWS, MATCH_COLS, config.tileTypeCount));
      setObstacles(createObstacles(MATCH_ROWS, MATCH_COLS, stage));
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
      setItemCounts(INITIAL_MATCH_ITEMS);
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
    if (!gameStarted || finished || timeLeft > 0) return;
    if (busyRef.current) {
      pendingTimeoutRef.current = true;
      return;
    }
    setFinished(true);
  }, [finished, gameStarted, timeLeft]);

  useEffect(() => {
    if (!gameStarted || finished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [finished, gameStarted, sessionId]);

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

      // Damage obstacles adjacent to cleared cells
      setObstacles((prev) => {
        const { updated } = damageObstacles(prev, cleared, MATCH_ROWS, MATCH_COLS);
        return updated;
      });

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
      let allowColorClear = !initialCleared;

      if (initialCleared && initialCleared.size > 0) {
        comboLevel += 1;
        current = await processClearStep(current, initialCleared, new Map(), comboLevel);
      }

      while (true) {
        const resolution = buildMatchResolution(current, MATCH_ROWS, MATCH_COLS, { allowColorClear });
        allowColorClear = false;
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

  const handleSwap = useCallback(
    async (first: number, target: number) => {
      if (!gameStarted || finished || busyRef.current) return;
      if (!areAdjacent(first, target, MATCH_COLS)) return;
      if (obstacles.has(first) || obstacles.has(target)) return;

      busyRef.current = true;
      setBusy(true);
      setSelected(null);

      let next = swapCells(grid, first, target);
      setGrid(next);
      await delay(140);

      const specialActivation = resolveSwapActivation(next, first, target, MATCH_ROWS, MATCH_COLS);
      if (specialActivation && specialActivation.size > 0) {
        await resolveCascade(next, specialActivation);
        await finishInteraction();
        return;
      }

      const matches = findMatchCells(next, MATCH_ROWS, MATCH_COLS);
      if (matches.size === 0) {
        await delay(180);
        next = swapCells(next, first, target);
        setGrid(next);
        await finishInteraction();
        return;
      }

      await resolveCascade(next);
      await finishInteraction();
    },
    [finishInteraction, finished, gameStarted, grid, obstacles, resolveCascade],
  );

  const handleDragSwap = useCallback(
    (from: number, to: number) => {
      void handleSwap(from, to);
    },
    [handleSwap],
  );

  const useMatchItem = useCallback(
    (key: MatchItemKey, action: () => boolean | void) => {
      if (!gameStarted || finished || busyRef.current || itemCounts[key] <= 0) return;
      const used = action();
      if (used === false) return;
      setItemCounts((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));
    },
    [finished, gameStarted, itemCounts],
  );

  const handleShuffleItem = useCallback(() => {
    useMatchItem('shuffle', () => {
      setSelected(null);
      setHighlighted(new Set());
      setGrid(createMatchGrid(MATCH_ROWS, MATCH_COLS, stageConfig.tileTypeCount));
      setSessionId((id) => id + 1);
    });
  }, [stageConfig.tileTypeCount, useMatchItem]);

  const handleTimeItem = useCallback(() => {
    useMatchItem('time', () => {
      setTimeLeft((value) => value + MATCH_TIME_EXTENSION_SECONDS);
      setSessionId((id) => id + 1);
    });
  }, [useMatchItem]);

  const handleHintItem = useCallback(() => {
    useMatchItem('hint', () => {
      const move = findHintMove(grid, obstacles);
      if (!move) return false;
      setSelected(null);
      setHighlighted(new Set(move));
      setTimeout(() => {
        setHighlighted((current) => {
          const [first, second] = move;
          if (!current.has(first) || !current.has(second)) return current;
          return new Set();
        });
      }, 1600);
    });
  }, [grid, obstacles, useMatchItem]);

  const handleNextStage = useCallback(async () => {
    await refresh();
    setFinished(false);
    setActiveStage((stage) => Math.min(stage + 1, MINIGAME_MAX_STAGE));
  }, [refresh]);

  const comboLabel = t('minigames.combo', { count: combo });
  const canAdvance = activeStage < MINIGAME_MAX_STAGE;
  const scoreProgress = Math.min(displayScore / stageConfig.targetScore, 1);
  const handleHelpClose = () => {
    if (!gameStarted) setGameStarted(true);
    setShowHelp(false);
  };

  if (loading) return null;

  return (
    <View style={styles.wrap}>
      {/* Header stats */}
      <View style={styles.headerRow}>
        <View style={styles.statChip}>
          <Text style={styles.statLabel}>{t('minigames.stage')}</Text>
          <Text style={styles.statValue}>{activeStage}/{MINIGAME_MAX_STAGE}</Text>
        </View>
        <View style={[styles.statChip, styles.statChipScore]}>
          <Text style={styles.statLabel}>{t('minigames.score')}</Text>
          <Text style={styles.statValueScore}>{displayScore}<Text style={styles.statTarget}>/{stageConfig.targetScore}</Text></Text>
        </View>
      </View>
      <View style={styles.helpRow}>
        <MinigameHelpButton
          accessibilityLabel={t('minigames.howToPlay')}
          label={t('minigames.howToPlay')}
          onPress={() => setShowHelp(true)}
        />
      </View>

      {/* Time bar */}
      <TimeProgressBar timeLeft={timeLeft} totalTime={stageConfig.timeSeconds} />

      {/* Score progress */}
      <View style={styles.scoreBarWrap}>
        <View style={styles.scoreBarTrack}>
          <View style={[styles.scoreBarFill, { width: `${scoreProgress * 100}%` }]} />
        </View>
      </View>

      {/* Board */}
      <View style={styles.boardCard}>
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
              disabled={!gameStarted || finished || busy}
              obstacle={obstacles.get(index)}
              onDragSwap={handleDragSwap}
            />
          ))}
        </View>
        {floatingScores.map((item) => (
          <FloatingScorePop key={item.id} item={item} onDone={removeFloatingScore} />
        ))}
        <ComboBanner combo={combo} label={comboLabel} reserveSpace />
      </View>

      <View style={styles.itemRow}>
        <MatchItemButton
          icon="🔀"
          label={t('minigames.matchShuffle')}
          count={itemCounts.shuffle}
          disabled={!gameStarted || finished || busy || itemCounts.shuffle <= 0}
          onPress={handleShuffleItem}
        />
        <MatchItemButton
          icon="⏱"
          label={t('minigames.matchTimeExtend')}
          count={itemCounts.time}
          disabled={!gameStarted || finished || busy || itemCounts.time <= 0}
          onPress={handleTimeItem}
        />
        <MatchItemButton
          icon="💡"
          label={t('minigames.matchHintItem')}
          count={itemCounts.hint}
          disabled={!gameStarted || finished || busy || itemCounts.hint <= 0}
          onPress={handleHintItem}
        />
      </View>

      <MinigameResultPanel
        gameId="match"
        stage={activeStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={String(score)}
        detail={t('minigames.matchResult', { score })}
        stageResult={{ score }}
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
        onClose={handleHelpClose}
        title={t('minigames.howToPlay')}
        rules={tArray('minigames.rulesMatch')}
        actionLabel={!gameStarted ? t('minigames.startGame') : undefined}
        dismissible={gameStarted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, gap: 8 },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    width: '100%',
  },
  helpRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 2,
  },
  statChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  statChipScore: {
    flex: 2,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  statValueScore: {
    color: theme.colors.primaryDark,
    fontSize: 18,
    fontWeight: '900',
  },
  statTarget: {
    color: theme.colors.textSubtle,
    fontSize: 13,
    fontWeight: '600',
  },
  timerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.colors.teal,
  },
  timerFillMid: {
    backgroundColor: theme.colors.star,
  },
  timerFillLow: {
    backgroundColor: theme.colors.error,
  },
  timerText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'right',
  },
  timerTextLow: {
    color: theme.colors.error,
  },
  scoreBarWrap: {
    paddingHorizontal: 2,
  },
  scoreBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  boardCard: {
    alignSelf: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    shadowColor: '#1A2B3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    // @ts-ignore web
    touchAction: 'none',
    // @ts-ignore web
    overscrollBehavior: 'contain',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  itemButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    gap: 2,
  },
  itemButtonDisabled: {
    opacity: 0.45,
  },
  itemIcon: {
    fontSize: 17,
  },
  itemLabel: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
    maxWidth: '100%',
  },
  itemCount: {
    color: theme.colors.star,
    fontSize: 10,
    fontWeight: '900',
  },
  grid: {
    position: 'relative',
    // @ts-ignore web
    touchAction: 'none',
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    overscrollBehavior: 'contain',
  },
  cellPressable: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    // @ts-ignore web
    touchAction: 'none',
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    cursor: 'grab',
    // @ts-ignore web
    caretColor: 'transparent',
    // @ts-ignore web
    overscrollBehavior: 'contain',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    // @ts-ignore web
    touchAction: 'none',
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    cursor: 'grab',
    // @ts-ignore web
    caretColor: 'transparent',
  },
  cellSpecial: {
    borderColor: theme.colors.star,
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  cellSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2.5,
    backgroundColor: 'rgba(79,107,149,0.1)',
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
  cellObstacle: {
    backgroundColor: 'rgba(120,100,80,0.15)',
    borderColor: 'rgba(120,100,80,0.4)',
  },
  cellObstacleStrong: {
    backgroundColor: 'rgba(120,100,80,0.25)',
    borderColor: 'rgba(120,100,80,0.55)',
    borderWidth: 2.5,
  },
  obstacleEmoji: {
    fontSize: 20,
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    caretColor: 'transparent',
  },
  obstacleHealthBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  obstacleHealthText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  emoji: {
    fontSize: 22,
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    caretColor: 'transparent',
  },
  emojiSpecial: { fontSize: 20 },
  floatingScore: {
    position: 'absolute',
    color: theme.colors.star,
    fontSize: 18,
    fontWeight: '900',
    zIndex: 6,
  },
});
