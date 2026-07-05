import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { HowToPlayModal } from '@/components/minigames/HowToPlayModal';
import { MinigameHelpButton } from '@/components/minigames/MinigameHelpButton';
import { TimeProgressBar } from '@/components/minigames/TimeProgressBar';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { getMemoryStageConfig, MEMORY_PAIR_EMOJIS } from '@/lib/minigames/stages';
import { theme } from '@/constants/theme';

interface Card {
  id: number;
  pairId: number;
  emoji: string;
}

function buildDeck(pairCount: number): Card[] {
  const emojis = MEMORY_PAIR_EMOJIS.slice(0, pairCount);
  const cards: Card[] = [];
  emojis.forEach((emoji, pairId) => {
    cards.push({ id: pairId * 2, pairId, emoji });
    cards.push({ id: pairId * 2 + 1, pairId, emoji });
  });
  return cards.sort(() => Math.random() - 0.5);
}

export function MemoryCardGame({ initialStage }: { initialStage?: number } = {}) {
  const { t, tArray } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('memory');
  const [activeStage, setActiveStage] = useState(initialStage ?? 1);
  const initialStageSynced = useRef(false);
  const [showHelp, setShowHelp] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  const stageConfig = useMemo(() => getMemoryStageConfig(activeStage), [activeStage]);

  const [deck, setDeck] = useState<Card[]>(() => buildDeck(stageConfig.pairCount));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [finalMoves, setFinalMoves] = useState(0);
  const [finalAllMatched, setFinalAllMatched] = useState(false);
  const [timeLeft, setTimeLeft] = useState(stageConfig.timeSeconds);
  const [lock, setLock] = useState(false);
  const [finished, setFinished] = useState(false);
  const matchedRef = useRef(matched);
  matchedRef.current = matched;

  const matchedCount = matched.size;
  const totalPairs = stageConfig.pairCount;
  const gridCols = stageConfig.columns;
  const turnsRemaining = Math.max(0, stageConfig.maxMoves - moves);

  useEffect(() => {
    if (loading || initialStageSynced.current) return;
    if (!initialStage) setActiveStage(currentStage);
    initialStageSynced.current = true;
  }, [currentStage, initialStage, loading]);

  const restart = useCallback(
    (stage = activeStage) => {
      const config = getMemoryStageConfig(stage);
      setDeck(buildDeck(config.pairCount));
      setFlipped([]);
      setMatched(new Set());
      setMoves(0);
      setFinalMoves(0);
      setFinalAllMatched(false);
      setTimeLeft(config.timeSeconds);
      setLock(false);
      setFinished(false);
    },
    [activeStage],
  );

  useEffect(() => {
    if (loading || !initialStageSynced.current) return;
    restart(activeStage);
  }, [activeStage, loading, restart]);

  useEffect(() => {
    if (loading || finished || !gameStarted) return;
    if (timeLeft <= 0) {
      setFinalMoves(moves);
      setFinalAllMatched(matchedRef.current.size >= totalPairs);
      setFinished(true);
      setLock(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [finished, gameStarted, loading, moves, timeLeft, totalPairs]);

  const finishGame = useCallback(
    (turnCount: number, won: boolean, preserveBoard = false) => {
      setFinalMoves(turnCount);
      setFinalAllMatched(won);
      setFinished(true);
      setLock(false);
      if (!preserveBoard) {
        setFlipped([]);
      }
    },
    [],
  );

  const continueAfterAd = useCallback(() => {
    setMoves(0);
    setFinalMoves(0);
    setFinalAllMatched(false);
    setFinished(false);
    setLock(false);
  }, []);

  const handleFlip = (card: Card) => {
    if (!gameStarted || lock || finished) return;
    if (flipped.includes(card.id) || matched.has(card.pairId)) return;

    const nextFlipped = [...flipped, card.id];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setLock(true);

    const [firstId, secondId] = nextFlipped;
    const first = deck.find((item) => item.id === firstId);
    const second = deck.find((item) => item.id === secondId);

    if (first && second && first.pairId === second.pairId) {
      const nextMatched = new Set(matched);
      nextMatched.add(first.pairId);
      setMatched(nextMatched);
      setFlipped([]);
      setLock(false);
      const clearedBoard = nextMatched.size >= totalPairs;
      if (clearedBoard) {
        finishGame(nextMoves, true, true);
      } else if (nextMoves >= stageConfig.maxMoves) {
        finishGame(nextMoves, false, true);
      }
      return;
    }

    if (nextMoves >= stageConfig.maxMoves) {
      finishGame(nextMoves, false, true);
      return;
    }

    setTimeout(() => {
      setFlipped([]);
      setLock(false);
    }, 700);
  };

  const rows = useMemo(() => Math.ceil(deck.length / gridCols), [deck.length, gridCols]);
  const cardSize = gridCols >= 5 ? 64 : 72;
  const resultMoves = finished ? finalMoves : moves;
  const resultAllMatched = finished ? finalAllMatched : matchedCount >= totalPairs;
  const handleHelpClose = () => {
    if (!gameStarted) setGameStarted(true);
    setShowHelp(false);
  };

  if (loading) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <GameStatsBar
          stats={[
            { label: t('minigames.memoryTurns'), value: `${moves}/${stageConfig.maxMoves}` },
            { label: t('minigames.memoryPairs'), value: `${matchedCount}/${totalPairs}` },
            { label: t('minigames.memoryTurnsLeft'), value: turnsRemaining },
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
      <TimeProgressBar timeLeft={timeLeft} totalTime={stageConfig.timeSeconds} />
      <View style={[styles.grid, { minHeight: rows * (cardSize + 8) }]}>
        {deck.map((card) => {
          const isOpen = flipped.includes(card.id) || matched.has(card.pairId);
          return (
            <Pressable
              key={card.id}
              onPress={() => handleFlip(card)}
              disabled={!gameStarted || lock || finished || isOpen}
              accessible={false}
              {...({ focusable: false, tabIndex: -1 } as any)}
              style={[
                styles.card,
                { width: cardSize, height: cardSize },
                isOpen && styles.cardOpen,
                matched.has(card.pairId) && styles.cardMatched,
              ]}
            >
              <Text style={[styles.cardText, !isOpen && styles.cardTextHidden]}>
                {isOpen ? card.emoji : '?'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <MinigameResultPanel
        gameId="memory"
        stage={activeStage}
        finished={finished}
        scoreLabel={t('minigames.memoryTurns')}
        scoreValue={`${resultMoves}/${stageConfig.maxMoves}`}
        detail={
          resultAllMatched
            ? t('minigames.memoryResult', { moves: resultMoves })
            : t('minigames.memoryFail', { moves: resultMoves, max: stageConfig.maxMoves })
        }
        stageResult={{ moves: resultMoves, allMatched: resultAllMatched }}
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
        rules={tArray('minigames.rulesMemory')}
        actionLabel={!gameStarted ? t('minigames.startGame') : undefined}
        dismissible={gameStarted}
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
    marginBottom: theme.spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    cursor: 'default',
  },
  card: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
    // @ts-ignore web
    userSelect: 'none',
    // @ts-ignore web
    cursor: 'pointer',
    // @ts-ignore web
    outlineStyle: 'none',
  },
  cardOpen: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
  },
  cardMatched: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
  },
  cardText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  cardTextHidden: {
    color: '#fff',
  },
});
