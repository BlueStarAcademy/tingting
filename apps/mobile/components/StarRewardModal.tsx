import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { StarAmount, StarIcon } from '@/components/StarAmount';
import { useLocale } from '@/hooks/useLocale';
import { shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  amount: number;
  totalStars?: number;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  adBonusAmount?: number;
  adBonusLabel?: string;
  onAdBonus?: () => Promise<void>;
  adBonusUsed?: boolean;
}

export function StarRewardModal({
  visible,
  amount,
  totalStars,
  title,
  subtitle,
  onClose,
  adBonusAmount,
  adBonusLabel,
  onAdBonus,
  adBonusUsed = false,
}: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const heading = title ?? t('reward.title');
  const message = subtitle ?? t('reward.message', { amount });
  const showAdBonus = !!onAdBonus && !!adBonusAmount && !adBonusUsed;

  const handleAdBonus = async () => {
    if (!onAdBonus) return;
    setLoading(true);
    try {
      await onAdBonus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal visible={visible} animationType="fade" onRequestClose={onClose} variant="center">
      <View style={[styles.card, shadow('lg')]}>
        <LinearGradient
          colors={['#FFFBEB', '#FFFFFF', '#FFF7ED']}
          locations={[0, 0.45, 1]}
          style={styles.gradient}
        >
          <View style={styles.sparkleRow}>
            <Ionicons name="sparkles" size={16} color={theme.colors.star} />
            <View style={styles.sparkleLine} />
            <Ionicons name="sparkles" size={16} color={theme.colors.star} />
          </View>

          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['#FDE68A', '#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <StarIcon size={42} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.iconRing} />
          </View>

          <Text style={styles.title}>{heading}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.amountBox}>
            <LinearGradient
              colors={['rgba(240,180,41,0.18)', 'rgba(240,180,41,0.06)']}
              style={styles.amountGradient}
            >
              <Text style={styles.amountLabel}>{t('reward.amountLabel')}</Text>
              <StarAmount amount={amount} iconSize={34} textStyle={styles.amountValue} />
            </LinearGradient>
          </View>

          {totalStars !== undefined ? (
            <Text style={styles.total}>{t('reward.starTotal', { total: totalStars.toLocaleString() })}</Text>
          ) : null}

          {showAdBonus ? (
            <PremiumButton
              title={adBonusLabel ?? t('ads.watchForBonus', { amount: adBonusAmount })}
              onPress={handleAdBonus}
              loading={loading}
              fullWidth
            />
          ) : null}
          <PremiumButton
            title={showAdBonus ? t('common.continue') : t('common.continue')}
            onPress={onClose}
            variant={showAdBonus ? 'outline' : undefined}
            fullWidth
          />
        </LinearGradient>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  gradient: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: theme.spacing.xs,
  },
  sparkleLine: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(240,180,41,0.35)',
  },
  iconWrap: {
    marginVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: 'rgba(240,180,41,0.28)',
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  amountBox: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.25)',
  },
  amountGradient: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  total: {
    color: theme.colors.textSubtle,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
});
