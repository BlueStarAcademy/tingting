import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  timeLeft: number;
  totalTime: number;
}

export function TimeProgressBar({ timeLeft, totalTime }: Props) {
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const isLow = progress <= 0.25;
  const isMid = progress > 0.25 && progress <= 0.5;

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%` },
            isLow && styles.fillLow,
            isMid && styles.fillMid,
          ]}
        />
      </View>
      <Text style={[styles.text, isLow && styles.textLow]}>{timeLeft}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.colors.teal,
  },
  fillMid: {
    backgroundColor: theme.colors.star,
  },
  fillLow: {
    backgroundColor: theme.colors.error,
  },
  text: {
    minWidth: 34,
    textAlign: 'right',
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  textLow: {
    color: theme.colors.error,
  },
});
