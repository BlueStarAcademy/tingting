import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface Props {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'ok'],
];

export function NumberPad({ onDigit, onDelete, onSubmit, submitLabel = '확인', disabled }: Props) {
  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((key) => {
            if (key === 'del') {
              return (
                <Pressable
                  key={key}
                  onPress={onDelete}
                  disabled={disabled}
                  style={({ pressed }) => [styles.key, styles.keyAction, pressed && styles.keyPressed]}
                >
                  <Ionicons name="backspace-outline" size={20} color={theme.colors.text} />
                </Pressable>
              );
            }
            if (key === 'ok') {
              return (
                <Pressable
                  key={key}
                  onPress={onSubmit}
                  disabled={disabled}
                  style={({ pressed }) => [styles.key, styles.keySubmit, pressed && styles.keyPressed]}
                >
                  <Text style={styles.keySubmitText}>{submitLabel}</Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                onPress={() => onDigit(key)}
                disabled={disabled}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              >
                <Text style={styles.keyText}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    paddingVertical: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  key: {
    width: 72,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyAction: {
    backgroundColor: theme.colors.surface,
  },
  keySubmit: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  keyPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  keyText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  keySubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});
