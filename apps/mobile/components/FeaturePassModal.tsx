import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { EditorFeature, FeaturePassTier } from '@tingting/shared';
import { FEATURE_PASS_COSTS, FEATURE_PASS_TIERS } from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { StarAmount } from '@/components/StarAmount';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  feature: EditorFeature | null;
  onClose: () => void;
  onPurchase: (tier: FeaturePassTier) => void;
  onWatchAd?: () => void;
  adUnlockLoading?: boolean;
  loading?: boolean;
}

const TIER_LABEL_KEYS: Record<(typeof FEATURE_PASS_TIERS)[number], string> = {
  day1: 'photos.passDay1',
  day7: 'photos.passDay7',
  day30: 'photos.passDay30',
};

export function FeaturePassModal({
  visible,
  feature,
  onClose,
  onPurchase,
  onWatchAd,
  adUnlockLoading,
  loading,
}: Props) {
  const { t, locale } = useLocale();
  if (!feature) return null;

  const name = feature.name[locale === 'ko' ? 'ko' : 'en'];
  const desc = feature.description?.[locale === 'ko' ? 'ko' : 'en'];

  return (
    <AppModal visible={visible} animationType="fade" onRequestClose={onClose} variant="center">
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('photos.passTitle')}</Text>
          <PremiumIconButton
            icon="close"
            onPress={onClose}
            variant="soft"
            color={theme.colors.textMuted}
            accessibilityLabel={t('header.cancel')}
          />
        </View>
        <Text style={styles.featureName}>{name}</Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}
        <Text style={styles.hint}>{t('photos.passHint')}</Text>

        {onWatchAd ? (
          <>
            <PremiumButton
              title={t('photos.passWatchAd1h')}
              onPress={onWatchAd}
              loading={adUnlockLoading}
              disabled={loading || adUnlockLoading}
              fullWidth
              size="sm"
            />
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('photos.passOrBuy')}</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        ) : null}

        <View style={styles.tierList}>
          {FEATURE_PASS_TIERS.map((tier) => (
            <Pressable
              key={tier}
              style={({ pressed }) => [styles.tierRow, pressed && styles.tierRowPressed]}
              onPress={() => onPurchase(tier)}
              disabled={loading || adUnlockLoading}
            >
              <Text style={styles.tierLabel}>{t(TIER_LABEL_KEYS[tier])}</Text>
              <StarAmount amount={FEATURE_PASS_COSTS[tier]} textStyle={styles.tierCost} />
            </Pressable>
          ))}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: theme.spacing.lg, gap: theme.spacing.sm, minWidth: 300 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  featureName: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  hint: { color: theme.colors.textSubtle, fontSize: 12, lineHeight: 18 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: theme.spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textSubtle,
    fontSize: 11,
    fontWeight: '600',
  },
  tierList: { gap: 8, marginTop: theme.spacing.xs },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tierRowPressed: { opacity: 0.85 },
  tierLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  tierCost: { fontSize: 16, fontWeight: '800' },
});
