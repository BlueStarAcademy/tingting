import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface StatItem {
  label: string;
  value: string | number;
}

interface Props {
  stats: StatItem[];
}

export function GameStatsBar({ stats }: Props) {
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.item}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  item: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
});
