import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';
import type { Quest } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function QuestScreen() {
  const [quests, setQuests] = useState<Quest[]>([]);

  const load = async () => setQuests(await api.getQuests());
  useFocusEffect(useCallback(() => { load(); }, []));

  const verify = async (quest: Quest) => {
    try {
      const coords = await getCurrentCoords();
      const result = await api.completeQuest(quest.id, coords.lat, coords.lng);
      Alert.alert('Quest Complete!', '+' + result.reward + ' stars (total: ' + result.stars + ')');
      load();
    } catch (e: unknown) {
      Alert.alert('Quest failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>GPS Quests</Text>
        <Text style={styles.sub}>Visit locations to verify and earn stars</Text>
        {quests.map((q) => (
          <View key={q.id} style={styles.card}>
            <Text style={styles.name}>{q.title}</Text>
            <Text style={styles.desc}>{q.description}</Text>
            <Text style={styles.reward}>Reward: {q.rewardStars} stars</Text>
            {q.completed ? (
              <Text style={styles.done}>Completed</Text>
            ) : (
              <PremiumButton title="Verify GPS" onPress={() => verify(q)} />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14 },
  reward: { color: theme.colors.star, fontWeight: '600' },
  done: { color: theme.colors.success, fontWeight: '700' },
});
