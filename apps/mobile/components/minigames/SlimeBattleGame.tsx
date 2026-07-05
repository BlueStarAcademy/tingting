import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { HowToPlayModal } from '@/components/minigames/HowToPlayModal';
import { MinigameHelpButton } from '@/components/minigames/MinigameHelpButton';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import {
  SLIME_AI,
  SLIME_AI_WIN_TARGET,
  SLIME_BOARD_SIZE,
  SLIME_EMPTY,
  SLIME_PLAYER,
  createSlimeBoard,
  delay,
  pickAiMove,
  tryPlaceStone,
  type SlimeStone,
} from '@/lib/minigames/slime-battle-logic';
import { getSlimeStageConfig } from '@/lib/minigames/stages';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import { theme } from '@/constants/theme';

const CELL = 44;
const SLOT_GAP = 5;
const SLOT_STEP = CELL + SLOT_GAP;
const ARENA_PAD = 18;
const GRID_INNER = SLIME_BOARD_SIZE * SLOT_STEP - SLOT_GAP;
const ARENA_SIZE = GRID_INNER + ARENA_PAD * 2;

function slotPosition(x: number, y: number): { left: number; top: number } {
  return {
    left: ARENA_PAD + x * SLOT_STEP,
    top: ARENA_PAD + y * SLOT_STEP,
  };
}

function ArenaBubble({ style }: { style: object }) {
  return <View style={[styles.arenaBubble, style]} />;
}

function SlimeSlot({
  isLast,
  isEmpty,
  onPress,
  disabled,
  children,
}: {
  isLast: boolean;
  isEmpty: boolean;
  onPress: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessible={false}
      focusable={false}
      // @ts-ignore — suppress web tabIndex
      tabIndex={-1}
      style={[styles.slot, isLast && styles.slotLast]}
    >
      {isEmpty ? (
        <LinearGradient
          colors={['rgba(167,243,208,0.35)', 'rgba(16,185,129,0.18)']}
          style={styles.slotEmpty}
        />
      ) : null}
      {children}
    </Pressable>
  );
}

function SlimeStoneView({ color, pulse }: { color: SlimeStone; pulse?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    scale.setValue(0.4);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [pulse, scale]);

  if (color === SLIME_EMPTY) return null;

  const isPlayer = color === SLIME_PLAYER;
  const colors = isPlayer
    ? (['#86EFAC', '#22C55E', '#15803D'] as const)
    : (['#F0ABFC', '#C026D3', '#7E22CE'] as const);

  return (
    <Animated.View style={[styles.slimeWrap, { transform: [{ scale }] }]}>
      <LinearGradient colors={colors} style={styles.slimeBody} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
        <View style={styles.eyesRow}>
          <View style={[styles.eye, isPlayer ? styles.eyePlayer : styles.eyeAi]}>
            <View style={styles.pupil} />
          </View>
          <View style={[styles.eye, isPlayer ? styles.eyePlayer : styles.eyeAi]}>
            <View style={styles.pupil} />
          </View>
        </View>
        <View style={styles.mouth} />
        <View style={styles.shine} />
      </LinearGradient>
    </Animated.View>
  );
}

export function SlimeBattleGame({ initialStage }: { initialStage?: number } = {}) {
  const { t, tArray } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('slime');
  const [activeStage, setActiveStage] = useState(initialStage ?? 1);
  const [showHelp, setShowHelp] = useState(false);
  const initialStageSynced = useRef(false);
  const bootedStageRef = useRef<number | null>(null);
  const hasLoadedOnce = useRef(false);

  const stageConfig = useMemo(() => getSlimeStageConfig(activeStage), [activeStage]);

  const [board, setBoard] = useState<SlimeStone[]>(() => createSlimeBoard());
  const [playerCaptures, setPlayerCaptures] = useState(0);
  const [aiCaptures, setAiCaptures] = useState(0);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const [koPoint, setKoPoint] = useState<number | null>(null);
  const [koWarning, setKoWarning] = useState(false);

  const busyRef = useRef(false);

  useEffect(() => {
    if (!loading) hasLoadedOnce.current = true;
  }, [loading]);

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    if (!initialStage) setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, initialStage, loading]);

  const restart = useCallback((stage = activeStage) => {
    void getSlimeStageConfig(stage);
    setBoard(createSlimeBoard());
    setPlayerCaptures(0);
    setAiCaptures(0);
    setTurn('player');
    setBusy(false);
    busyRef.current = false;
    setFinished(false);
    setWon(false);
    setLastMove(null);
    setPulseIndex(null);
    setKoPoint(null);
  }, [activeStage]);

  useEffect(() => {
    if (loading || !initialStageSynced.current) return;
    if (bootedStageRef.current === activeStage) return;
    bootedStageRef.current = activeStage;
    restart(activeStage);
  }, [activeStage, loading, restart]);

  const finishCheck = useCallback(
    (nextPlayer: number, nextAi: number) => {
      if (nextPlayer >= stageConfig.playerTarget) {
        setWon(true);
        setFinished(true);
        return true;
      }
      if (nextAi >= SLIME_AI_WIN_TARGET) {
        setWon(false);
        setFinished(true);
        return true;
      }
      return false;
    },
    [stageConfig.playerTarget],
  );

  const runAiTurn = useCallback(
    async (currentBoard: SlimeStone[], currentPlayerCaptures: number, currentAiCaptures: number, currentKo: number | null) => {
      await delay(480);
      const move = pickAiMove(currentBoard, activeStage, currentKo);
      if (move === null) {
        setTurn('player');
        setBusy(false);
        return;
      }

      const result = tryPlaceStone(currentBoard, move, SLIME_AI, currentKo);
      if (!result.valid) {
        setTurn('player');
        setBusy(false);
        return;
      }

      setBoard(result.board);
      setLastMove(move);
      setPulseIndex(move);
      setTimeout(() => setPulseIndex(null), 320);

      const nextKo = result.capturedAt;
      setKoPoint(nextKo);

      const nextAi = currentAiCaptures + result.captured;
      setAiCaptures(nextAi);

      if (nextAi >= SLIME_AI_WIN_TARGET) {
        setWon(false);
        setFinished(true);
        setBusy(false);
        return;
      }
      if (currentPlayerCaptures >= stageConfig.playerTarget) {
        setWon(true);
        setFinished(true);
        setBusy(false);
        return;
      }

      setTurn('player');
      setBusy(false);
    },
    [activeStage, stageConfig.playerTarget],
  );

  const handleCellPress = useCallback(
    async (index: number) => {
      if (finished || busy || turn !== 'player') return;

      if (index === koPoint && board[index] === SLIME_EMPTY) {
        setKoWarning(true);
        setTimeout(() => setKoWarning(false), 3000);
        return;
      }

      const result = tryPlaceStone(board, index, SLIME_PLAYER, koPoint);
      if (!result.valid) return;

      setBusy(true);
      busyRef.current = true;
      setBoard(result.board);
      setLastMove(index);
      setPulseIndex(index);
      setTimeout(() => setPulseIndex(null), 320);

      const nextKo = result.capturedAt;
      setKoPoint(nextKo);

      const nextPlayer = playerCaptures + result.captured;
      setPlayerCaptures(nextPlayer);

      if (finishCheck(nextPlayer, aiCaptures)) {
        busyRef.current = false;
        setBusy(false);
        return;
      }

      setTurn('ai');
      await runAiTurn(result.board, nextPlayer, aiCaptures, nextKo);
    },
    [aiCaptures, board, busy, finishCheck, finished, koPoint, playerCaptures, runAiTurn, turn],
  );

  const handleRestart = useCallback((stage?: number) => {
    const targetStage = stage ?? 1;
    restart(targetStage);
    bootedStageRef.current = targetStage;
    if (targetStage !== activeStage) setActiveStage(targetStage);
  }, [activeStage, restart]);

  if (loading && !hasLoadedOnce.current) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <GameStatsBar
          stats={[
            { label: t('minigames.score'), value: playerCaptures },
            { label: t('minigames.targetScoreShort'), value: stageConfig.playerTarget },
            { label: t('minigames.slimeAiScore'), value: `${aiCaptures}/${SLIME_AI_WIN_TARGET}` },
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
      <Text style={styles.turnLabel}>
        {finished
          ? won
            ? t('minigames.slimeWin')
            : t('minigames.slimeLose')
          : turn === 'player'
            ? t('minigames.slimeTurn')
            : t('minigames.slimeAiTurn')}
      </Text>

      <View style={styles.boardFrame}>
        <LinearGradient colors={['#4C1D95', '#6D28D9', '#312E81']} style={styles.arenaShell}>
          <LinearGradient colors={['#065F46', '#047857', '#059669']} style={styles.arenaFloor}>
            <View style={[styles.arenaGrid, { width: ARENA_SIZE, height: ARENA_SIZE }]}>
              <ArenaBubble style={{ width: 28, height: 28, top: 8, left: 12, opacity: 0.35 }} />
              <ArenaBubble style={{ width: 18, height: 18, top: 24, right: 20, opacity: 0.28 }} />
              <ArenaBubble style={{ width: 22, height: 22, bottom: 16, left: 24, opacity: 0.3 }} />
              <ArenaBubble style={{ width: 14, height: 14, bottom: 28, right: 16, opacity: 0.22 }} />

              {board.map((stone, index) => {
                const x = index % SLIME_BOARD_SIZE;
                const y = Math.floor(index / SLIME_BOARD_SIZE);
                const { left, top } = slotPosition(x, y);
                const isLast = lastMove === index;
                const isEmpty = stone === SLIME_EMPTY;

                return (
                  <View key={index} style={[styles.slotWrap, { left, top }]}>
                    <SlimeSlot
                      isLast={isLast}
                      isEmpty={isEmpty}
                      onPress={() => handleCellPress(index)}
                      disabled={finished || busy || turn !== 'player' || !isEmpty}
                    >
                      <SlimeStoneView color={stone} pulse={pulseIndex === index} />
                    </SlimeSlot>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </LinearGradient>
      </View>

      <View style={styles.belowBoard}>
        {koWarning ? (
          <View style={styles.koWarning}>
            <Text style={styles.koWarningText}>방금 잡은곳은 바로 다시 잡을 수 없습니다.</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.legendText}>{t('minigames.slimeYou')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#C026D3' }]} />
          <Text style={styles.legendText}>{t('minigames.slimeEnemy')}</Text>
        </View>
      </View>

      <MinigameResultPanel
        gameId="slime"
        stage={activeStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={won ? t('minigames.slimeWin') : t('minigames.slimeLose')}
        detail={t('minigames.slimeResult', {
          player: playerCaptures,
          target: stageConfig.playerTarget,
          ai: aiCaptures,
        })}
        stageResult={{ won, playerCaptures }}
        onRestart={handleRestart}
        onProgressUpdated={refresh}
      />
      <HowToPlayModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('minigames.howToPlay')}
        rules={tArray('minigames.rulesSlime')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0, position: 'relative' },
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
  turnLabel: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  koWarning: {
    backgroundColor: 'rgba(217,112,112,0.12)',
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(217,112,112,0.3)',
  },
  koWarningText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  belowBoard: {
    minHeight: 36,
    marginTop: theme.spacing.sm,
    alignItems: 'center',
  },
  boardFrame: {
    alignSelf: 'center',
    borderRadius: theme.radius.xl,
    borderWidth: 3,
    borderColor: 'rgba(196,181,253,0.55)',
    shadowColor: '#312E81',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  arenaShell: {
    borderRadius: theme.radius.xl - 2,
    padding: 6,
  },
  arenaFloor: {
    borderRadius: theme.radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  arenaGrid: {
    position: 'relative',
    // @ts-ignore — suppress text cursor on web
    userSelect: 'none',
    cursor: 'default',
  },
  arenaBubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  slotWrap: {
    position: 'absolute',
    width: CELL,
    height: CELL,
  },
  slot: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL / 2,
    // @ts-ignore — suppress text cursor on web
    userSelect: 'none',
    cursor: 'pointer',
    outlineStyle: 'none',
  },
  slotEmpty: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CELL / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  slotLast: {
    backgroundColor: 'rgba(251,191,36,0.28)',
    borderWidth: 2,
    borderColor: 'rgba(251,191,36,0.65)',
  },
  slimeWrap: {
    width: CELL - 8,
    height: CELL - 8,
  },
  slimeBody: {
    flex: 1,
    borderRadius: (CELL - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -2,
  },
  eye: {
    width: 10,
    height: 12,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 1,
  },
  eyePlayer: { backgroundColor: '#FFF' },
  eyeAi: { backgroundColor: '#FDF4FF' },
  pupil: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#1A2B3D',
  },
  mouth: {
    width: 10,
    height: 4,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: 'rgba(26,43,61,0.35)',
    marginTop: 2,
  },
  shine: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 8,
    height: 5,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
