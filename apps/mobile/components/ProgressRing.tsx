import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  progress: number;
  size?: number;
  label?: string;
}

export function ProgressRing({ progress, size = 120, label }: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const stroke = 8;
  const inner = size - stroke * 2;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: theme.colors.surfaceLight,
          },
        ]}
      />
      <View
        style={[
          styles.progressArc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: theme.colors.star,
            borderTopColor: pct >= 25 ? theme.colors.star : 'transparent',
            borderRightColor: pct >= 50 ? theme.colors.star : 'transparent',
            borderBottomColor: pct >= 75 ? theme.colors.star : 'transparent',
            borderLeftColor: pct >= 100 ? theme.colors.star : 'transparent',
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
      <View style={[styles.inner, { width: inner, height: inner, borderRadius: inner / 2 }]}>
        <Text style={styles.pct}>{pct}%</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  progressArc: { position: 'absolute' },
  inner: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  label: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
});
