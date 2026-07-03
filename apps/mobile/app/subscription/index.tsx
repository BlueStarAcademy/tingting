import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { StarAmount } from '@/components/StarAmount';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import {
  getOfferings,
  initRevenueCat,
  purchasePlus,
  purchaseStarPack,
  restorePurchases,
  type PlusPlan,
  type StarPack,
} from '@/lib/monetization';
import { theme } from '@/constants/theme';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLocale();
  const [plusPlans, setPlusPlans] = useState<PlusPlan[]>([]);
  const [starPacks, setStarPacks] = useState<StarPack[]>([]);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    initRevenueCat(profile?.id).then(async () => {
      const offerings = await getOfferings();
      setPlusPlans(offerings.plusPlans);
      setStarPacks(offerings.starPacks);
      setConfigured(offerings.isConfigured);
    });
  }, [profile?.id]);

  const handlePlus = async (planId: PlusPlan['id']) => {
    const result = await purchasePlus(planId);
    Alert.alert(result.success ? '구독 완료' : '준비 중', result.message);
  };

  const handleStars = async (packId: string) => {
    const result = await purchaseStarPack(packId);
    Alert.alert(result.success ? '구매 완료' : '준비 중', result.message);
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    Alert.alert('복원', result.message);
  };

  return (
    <AppScreen title={t('my.plus')} showBack>
      <Text style={styles.hero}>전국일주를 더 예쁘게, 더 편하게</Text>
      <Text style={styles.sub}>
        {configured ? 'RevenueCat 연동됨' : '결제는 곧 출시됩니다 — 미리 혜택을 확인해 보세요'}
      </Text>

      <Text style={styles.sectionTitle}>구독 플랜</Text>
      {plusPlans.map((plan) => (
        <View key={plan.id} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.price}>
              {plan.priceLabel}
              <Text style={styles.period}>{plan.period}</Text>
            </Text>
          </View>
          {plan.perks.map((perk) => (
            <Text key={perk} style={styles.perk}>
              • {perk}
            </Text>
          ))}
          <PremiumButton title={t('subscription.comingSoon')} onPress={() => handlePlus(plan.id)} />
        </View>
      ))}

      <Text style={styles.sectionTitle}>스타 충전</Text>
      <Text style={styles.hint}>퀘스트 3회 ≈ 스타 M — 시간을 절약하고 바로 꾸며보세요</Text>
      {starPacks.map((pack) => (
        <View key={pack.id} style={styles.starRow}>
          <View>
            <StarAmount amount={pack.stars} suffix="스타" textStyle={styles.starName} />
            {pack.bonus ? <Text style={styles.bonus}>{pack.bonus} 보너스</Text> : null}
          </View>
          <PremiumButton title={pack.priceLabel} onPress={() => handleStars(pack.id)} variant="outline" />
        </View>
      ))}

      <PremiumButton title="구매 복원" onPress={handleRestore} variant="outline" />
      <PremiumButton title={t('my.starShop')} onPress={() => router.push('/shop')} variant="outline" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: theme.colors.textMuted, fontSize: 14, marginBottom: theme.spacing.sm },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginTop: theme.spacing.sm },
  hint: { color: theme.colors.textMuted, fontSize: 13 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginBottom: theme.spacing.md,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  price: { color: theme.colors.star, fontSize: 18, fontWeight: '800' },
  period: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '400' },
  perk: { color: theme.colors.textMuted, fontSize: 14 },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginBottom: theme.spacing.sm,
  },
  starName: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  bonus: { color: theme.colors.star, fontSize: 12, marginTop: 2 },
});
