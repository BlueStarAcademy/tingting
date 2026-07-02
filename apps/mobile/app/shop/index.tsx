import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { cardSurface } from '@/lib/ui';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const STAR_PRODUCTS = [
  { name: '✦ 100', price: '₩1,100', desc: '스타 100개' },
  { name: '✦ 250', price: '₩2,200', desc: '스타 200개 (+50 보너스)' },
  { name: '✦ 650', price: '₩5,500', desc: '스타 500개 (+150 보너스)' },
  { name: '✦ 1,500', price: '₩9,900', desc: '스타 1,000개 (+500 보너스)' },
];

export default function ShopScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const comingSoon = () => Alert.alert(t('shop.comingSoonTitle'), t('shop.comingSoonMessage'));

  return (
    <AppScreen title={t('shop.title')} showBack>
      <Text style={styles.sub}>{t('shop.tabStars')}</Text>
      {STAR_PRODUCTS.map((item) => (
        <View key={item.name} style={[styles.card, cardSurface()]}>
          <Text style={styles.name}>{item.name}</Text>
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
