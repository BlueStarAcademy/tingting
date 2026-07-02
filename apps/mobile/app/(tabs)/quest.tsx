import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PremiumButton } from '@/components/PremiumButton';
import { StarRewardModal } from '@/components/StarRewardModal';
import { TabPage } from '@/components/TabPage';
import { api } from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';
import type { Quest } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function QuestScreen() {
  const { t } = useLocale();
  const { refresh } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [rewardModal, setRewardModal] = useState<{ reward: number; total: number } | null>(null);

  const load = async () => setQuests(await api.getQuests());
  useFocusEffect(useCallback(() => { load(); }, []));

  const verify = async (quest: Quest) => {
    try {
      const coords = await getCurrentCoords();
      const result = await api.completeQuest(quest.id, coords.lat, coords.lng);
      setRewardModal({ reward: result.reward, total: result.stars });
      await refresh();
      load();
    } catch (e: unknown) {
      Alert.alert(t('quest.failed'), e instanceof Error ? e.message : t('auth.unknownError'));
    }
  };

  return (
    <TabPage contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>{t('quest.title')}</Text>
      <Text style={styles.sub}>{t('quest.sub')}</Text>
      {quests.map((q) => (
        <View key={q.id} style={styles.card}>
          <Text style={styles.name}>{q.title}</Text>
          <Text style={styles.desc}>{q.description}</Text>
          <Text style={styles.reward}>{t('quest.reward', { count: q.rewardStars })}</Text>
          {q.completed ? (
            <Text style={styles.done}>{t('quest.completed')}</Text>
          ) : (
            <PremiumButton title={t('quest.verify')} onPress={() => verify(q)} />
          )}
        </View>
      ))}

      <StarRewardModal
        visible={rewardModal !== null}
        amount={rewardModal?.reward ?? 0}
        totalStars={rewardModal?.total}
        title={t('quest.completeTitle')}
        subtitle={t('reward.questMessage', { amount: rewardModal?.reward ?? 0 })}
        onClose={() => setRewardModal(null)}
      />
    </TabPage>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 0, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14 },
  reward: { color: theme.colors.star, fontWeight: '600' },
  done: { color: theme.colors.success, fontWeight: '700' },
});
