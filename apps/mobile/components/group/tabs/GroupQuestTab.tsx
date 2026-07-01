import { View, Text, StyleSheet } from 'react-native';
import type { Quest } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  quests: Quest[];
}

export function GroupQuestTab({ quests }: Props) {
  const { t } = useLocale();

  return (
    <View style={styles.wrap}>
      <Text style={styles.sub}>{t('group.questSub')}</Text>
      {quests.length === 0 ? (
        <Text style={styles.empty}>{t('group.questEmpty')}</Text>
      ) : (
        quests.map((q) => (
          <View key={q.id} style={styles.card}>
            <Text style={styles.name}>{q.title}</Text>
            <Text style={styles.desc}>{q.description}</Text>
            <View style={styles.footer}>
              <Text style={styles.reward}>✦ {q.rewardStars}</Text>
              {q.completed ? (
                <Text style={styles.done}>{t('quest.completed')}</Text>
              ) : (
                <Text style={styles.pending}>{t('group.questPending')}</Text>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  sub: { color: theme.colors.textMuted, fontSize: 13, marginBottom: theme.spacing.xs },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.tint.medium,
  },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  reward: { color: theme.colors.star, fontWeight: '800', fontSize: 14 },
  done: { color: theme.colors.success, fontWeight: '700', fontSize: 12 },
  pending: { color: theme.colors.primaryLight, fontWeight: '600', fontSize: 12 },
});
