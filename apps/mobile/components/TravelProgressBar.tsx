import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  progress: number;
  accentColor?: string;
  compact?: boolean;
}

export function TravelProgressBar({
  title,
  subtitle,
  progress,
  accentColor = theme.colors.primary,
  compact = false,
}: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.pct, compact && styles.pctCompact]}>{pct}%</Text>
      </View>
      {subtitle ? (
        <Text style={[styles.sub, compact && styles.subCompact]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  wrapCompact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  titleCompact: { fontSize: 13 },
  pct: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  pctCompact: { fontSize: 13 },
  sub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  subCompact: { fontSize: 11 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
