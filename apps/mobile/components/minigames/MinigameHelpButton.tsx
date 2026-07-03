import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface Props {
  accessibilityLabel: string;
  label?: string;
  onPress: () => void;
}

export function MinigameHelpButton({ accessibilityLabel, label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Ionicons name="help-circle-outline" size={18} color={theme.colors.textMuted} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-end',
    minHeight: 34,
    borderRadius: 17,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
