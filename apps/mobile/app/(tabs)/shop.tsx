import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  SCHEDULE_STICKERS,
  STICKER_PACK_OPTIONS,
  type ScheduleSticker,
  type StickerPackOption,
} from '@tingting/shared';
import { TabPage } from '@/components/TabPage';
import { PremiumButton } from '@/components/PremiumButton';
import { StarIcon } from '@/components/StarAmount';
import { StarChip } from '@/components/StarChip';
import { cardSurface, tabPill } from '@/lib/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAdFree } from '@/hooks/useAdFree';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

type ShopTab = 'stars' | 'stickers' | 'packages' | 'subscription' | 'etc';

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

const PACKAGES = [
  { id: 'p1', name: '여행 스타터', price: '₩9,900', desc: '스타 300 + AI 필터 2종' },
  { id: 'p2', name: '전국일주 패키지', price: '₩19,900', desc: '스타 800 + 그룹 슬롯 1개' },
];

const SUBS = [
  { id: 'sub1', name: 'TingTing Premium', price: '₩4,900/월', desc: '매일 스타 50 + 광고 제거' },
  { id: 'sub2', name: 'TingTing Premium+', price: '₩9,900/월', desc: '매일 스타 120 + AI 무제한' },
];

export default function ShopTabScreen() {
  const { t } = useLocale();
  const { profile, refresh } = useAuth();
  const { adFree, purchase: purchaseAdFree } = useAdFree();
  const [tab, setTab] = useState<ShopTab>('stars');
  const ownedStickers: Record<string, number> = (profile as any)?.ownedStickers ?? {};

  const tabs: { id: ShopTab; label: string }[] = [
    { id: 'stars', label: t('shop.tabStars') },
    { id: 'stickers', label: t('shop.tabStickers') },
    { id: 'packages', label: t('shop.tabPackages') },
    { id: 'subscription', label: t('shop.tabSubscription') },
    { id: 'etc', label: t('shop.tabEtc') },
  ];

  const comingSoon = () => Alert.alert(t('shop.comingSoonTitle'), t('shop.comingSoonMessage'));

  const buySticker = async (sticker: ScheduleSticker, pack: StickerPackOption) => {
    Alert.alert(
      t('group.stickerPackTitle'),
      t('group.stickerPackDesc', { name: sticker.emoji + ' ' + sticker.label, count: pack.count }) +
        `\n\n${pack.starCost} 스타`,
      [
        { text: t('header.cancel'), style: 'cancel' },
        {
          text: `${pack.starCost} 스타 ${t('shop.purchase')}`,
          onPress: async () => {
            try {
              await api.purchaseStickers(sticker.id, pack.id);
              await refresh();
              Alert.alert(t('group.stickerPurchased'));
            } catch (e: unknown) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
            }
          },
        },
      ]
    );
  };

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

      {tab === 'stickers' ? (
        <View style={styles.stickerSection}>
          {SCHEDULE_STICKERS.filter((s) => !s.free).map((sticker) => {
            const count = ownedStickers[sticker.id] ?? 0;
            return (
              <View key={sticker.id} style={[styles.stickerCard, cardSurface()]}>
                <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
                <Text style={styles.stickerLabel}>{sticker.label}</Text>
                <Text style={styles.stickerOwned}>
                  {t('shop.stickerOwned', { count })}
                </Text>
                <View style={styles.stickerPacks}>
                  {STICKER_PACK_OPTIONS.map((pack) => (
                    <PremiumButton
                      key={pack.id}
                      title={`${pack.count}개 · ${pack.starCost}스타`}
                      size="sm"
                      onPress={() => buySticker(sticker, pack)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
          <View style={[styles.stickerCard, styles.stickerFreeCard, cardSurface()]}>
            <Text style={styles.stickerEmoji}>
              {SCHEDULE_STICKERS.find((s) => s.free)?.emoji ?? '❤️'}
            </Text>
            <Text style={styles.stickerLabel}>
              {SCHEDULE_STICKERS.find((s) => s.free)?.label ?? '하트'}
            </Text>
            <Text style={styles.stickerFreeTag}>{t('shop.stickerFree')}</Text>
          </View>
        </View>
      ) : null}

      {tab === 'packages'
        ? renderProductGrid(
            PACKAGES.map((p) => ({
              id: p.id,
              name: p.name,
              desc: p.desc,
              actionTitle: p.price,
              onPress: comingSoon,
            })),
            true,
          )
        : null}

      {tab === 'subscription'
        ? renderProductGrid(
            SUBS.map((p) => ({
              id: p.id,
              name: p.name,
              desc: p.desc,
              actionTitle: t('shop.subscribe'),
              onPress: comingSoon,
            })),
            true,
          )
        : null}

      {tab === 'etc' ? (
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
  stickerSection: { gap: theme.spacing.sm },
  stickerCard: {
    padding: theme.spacing.md,
    gap: 8,
    alignItems: 'center',
  },
  stickerFreeCard: { opacity: 0.7 },
  stickerEmoji: { fontSize: 32 },
  stickerLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  stickerOwned: { color: theme.colors.textMuted, fontSize: 12 },
  stickerPacks: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  stickerFreeTag: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
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
