import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { MINIGAME_DAILY_STAR_CAP } from '@tingting/shared';
import { theme } from '@/constants/theme';

interface Props {
  cleared: boolean;
  stage: number;
  maxStage: number;
  scoreLabel: string;
  scoreValue: string;
  detail?: string;
  targetDetail?: string;
  starReward: number;
  starsEarnedToday: number;
  dailyCapReached: boolean;
  loading?: boolean;
  playAgainLabel: string;
  exitLabel: string;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function GameResultOverlay({
  cleared,
  stage,
  maxStage,
  scoreLabel,
  scoreValue,
  detail,
  targetDetail,
  starReward,
  starsEarnedToday,
  dailyCapReached,
  loading,
  playAgainLabel,
  exitLabel,
  onPlayAgain,
  onExit,
}: Props) {
  const { t } = useLocale();
  const title = cleared
    ? t('minigames.stageClear', { stage })
    : t('minigames.stageFail', { stage });

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, cleared ? styles.titleClear : styles.titleFail]}>{title}</Text>
          <Text style={styles.stageMeta}>{t('minigames.stageLabel', { current: stage, max: maxStage })}</Text>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>{scoreLabel}</Text>
            <Text style={styles.scoreValue}>{scoreValue}</Text>
            {detail ? <Text style={styles.detail}>{detail}</Text> : null}
            {targetDetail ? <Text style={styles.targetDetail}>{targetDetail}</Text> : null}
          </View>

          <View style={styles.rewardSection}>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : cleared ? (
              <>
                {starReward > 0 ? (
                  <Text style={styles.starEarned}>{t('minigames.starEarned', { amount: starReward })}</Text>
                ) : dailyCapReached ? (
                  <Text style={styles.capReached}>{t('minigames.dailyCapReached')}</Text>
                ) : null}
                <Text style={styles.dailyStars}>
                  {t('minigames.dailyStars', {
                    earned: starsEarnedToday,
                    cap: MINIGAME_DAILY_STAR_CAP,
                  })}
                </Text>
              </>
            ) : (
              <Text style={styles.retryHint}>{t('minigames.retryStage')}</Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <PremiumButton title={playAgainLabel} onPress={onPlayAgain} fullWidth={false} style={styles.actionButton} />
          <PremiumButton title={exitLabel} onPress={onExit} variant="outline" fullWidth={false} style={styles.actionButton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26,43,61,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scrollContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  titleClear: {
    color: theme.colors.success,
  },
  titleFail: {
    color: theme.colors.text,
  },
  stageMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    gap: 4,
  },
  scoreLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  scoreValue: {
    color: theme.colors.primary,
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 46,
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  targetDetail: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  rewardSection: {
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    justifyContent: 'center',
  },
  loader: {
    marginVertical: theme.spacing.sm,
  },
  starEarned: {
    color: theme.colors.star,
    fontSize: 18,
    fontWeight: '900',
  },
  dailyStars: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  capReached: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryHint: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
