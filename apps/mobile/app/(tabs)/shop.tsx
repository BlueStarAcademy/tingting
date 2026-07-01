import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { TabPage } from '@/components/TabPage';
import { PageHeader } from '@/components/PageHeader';
import { PremiumButton } from '@/components/PremiumButton';
import { cardSurface, tabPill } from '@/lib/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

type ShopTab = 'stars' | 'packages' | 'subscription';

const STAR_PRODUCTS = [
  { id: 's100', name: '✦ 100', price: '₩1,100', desc: '스타 100개' },
  { id: 's500', name: '✦ 500', price: '₩4,900', desc: '스타 500개 (+50 보너스)' },
  { id: 's1000', name: '✦ 1,000', price: '₩8,900', desc: '스타 1,000개 (+150 보너스)' },
];

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
  const { refresh } = useAuth();
  const [tab, setTab] = useState<ShopTab>('stars');
  const items = api.getShopItems();

  const tabs: { id: ShopTab; label: string }[] = [
    { id: 'stars', label: t('shop.tabStars') },
    { id: 'packages', label: t('shop.tabPackages') },
    { id: 'subscription', label: t('shop.tabSubscription') },
  ];

  const comingSoon = () => Alert.alert(t('shop.comingSoonTitle'), t('shop.comingSoonMessage'));

  const buyItem = async (id: string, name: string, cost: number) => {
    try {
      await api.spendStars(cost, 'shop_' + id);
      await refresh();
      Alert.alert(t('shop.purchased'), t('shop.unlocked', { name }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    }
  };

  return (
    <TabPage contentContainerStyle={styles.page}>
      <PageHeader title={t('shop.title')} subtitle={t('shop.sub')} />
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

      {tab === 'stars' ? (
        <>
          {STAR_PRODUCTS.map((p) => (
            <View key={p.id} style={[styles.card, cardSurface()]}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.desc}>{p.desc}</Text>
              <PremiumButton title={p.price} onPress={comingSoon} />
            </View>
          ))}
          <Text style={styles.section}>{t('shop.itemsSection')}</Text>
          {items.map((item) => (
            <View key={item.id} style={[styles.card, cardSurface()]}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.desc}>{item.description}</Text>
              <PremiumButton
                title={t('shop.buy', { cost: item.cost })}
                onPress={() => buyItem(item.id, item.name, item.cost)}
              />
            </View>
          ))}
        </>
      ) : null}

      {tab === 'packages'
        ? PACKAGES.map((p) => (
            <View key={p.id} style={[styles.card, cardSurface()]}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.desc}>{p.desc}</Text>
              <PremiumButton title={p.price} onPress={comingSoon} />
            </View>
          ))
        : null}

      {tab === 'subscription'
        ? SUBS.map((p) => (
            <View key={p.id} style={[styles.card, cardSurface()]}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.desc}>{p.desc}</Text>
              <PremiumButton title={t('shop.subscribe')} onPress={comingSoon} />
            </View>
          ))
        : null}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.sm },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: theme.spacing.md },
  tabItem: { flex: 1, alignItems: 'center' },
  tabText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primaryLight, fontWeight: '800' },
  section: { color: theme.colors.textMuted, fontSize: 14, marginTop: theme.spacing.sm, fontWeight: '600' },
  card: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  name: { color: theme.colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  desc: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
});
