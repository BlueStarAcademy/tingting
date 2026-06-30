import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PremiumButton } from '@/components/PremiumButton';
import { StarChip } from '@/components/StarChip';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function ShopScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const items = api.getShopItems();

  const buy = async (id: string, name: string, cost: number) => {
    try {
      await api.spendStars(cost, 'shop_' + id);
      await refresh();
      Alert.alert('Purchased', name + ' unlocked!');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Insufficient stars');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="Star Shop" showBack />
        {profile ? <StarChip stars={profile.stars} /> : null}
        <Text style={styles.sub}>Spend stars on AI effects and boosts</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <PremiumButton title={'Buy · ' + item.cost + ' stars'} onPress={() => buy(item.id, item.name, item.cost)} />
          </View>
        ))}
        <PremiumButton title="Back" onPress={() => router.back()} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.surfaceLight },
  name: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14 },
});
