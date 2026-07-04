import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { MatchPuzzleGame } from '@/components/minigames/MatchPuzzleGame';
import { MemoryCardGame } from '@/components/minigames/MemoryCardGame';
import { SlimeBattleGame } from '@/components/minigames/SlimeBattleGame';
import { TravelQuizGame } from '@/components/minigames/TravelQuizGame';
import { UpDownGame } from '@/components/minigames/UpDownGame';
import { DigitPopGame } from '@/components/minigames/DigitPopGame';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { MINIGAME_SINGLE_PLAY_STAGE } from '@/lib/minigames/stages';
import { theme } from '@/constants/theme';

const GAME_IDS = ['match', 'quiz', 'slime', 'memory', 'guess', 'code'] as const;
type GameId = (typeof GAME_IDS)[number];

function isGameId(value: string | undefined): value is GameId {
  return GAME_IDS.includes(value as GameId);
}

const TITLE_KEYS: Record<GameId, string> = {
  match: 'minigames.match',
  quiz: 'minigames.quiz',
  slime: 'minigames.slime',
  memory: 'minigames.memory',
  guess: 'minigames.guess',
  code: 'minigames.code',
};

function GameContent({ id, startStage }: { id: GameId; startStage: number | undefined }) {
  switch (id) {
    case 'match': return <MatchPuzzleGame initialStage={startStage} />;
    case 'quiz': return <TravelQuizGame initialStage={startStage} />;
    case 'slime': return <SlimeBattleGame initialStage={startStage} />;
    case 'memory': return <MemoryCardGame initialStage={startStage} />;
    case 'guess': return <UpDownGame initialStage={startStage} />;
    case 'code': return <DigitPopGame initialStage={startStage} />;
  }
}

export default function MinigamePlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();

  if (!isGameId(id)) {
    return (
      <AppScreen title={t('minigames.title')} showBack scroll={false}>
        <View style={styles.invalid}>
          <Text style={styles.invalidText}>{t('minigames.notFound')}</Text>
          <PremiumButton title={t('minigames.backToList')} onPress={() => router.back()} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen title={t(TITLE_KEYS[id])} showBack scroll={false} contentStyle={styles.content}>
      <GameContent id={id} startStage={MINIGAME_SINGLE_PLAY_STAGE} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.lg },
  invalid: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
  invalidText: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 15 },
});
