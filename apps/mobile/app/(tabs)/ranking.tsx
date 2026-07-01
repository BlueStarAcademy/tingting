import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { TabPage } from '@/components/TabPage';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import type { RankingEntry } from '@tingting/shared';
import { cardSurface, tabPill } from '@/lib/ui';
import { theme } from '@/constants/theme';

type RankTab = 'stars' | 'visits' | 'gallery';

export default function RankingScreen() {
  const { t } = useLocale();
  const { profile } = useAuth();
  const [tab, setTab] = useState<RankTab>('stars');
  const [rows, setRows] = useState<RankingEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.getRankings(tab).then(setRows);
    }, [tab])
  );

  const tabs: { id: RankTab; label: string }[] = [
    { id: 'stars', label: t('ranking.stars') },
    { id: 'visits', label: t('ranking.visits') },
    { id: 'gallery', label: t('ranking.gallery') },
  ];

  return (
    <TabPage contentContainerStyle={styles.page}>
      <PageHeader title={t('ranking.title')} />
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
      {rows.map((r) => {
        const isMe = r.id === profile?.id;
        return (
          <View key={r.id} style={[styles.row, cardSurface(), isMe && styles.rowMe]}>
            <Text style={styles.rank}>{r.rank}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {r.displayName}
              {isMe ? ` ${t('ranking.me')}` : ''}
            </Text>
            <Text style={styles.value}>{r.value.toLocaleString()}</Text>
          </View>
        );
      })}
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { padding: 0, gap: theme.spacing.sm },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: theme.spacing.md },
  tabItem: { flex: 1, alignItems: 'center' },
  tabText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primaryLight, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: 8,
  },
  rowMe: { borderColor: theme.colors.borderStrong },
  rank: { color: theme.colors.star, fontWeight: '900', width: 28, fontSize: 16 },
  name: { flex: 1, color: theme.colors.text, fontWeight: '600' },
  value: { color: theme.colors.primaryLight, fontWeight: '800' },
});
