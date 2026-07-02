import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { MatchPuzzleGame } from '@/components/minigames/MatchPuzzleGame';
import { MemoryCardGame } from '@/components/minigames/MemoryCardGame';
import { TapChallengeGame } from '@/components/minigames/TapChallengeGame';
import { TravelQuizGame } from '@/components/minigames/TravelQuizGame';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const GAME_IDS = ['match', 'quiz', 'tap', 'memory'] as const;
type GameId = (typeof GAME_IDS)[number];

function isGameId(value: string | undefined): value is GameId {
  return GAME_IDS.includes(value as GameId);
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

  const titleKey =
    id === 'match'
      ? 'minigames.match'
      : id === 'quiz'
        ? 'minigames.quiz'
        : id === 'tap'
          ? 'minigames.tap'
          : 'minigames.memory';

  return (
    <AppScreen title={t(titleKey)} showBack scroll={false} contentStyle={styles.content}>
      {id === 'match' ? <MatchPuzzleGame /> : null}
      {id === 'quiz' ? <TravelQuizGame /> : null}
      {id === 'tap' ? <TapChallengeGame /> : null}
      {id === 'memory' ? <MemoryCardGame /> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: theme.spacing.lg },
  invalid: { flex: 1, justifyContent: 'center', gap: theme.spacing.md },
  invalidText: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 15 },
});
