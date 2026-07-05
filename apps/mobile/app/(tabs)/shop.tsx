import { useCallback, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { TabPage } from '@/components/TabPage';
import { PremiumButton } from '@/components/PremiumButton';
import { StarIcon } from '@/components/StarAmount';
import { StarChip } from '@/components/StarChip';
import { cardSurface } from '@/lib/ui';
import { BUTTON_DEPTH, getDepthShadow } from '@/lib/premium-pressable-styles';
import { useAdFree } from '@/hooks/useAdFree';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import {
  DAILY_FREE_STARS,
  DAILY_FREE_STARS_BASIC,
  SUBSCRIPTION_DURATION_DAYS,
  SUBSCRIPTION_PREMIUM_DAILY_STARS,
  SUBSCRIPTION_PREMIUM_PLUS_DAILY_STARS,
} from '@tingting/shared';
import { theme } from '@/constants/theme';

type SubscriptionPlanId = 'premium' | 'premium_plus';

type ShopProduct = {
  id: string;
  name?: string;
  starAmount?: number;
  bonus?: number;
  desc?: string;
  subscriptionPlan?: SubscriptionPlanId;
  actionTitle: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  buttonTone?: 'free' | 'ad';
  middleContent?: ReactNode;
};

const SUBSCRIPTION_DAYS = SUBSCRIPTION_DURATION_DAYS;

const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanId,
  { dailyStars: number; editorPerk: 'stickers' | 'all' }
> = {
  premium: { dailyStars: SUBSCRIPTION_PREMIUM_DAILY_STARS, editorPerk: 'stickers' },
  premium_plus: { dailyStars: SUBSCRIPTION_PREMIUM_PLUS_DAILY_STARS, editorPerk: 'all' },
};

const DAILY_BUTTON_TONES = {
  free: {
    depth: '#3D8A78',
    gradient: ['#3D8A78', theme.colors.teal, '#7BC4B5'] as const,
  },
  ad: {
    depth: '#B45309',
    gradient: ['#B45309', theme.colors.star, '#F5C451'] as const,
  },
};

const STAR_PRODUCTS = [
  { id: 's100', amount: 100, price: '₩1,900' },
  { id: 's200', amount: 200, price: '₩3,900', bonus: 50 },
  { id: 's500', amount: 500, price: '₩8,900', bonus: 150 },
  { id: 's1000', amount: 1000, price: '₩17,900', bonus: 500 },
];

function ShopStarBonus({ amount }: { amount: number }) {
  const { t } = useLocale();
  return (
    <View style={styles.bonusRow}>
      <StarIcon size={14} />
      <Text style={styles.bonusText}>{t('shop.bonusLabel', { amount })}</Text>
    </View>
  );
}

function AdRemovalIcon() {
  return (
    <View style={styles.adIconWrap}>
      <View style={styles.adIconBadge}>
        <Text style={styles.adIconText}>AD</Text>
      </View>
      <View style={styles.adIconStrike} />
    </View>
  );
}

function ShopSectionDivider({ title }: { title: string }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function ShopSubscriptionPerks({ planId }: { planId: SubscriptionPlanId }) {
  const { t } = useLocale();
  const plan = SUBSCRIPTION_PLANS[planId];

  return (
    <View style={styles.subPerks}>
      <View style={styles.subPerkBox}>
        <View style={styles.subPerkItem}>
          <StarIcon size={14} />
          <Text style={styles.subPerkText}>
            {t('shop.subStarDaily', { amount: plan.dailyStars, days: SUBSCRIPTION_DAYS })}
          </Text>
        </View>
      </View>
      <View style={styles.subPerkBox}>
        <View style={styles.subPerkEditor}>
          <View style={styles.subPerkIconDays}>
            {plan.editorPerk === 'stickers' ? (
              <Text style={styles.subPerkEmoji}>😊</Text>
            ) : (
              <Ionicons name="color-wand-outline" size={14} color={theme.colors.primary} />
            )}
            <Text style={styles.subPerkDays}>
              {t('shop.subDaysLabel', { days: SUBSCRIPTION_DAYS })}
            </Text>
          </View>
          <Text style={styles.subPerkText}>
            {plan.editorPerk === 'stickers'
              ? t('shop.subStickerUnlimited')
              : t('shop.subEditorUnlimited')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ShopDailyButton({
  tone,
  title,
  onPress,
  disabled,
  loading,
}: {
  tone: 'free' | 'ad';
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const palette = DAILY_BUTTON_TONES[tone];
  const isDisabled = disabled || loading;

  return (
    <View style={[styles.dailyBtnWrap, { paddingBottom: BUTTON_DEPTH }]}>
      <View style={[styles.dailyBtnDepth, { backgroundColor: palette.depth }]} pointerEvents="none" />
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [
          styles.dailyBtnFaceWrap,
          getDepthShadow('primary', pressed && !isDisabled),
          pressed && !isDisabled && styles.dailyBtnPressed,
          isDisabled && styles.dailyBtnDisabled,
        ]}
      >
        <LinearGradient
          colors={[...palette.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.dailyBtnFace}
        >
          <View style={styles.dailyBtnHighlight} pointerEvents="none" />
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text
              style={styles.dailyBtnText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {title}
            </Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const SUBS: { id: SubscriptionPlanId; name: string; price: string }[] = [
  { id: 'premium', name: 'TingTing Premium', price: '₩9,900' },
  { id: 'premium_plus', name: 'TingTing Premium+', price: '₩19,900' },
];

export default function ShopTabScreen() {
  const { t } = useLocale();
  const { refresh } = useAuth();
  const { adFree, purchase: purchaseAdFree, watchAd } = useAdFree();
  const [dailyFreeClaimed, setDailyFreeClaimed] = useState(false);
  const [dailyAdClaimed, setDailyAdClaimed] = useState(false);
  const [dailyFreeLoading, setDailyFreeLoading] = useState(false);
  const [dailyAdLoading, setDailyAdLoading] = useState(false);

  const loadDailyState = useCallback(() => {
    api.getDailyFreeStarsState().then((state) => {
      setDailyFreeClaimed(state.freeClaimed);
      setDailyAdClaimed(state.adClaimed);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDailyState();
      void api.syncSubscriptionStarMails();
    }, [loadDailyState]),
  );

  const purchaseSubscription = (planId: SubscriptionPlanId, price: string) => {
    Alert.alert(t('shop.subscriptionConfirmTitle'), t('shop.subscriptionConfirmBody', { price }), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('shop.subscriptionPurchase'),
        onPress: async () => {
          try {
            await api.purchaseSubscription(planId);
            Alert.alert(t('shop.subscriptionPurchased'), t('shop.subscriptionMailHint'));
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.comingSoonMessage'));
          }
        },
      },
    ]);
  };

  const claimDailyFreeBasic = async () => {
    setDailyFreeLoading(true);
    try {
      const result = await api.claimDailyFreeStarsBasic();
      setDailyFreeClaimed(true);
      await refresh();
      Alert.alert(t('shop.dailyFreeSuccess'), t('shop.dailyFreeSuccessMessage', { amount: result.amount }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.comingSoonMessage'));
    } finally {
      setDailyFreeLoading(false);
    }
  };

  const claimDailyFreeAd = async () => {
    setDailyAdLoading(true);
    try {
      const watched = adFree || (await watchAd('shop_daily_stars'));
      if (!watched) return;
      const result = await api.claimDailyFreeStars();
      setDailyAdClaimed(true);
      await refresh();
      Alert.alert(t('shop.dailyFreeSuccess'), t('shop.dailyFreeSuccessMessage', { amount: result.amount }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.comingSoonMessage'));
    } finally {
      setDailyAdLoading(false);
    }
  };

  const comingSoon = () => Alert.alert(t('shop.comingSoonTitle'), t('shop.comingSoonMessage'));

  const renderProductCard = (product: ShopProduct, fullWidth = false) => {
    const isAdRemoval = product.id === 'ad-removal';

    return (
    <View
      key={product.id}
      style={[
        styles.card,
        fullWidth && styles.cardFull,
        isAdRemoval && styles.cardAdRemoval,
        cardSurface(),
      ]}
    >
      {product.starAmount != null ? (
        <View style={styles.starAmountWrap}>
          <StarChip stars={product.starAmount} />
        </View>
      ) : (
        <Text style={[styles.name, fullWidth && styles.nameFull]} numberOfLines={fullWidth ? 2 : 1}>
          {product.name}
        </Text>
      )}
      {product.bonus != null && product.bonus > 0 ? (
        <ShopStarBonus amount={product.bonus} />
      ) : product.middleContent != null ? (
        <View style={[styles.middleContentWrap, isAdRemoval && styles.middleContentAdRemoval]}>
          {product.middleContent}
        </View>
      ) : product.subscriptionPlan ? (
        <ShopSubscriptionPerks planId={product.subscriptionPlan} />
      ) : product.desc ? (
        <Text style={[styles.desc, fullWidth && styles.descFull]} numberOfLines={fullWidth ? undefined : 3}>
          {product.desc}
        </Text>
      ) : (
        <View style={styles.descSpacer} />
      )}
      {product.buttonTone ? (
        <ShopDailyButton
          tone={product.buttonTone}
          title={product.actionTitle}
          onPress={product.onPress}
          disabled={product.disabled}
          loading={product.loading}
        />
      ) : (
        <PremiumButton
          title={product.actionTitle}
          onPress={product.onPress}
          size={isAdRemoval || !fullWidth ? 'sm' : 'md'}
          disabled={product.disabled}
          loading={product.loading}
        />
      )}
    </View>
    );
  };

  const renderProductGrid = (products: ShopProduct[], fullWidth = false) => (
    <View style={styles.grid}>{products.map((product) => renderProductCard(product, fullWidth))}</View>
  );

  const dailyFreeProducts: ShopProduct[] = [
    {
      id: 'daily-free-basic',
      starAmount: DAILY_FREE_STARS_BASIC,
      actionTitle: dailyFreeClaimed ? t('shop.dailyFreeClaimed') : t('shop.dailyFreePriceFree'),
      onPress: claimDailyFreeBasic,
      disabled: dailyFreeClaimed,
      loading: dailyFreeLoading,
      buttonTone: 'free',
    },
    {
      id: 'daily-free-ad',
      starAmount: DAILY_FREE_STARS,
      actionTitle: dailyAdClaimed ? t('shop.dailyFreeClaimed') : t('shop.dailyFreeWatchAd'),
      onPress: claimDailyFreeAd,
      disabled: dailyAdClaimed,
      loading: dailyAdLoading,
      buttonTone: 'ad',
    },
  ];

  return (
    <TabPage contentContainerStyle={styles.page}>
      {renderProductGrid([
        ...dailyFreeProducts,
        ...STAR_PRODUCTS.map((p) => ({
          id: p.id,
          starAmount: p.amount,
          bonus: p.bonus,
          actionTitle: p.price,
          onPress: comingSoon,
        })),
      ])}

      <ShopSectionDivider title={t('shop.tabSubscription')} />

      {renderProductGrid(
        SUBS.map((p) => ({
          id: p.id,
          name: p.name,
          subscriptionPlan: p.id,
          actionTitle: p.price,
          onPress: () => purchaseSubscription(p.id, p.price),
        })),
        true,
      )}

      {renderProductGrid(
        [
          {
            id: 'ad-removal',
            name: t('shop.adRemovalTitle'),
            middleContent: (
              <>
                <AdRemovalIcon />
                <Text style={styles.adRemovalDesc}>{t('shop.adRemovalDesc')}</Text>
              </>
            ),
            actionTitle: adFree ? t('shop.adRemovalPurchased') : t('shop.adRemovalPrice'),
            onPress: () => {
              if (adFree) return;
              Alert.alert(
                t('shop.adRemovalTitle'),
                t('shop.adRemovalConfirm'),
                [
                  { text: t('header.cancel'), style: 'cancel' },
                  {
                    text: t('shop.adRemovalPrice'),
                    onPress: async () => {
                      await purchaseAdFree();
                      Alert.alert(t('shop.adRemovalSuccess'));
                    },
                  },
                ],
              );
            },
            disabled: adFree,
          },
        ],
        true,
      )}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.md },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '48%',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  cardFull: {
    width: '100%',
    flexBasis: '100%',
    flexGrow: 0,
    minHeight: undefined,
  },
  cardAdRemoval: {
    flexGrow: 0,
    minHeight: 148,
  },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  nameFull: { fontSize: 18 },
  starAmountWrap: { alignItems: 'center', alignSelf: 'stretch' },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
  },
  bonusText: { color: theme.colors.star, fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  descSpacer: { flex: 1 },
  desc: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
  descFull: { fontSize: 14, lineHeight: 20 },
  subPerks: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flex: 1,
  },
  subPerkBox: {
    flex: 1,
    flexBasis: 0,
    backgroundColor: theme.colors.tint.soft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  subPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  subPerkEditor: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  subPerkIconDays: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subPerkEmoji: {
    fontSize: 14,
    lineHeight: 16,
  },
  subPerkDays: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  subPerkText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    flexShrink: 1,
  },
  dailyBtnWrap: {
    alignSelf: 'stretch',
    width: '100%',
    position: 'relative',
  },
  dailyBtnDepth: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radius.sm,
  },
  dailyBtnFaceWrap: {
    overflow: 'hidden',
    borderRadius: theme.radius.sm,
  },
  dailyBtnFace: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: theme.radius.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 38,
  },
  dailyBtnHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dailyBtnPressed: {
    transform: [{ translateY: BUTTON_DEPTH }],
  },
  dailyBtnDisabled: {
    opacity: 0.45,
  },
  dailyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: '100%',
  },
  middleContentWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  middleContentAdRemoval: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: 0,
  },
  adIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  adIconBadge: {
    width: 36,
    height: 26,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adIconText: {
    fontSize: 12,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  adIconStrike: {
    position: 'absolute',
    width: 42,
    height: 2.5,
    backgroundColor: '#E53935',
    borderRadius: 2,
    transform: [{ rotate: '-42deg' }],
  },
  adRemovalDesc: {
    flex: 1,
    flexShrink: 1,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
