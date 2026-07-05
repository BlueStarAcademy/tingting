import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumButton } from '@/components/PremiumButton';
import { MinigameStarRoll } from '@/components/minigames/MinigameStarRoll';
import { useLocale } from '@/hooks/useLocale';
import { MINIGAME_DAILY_STAR_CAP } from '@tingting/shared';
import { theme } from '@/constants/theme';

interface Props {
  cleared: boolean;
  isFinalStage?: boolean;
  scoreLabel: string;
  scoreValue: string;
  detail?: string;
  targetDetail?: string;
  starReward: number;
  showFinalStarRoll?: boolean;
  starsEarnedToday: number;
  effectiveDailyCap?: number;
  dailyCapReached: boolean;
  loading?: boolean;
  bonusLoading?: boolean;
  canReroll?: boolean;
  canDouble?: boolean;
  alreadyCleared?: boolean;
  canReplayReward?: boolean;
  onRerollReward?: () => void;
  onDoubleReward?: () => void;
  onReplayReward?: () => void;
  rerollAdLabel?: string;
  doubleAdLabel?: string;
  replayRewardAdLabel?: string;
  playAgainLabel: string;
  exitLabel: string;
  onPlayAgain: () => void;
  onContinueWithAd?: () => void;
  continueAdLabel?: string;
  onExit: () => void;
  /** 클리어 시 나가기만 표시 (다시 하기 숨김) */
  nextOrExitOnly?: boolean;
}

export function GameResultOverlay({
  cleared,
  isFinalStage = true,
  scoreLabel,
  scoreValue,
  detail,
  targetDetail,
  starReward,
  showFinalStarRoll = false,
  starsEarnedToday,
  effectiveDailyCap,
  dailyCapReached,
  loading,
  bonusLoading,
  canReroll,
  canDouble,
  alreadyCleared,
  canReplayReward,
  onRerollReward,
  onDoubleReward,
  onReplayReward,
  rerollAdLabel,
  doubleAdLabel,
  replayRewardAdLabel,
  playAgainLabel,
  exitLabel,
  onPlayAgain,
  onContinueWithAd,
  continueAdLabel,
  onExit,
  nextOrExitOnly = false,
}: Props) {
  const { t } = useLocale();
  const isClear = cleared;
  const primaryLabel = nextOrExitOnly && isClear ? exitLabel : playAgainLabel;
  const primaryAction = nextOrExitOnly && isClear ? onExit : onPlayAgain;
  const showExitButton = !nextOrExitOnly || !isClear;
  const cap = effectiveDailyCap ?? MINIGAME_DAILY_STAR_CAP;
  const starsRemaining = Math.max(0, cap - starsEarnedToday);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
      <View style={styles.card}>
        <LinearGradient
          colors={
            isClear
              ? ['rgba(91,163,146,0.14)', 'rgba(250,251,254,0)']
              : ['rgba(79,107,149,0.1)', 'rgba(250,251,254,0)']
          }
          style={styles.cardGlow}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.badge, isClear ? styles.badgeClear : styles.badgeFail]}>
            <Ionicons
              name={isClear ? 'trophy' : 'refresh-circle'}
              size={18}
              color={isClear ? theme.colors.success : theme.colors.primary}
            />
            <Text style={[styles.badgeText, isClear ? styles.badgeTextClear : styles.badgeTextFail]}>
              {isClear ? t('minigames.gameClear') : t('minigames.gameFail')}
            </Text>
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>{scoreLabel}</Text>
            <Text style={styles.scoreValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {scoreValue}
            </Text>
            {detail ? (
              <Text style={styles.detail} numberOfLines={2}>
                {detail}
              </Text>
            ) : null}
            {targetDetail ? (
              <View style={styles.targetPill}>
                <Text style={styles.targetDetail} numberOfLines={1}>
                  {targetDetail}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.rewardSection}>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : isClear ? (
              <>
                {isFinalStage && showFinalStarRoll && starReward > 0 ? (
                  <MinigameStarRoll amount={starReward} />
                ) : isFinalStage && dailyCapReached && alreadyCleared ? (
                  <Text style={styles.capReached}>{t('minigames.dailyCapReached')}</Text>
                ) : isFinalStage && alreadyCleared && starReward === 0 && !loading ? (
                  <>
                    <Text style={styles.stageClearHint}>{t('minigames.gameAlreadyCleared')}</Text>
                    {canReplayReward && onReplayReward ? (
                      <View style={styles.bonusActions}>
                        <PremiumButton
                          title={replayRewardAdLabel ?? t('minigames.watchAdReplayReward')}
                          onPress={onReplayReward}
                          loading={bonusLoading}
                          disabled={bonusLoading}
                          fullWidth
                          size="sm"
                          variant="outline"
                        />
                      </View>
                    ) : null}
                  </>
                ) : isFinalStage && dailyCapReached ? (
                  <Text style={styles.capReached}>{t('minigames.dailyCapReached')}</Text>
                ) : isFinalStage && starReward === 0 && !loading ? (
                  <Text style={styles.stageClearHint}>{t('minigames.gameAlreadyCleared')}</Text>
                ) : null}

                {isFinalStage ? (
                  <View style={styles.starsPanel}>
                    <Text style={styles.starsTitle}>{t('minigames.dailyStarsTitle')}</Text>
                    <View style={styles.starsRow}>
                      <View style={styles.starStat}>
                        <Text style={styles.starStatLabel}>{t('minigames.dailyStarsEarnedLabel')}</Text>
                        <Text style={styles.starStatValue}>
                          {starsEarnedToday}
                          <Text style={styles.starStatCap}> / {cap}</Text>
                        </Text>
                      </View>
                      <View style={styles.starDivider} />
                      <View style={styles.starStat}>
                        <Text style={styles.starStatLabel}>{t('minigames.dailyStarsRemainingLabel')}</Text>
                        <Text style={[styles.starStatValue, styles.starStatValueAccent]}>
                          {starsRemaining}
                          <Text style={styles.starStatCap}> / {cap}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {isFinalStage && starReward > 0 && (canReroll || canDouble) ? (
                  <View style={styles.bonusActions}>
                    {canReroll && onRerollReward ? (
                      <PremiumButton
                        title={rerollAdLabel ?? t('minigames.watchAdReroll')}
                        onPress={onRerollReward}
                        loading={bonusLoading}
                        disabled={bonusLoading}
                        fullWidth
                        size="sm"
                        variant="outline"
                      />
                    ) : null}
                    {canDouble && onDoubleReward ? (
                      <PremiumButton
                        title={doubleAdLabel ?? t('minigames.watchAdDouble')}
                        onPress={onDoubleReward}
                        loading={bonusLoading}
                        disabled={bonusLoading}
                        fullWidth
                        size="sm"
                        variant="outline"
                      />
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.retryHint}>{t('minigames.retryGame')}</Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          {!cleared && onContinueWithAd ? (
            <PremiumButton
              title={continueAdLabel ?? '광고 보고 이어하기'}
              onPress={onContinueWithAd}
              fullWidth
              size="sm"
              style={styles.actionPrimary}
            />
          ) : null}
          <PremiumButton
            title={!cleared && onContinueWithAd ? playAgainLabel : primaryLabel}
            onPress={!cleared && onContinueWithAd ? onPlayAgain : primaryAction}
            fullWidth
            size="sm"
            variant={!cleared && onContinueWithAd ? 'outline' : undefined}
            style={!cleared && onContinueWithAd ? styles.actionSecondary : styles.actionPrimary}
          />
          {showExitButton ? (
            <PremiumButton
              title={exitLabel}
              onPress={onExit}
              variant="outline"
              fullWidth
              size="sm"
              style={styles.actionSecondary}
            />
          ) : null}
        </View>
      </View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26,43,61,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    overflow: 'hidden',
    shadowColor: '#1A2B3D',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  scrollContent: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  badgeClear: {
    backgroundColor: theme.colors.successSoft,
    borderColor: 'rgba(91,163,146,0.35)',
  },
  badgeFail: {
    backgroundColor: theme.colors.tint.soft,
    borderColor: theme.colors.tint.border,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  badgeTextClear: {
    color: theme.colors.success,
  },
  badgeTextFail: {
    color: theme.colors.primaryDark,
  },
  scoreBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.tint.soft,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  scoreLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  scoreValue: {
    color: theme.colors.primary,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    letterSpacing: -0.8,
    maxWidth: '100%',
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.xs,
  },
  targetPill: {
    marginTop: 4,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: '100%',
  },
  targetDetail: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  rewardSection: {
    alignItems: 'stretch',
    gap: theme.spacing.sm,
    minHeight: 40,
  },
  loader: {
    marginVertical: theme.spacing.sm,
    alignSelf: 'center',
  },
  starBurst: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.starGlow,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  starEarned: {
    color: theme.colors.star,
    fontSize: 17,
    fontWeight: '900',
  },
  starsPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  starsTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  starStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  starStatValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  starStatValueAccent: {
    color: theme.colors.star,
  },
  starStatCap: {
    color: theme.colors.textSubtle,
    fontSize: 13,
    fontWeight: '700',
  },
  starDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },
  stageClearHint: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.sm,
  },
  capReached: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: theme.spacing.sm,
  },
  retryHint: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.sm,
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionPrimary: {
    width: '100%',
  },
  bonusActions: {
    width: '100%',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  actionSecondary: {
    width: '100%',
  },
});
