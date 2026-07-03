import { View, Text, StyleSheet } from 'react-native';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { StarAmount } from '@/components/StarAmount';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  cost: number;
  loading?: boolean;
  titleKey?: 'group.starUse' | 'group.memberSlotUnlockTitle';
  messageKey?: 'group.starUseMessage' | 'group.memberSlotUnlockMessage';
  onClose: () => void;
  onConfirm: () => void;
}

export function GroupSlotPurchaseModal({
  visible,
  cost,
  loading,
  titleKey = 'group.starUse',
  messageKey = 'group.starUseMessage',
  onClose,
  onConfirm,
}: Props) {
  const { t } = useLocale();

  return (
    <AppModal visible={visible} animationType="fade" onRequestClose={onClose} variant="center">
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{t(titleKey)}</Text>
          <PremiumIconButton
            icon="close"
            onPress={onClose}
            variant="soft"
            color={theme.colors.textMuted}
            accessibilityLabel={t('header.cancel')}
            disabled={loading}
          />
        </View>

        <Text style={styles.message}>{t(messageKey, { cost })}</Text>

        <View style={styles.costBox}>
          <Text style={styles.costLabel}>{t('group.starCostLabel')}</Text>
          <StarAmount amount={cost} iconSize={24} textStyle={styles.costValue} />
        </View>

        <View style={styles.actions}>
          <PremiumButton
            title={t('header.cancel')}
            onPress={onClose}
            variant="outline"
            disabled={loading}
            style={styles.actionBtn}
          />
          <PremiumButton
            title={t('profile.unlock')}
            onPress={onConfirm}
            loading={loading}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  costBox: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  costLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  costValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});
