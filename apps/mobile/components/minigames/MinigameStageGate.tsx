import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { useMinigameProgress } from '@/hooks/useMinigameProgress';
import { MINIGAME_MAX_STAGE } from '@tingting/shared';
import type { MinigameId } from '@/lib/minigames/stages';
import { theme } from '@/constants/theme';

interface Props {
  gameId: MinigameId;
  children: (startStage: number | undefined) => React.ReactNode;
}

export function MinigameStageGate({ gameId, children }: Props) {
  const { t } = useLocale();
  const { clearedStage, loading } = useMinigameProgress(gameId);
  const [chosenStage, setChosenStage] = useState<number | null>(null);

  if (loading) return null;

  const allCleared = clearedStage >= MINIGAME_MAX_STAGE;

  if (!allCleared || chosenStage !== null) {
    return <>{children(chosenStage ?? undefined)}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('minigames.allClearedTitle')}</Text>
        <Text style={styles.desc}>{t('minigames.allClearedDesc')}</Text>
        <View style={styles.buttons}>
          <PremiumButton
            title={t('minigames.restartFromOne')}
            onPress={() => setChosenStage(1)}
            fullWidth
          />
          <PremiumButton
            title={t('minigames.replayFinal', { stage: MINIGAME_MAX_STAGE })}
            onPress={() => setChosenStage(MINIGAME_MAX_STAGE)}
            variant="outline"
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  desc: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    gap: theme.spacing.sm,
  },
});
