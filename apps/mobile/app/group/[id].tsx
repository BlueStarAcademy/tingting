import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/lib/api';
import type { Group, Visit } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setGroup(await api.getGroup(id));
        const all = await api.getVisits();
        setVisits(all.filter((v) => v.groupId === id));
      })();
    }, [id])
  );

  if (!group) return <SafeAreaView style={styles.safe}><Text style={styles.text}>Loading...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={group.name} showBack />
        {group.description ? <Text style={styles.desc}>{group.description}</Text> : null}
        <Text style={styles.meta}>{group.memberIds.length} members</Text>
        <Text style={styles.section}>Group Visits ({visits.length})</Text>
        {visits.length === 0 ? (
          <Text style={styles.empty}>No group visits yet</Text>
        ) : (
          visits.map((v) => <Text key={v.id} style={styles.visit}>{new Date(v.visitedAt).toLocaleDateString()}</Text>)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg },
  text: { color: theme.colors.text },
  desc: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  meta: { color: theme.colors.primaryLight, marginBottom: theme.spacing.lg },
  section: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: theme.spacing.sm },
  empty: { color: theme.colors.textMuted },
  visit: { color: theme.colors.text, paddingVertical: 4 },
});
