import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function ShopScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const { t } = useLocale();
  const items = api.getShopItems();

  const buy = async (id: string, name: string, cost: number) => {
    try {
      await api.spendStars(cost, 'shop_' + id);
      await refresh();
      Alert.alert(t('shop.purchased'), t('shop.unlocked', { name }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    }
  };

  return (
    <AppScreen title={t('shop.title')} showBack>
      <Text style={styles.sub}>{t('shop.sub')}</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.desc}>{item.description}</Text>
          <PremiumButton
            title={t('shop.buy', { cost: item.cost })}
            onPress={() => buy(item.id, item.name, item.cost)}
          />
        </View>
      ))}
      <PremiumButton title={t('common.back')} onPress={() => router.back()} variant="outline" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginBottom: theme.spacing.md,
  },
  name: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14 },
});
