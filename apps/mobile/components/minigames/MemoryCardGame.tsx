import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MinigameResultPanel } from '@/components/minigames/MinigameResultPanel';
import { GameStatsBar } from '@/components/minigames/GameStatsBar';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { formatStageTarget, getMemoryStageConfig, MEMORY_PAIR_EMOJIS } from '@/lib/minigames/stages';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
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

export function MemoryCardGame() {
  const { t } = useLocale();
  const { currentStage, loading, refresh } = useMinigameProgress('memory');
  const stageConfig = useMemo(() => getMemoryStageConfig(currentStage), [currentStage]);
  const targetLabel = useMemo(() => {
    const target = formatStageTarget('memory', currentStage);
    return t(target.key, target.params);
  }, [currentStage, t]);

  const [deck, setDeck] = useState<Card[]>(() => buildDeck(stageConfig.pairCount));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [finished, setFinished] = useState(false);

  const matchedCount = matched.size;
  const totalPairs = stageConfig.pairCount;
  const gridCols = stageConfig.columns;

  const restart = useCallback(() => {
    const config = getMemoryStageConfig(currentStage);
    setDeck(buildDeck(config.pairCount));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLock(false);
    setFinished(false);
  }, [currentStage]);

  useEffect(() => {
    if (loading) return;
    restart();
  }, [currentStage, loading, restart]);

  const handleFlip = (card: Card) => {
    if (lock || finished) return;
    if (flipped.includes(card.id) || matched.has(card.pairId)) return;

    const nextFlipped = [...flipped, card.id];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) return;

    setMoves((value) => value + 1);
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
      if (nextMatched.size >= totalPairs) {
        setFinished(true);
      }
      return;
    }

    setTimeout(() => {
      setFlipped([]);
      setLock(false);
    }, 700);
  };

  const rows = useMemo(() => Math.ceil(deck.length / gridCols), [deck.length, gridCols]);
  const cardSize = gridCols >= 5 ? 64 : 72;

  if (loading) return null;

  return (
    <View style={styles.wrap}>
      <GameStatsBar
        stats={[
          { label: t('minigames.stage'), value: `${currentStage}/${MINIGAME_MAX_STAGE}` },
          { label: t('minigames.moves'), value: moves },
          { label: t('minigames.pairs'), value: `${matchedCount}/${totalPairs}` },
        ]}
      />
      <Text style={styles.target}>{targetLabel}</Text>
      <Text style={styles.hint}>{t('minigames.memoryHint')}</Text>
      <View style={[styles.grid, { minHeight: rows * (cardSize + 8) }]}>
        {deck.map((card) => {
          const isOpen = flipped.includes(card.id) || matched.has(card.pairId);
          return (
            <Pressable
              key={card.id}
              onPress={() => handleFlip(card)}
              disabled={lock || isOpen}
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
        stage={currentStage}
        finished={finished}
        scoreLabel={t('minigames.finalScore')}
        scoreValue={String(moves)}
        detail={t('minigames.memoryResult', { moves })}
        stageResult={{ moves, allMatched: matchedCount >= totalPairs }}
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
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  card: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
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
