import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabPage } from '@/components/TabPage';
import { PremiumButton } from '@/components/PremiumButton';
import { StarIcon } from '@/components/StarAmount';
import { StarChip } from '@/components/StarChip';
import { cardSurface, tabPill } from '@/lib/ui';
import { useAdFree } from '@/hooks/useAdFree';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

type ShopTab = 'stars' | 'subscription';

type ShopProduct = {
  id: string;
  name?: string;
  starAmount?: number;
  bonus?: number;
  desc?: string;
  actionTitle: string;
  onPress: () => void;
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

const SUBS = [
  {
    id: 'premium',
    name: 'TingTing Premium',
    price: '₩9,900',
    desc: '30일 동안 매일 스타 25 + 사진편집 스티커 무제한 사용',
  },
  {
    id: 'premium_plus',
    name: 'TingTing Premium+',
    price: '₩19,900',
    desc: '30일 동안 매일 스타 50 + 모든 사진편집 기능 무제한 사용',
  },
];

export default function ShopTabScreen() {
  const { t } = useLocale();
  const { adFree, purchase: purchaseAdFree } = useAdFree();
  const [tab, setTab] = useState<ShopTab>('stars');

  const tabs: { id: ShopTab; label: string }[] = [
    { id: 'stars', label: t('shop.tabStars') },
    { id: 'subscription', label: t('shop.tabSubscription') },
  ];

  const comingSoon = () => Alert.alert(t('shop.comingSoonTitle'), t('shop.comingSoonMessage'));

  const renderProductCard = (product: ShopProduct, fullWidth = false) => (
    <View key={product.id} style={[styles.card, fullWidth && styles.cardFull, cardSurface()]}>
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
      ) : product.desc ? (
        <Text style={[styles.desc, fullWidth && styles.descFull]} numberOfLines={fullWidth ? undefined : 3}>
          {product.desc}
        </Text>
      ) : (
        <View style={styles.descSpacer} />
      )}
      <PremiumButton
        title={product.actionTitle}
        onPress={product.onPress}
        size={fullWidth ? 'md' : 'sm'}
      />
    </View>
  );

  const renderProductGrid = (products: ShopProduct[], fullWidth = false) => (
    <View style={styles.grid}>{products.map((product) => renderProductCard(product, fullWidth))}</View>
  );

  return (
    <TabPage contentContainerStyle={styles.page}>
      <View style={styles.tabRow}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            style={[tabPill(tab === item.id), styles.tabItem]}
            onPress={() => setTab(item.id)}
          >
            <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'stars'
        ? renderProductGrid(
            STAR_PRODUCTS.map((p) => ({
              id: p.id,
              starAmount: p.amount,
              bonus: p.bonus,
              actionTitle: p.price,
              onPress: comingSoon,
            })),
          )
        : null}

      {tab === 'subscription' ? (
        <>
          {renderProductGrid(
            SUBS.map((p) => ({
              id: p.id,
              name: p.name,
              desc: p.desc,
              actionTitle: p.price,
              onPress: comingSoon,
            })),
            true,
          )}
          <View style={[styles.adRemovalCard, cardSurface()]}>
            <View style={styles.adRemovalIcon}>
              <Ionicons name="shield-checkmark" size={28} color={theme.colors.teal} />
            </View>
            <Text style={styles.adRemovalTitle}>{t('shop.adRemovalTitle')}</Text>
            <Text style={styles.adRemovalDesc}>{t('shop.adRemovalDesc')}</Text>
            <PremiumButton
              title={adFree ? t('shop.adRemovalPurchased') : t('shop.adRemovalPrice')}
              onPress={() => {
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
              }}
              disabled={adFree}
              fullWidth
            />
          </View>
        </>
      ) : null}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.sm },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: theme.spacing.md },
  tabItem: { flex: 1, alignItems: 'center' },
  tabText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primaryLight, fontWeight: '800' },
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
  adRemovalCard: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  adRemovalIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  adRemovalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  adRemovalDesc: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
});
