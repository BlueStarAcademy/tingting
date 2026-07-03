import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { StarAmount } from '@/components/StarAmount';
import { cardSurface } from '@/lib/ui';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const STAR_PRODUCTS = [
  { amount: 100, price: '₩1,900', desc: '스타 100개' },
  { amount: 200, price: '₩3,900', desc: '스타 200개 (+50 보너스)' },
  { amount: 500, price: '₩8,900', desc: '스타 500개 (+150 보너스)' },
  { amount: 1000, price: '₩17,900', desc: '스타 1,000개 (+500 보너스)' },
];

export default function ShopScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const comingSoon = () => Alert.alert(t('shop.comingSoonTitle'), t('shop.comingSoonMessage'));

  return (
    <AppScreen title={t('shop.title')} showBack>
      <Text style={styles.sub}>{t('shop.tabStars')}</Text>
      {STAR_PRODUCTS.map((item) => (
        <View key={item.amount} style={[styles.card, cardSurface()]}>
          <StarAmount amount={item.amount} iconSize={20} textStyle={styles.name} />
          <Text style={styles.desc}>{item.desc}</Text>
          <PremiumButton title={item.price} onPress={comingSoon} />
        </View>
      ))}
      <PremiumButton title={t('common.back')} onPress={() => router.back()} variant="outline" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  card: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  name: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14 },
});
