import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface Props {
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
}

export function SettingsMenuRow({ label, value, onPress, destructive }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <Text style={[styles.label, destructive && styles.destructive]}>{label}</Text>
      <View style={styles.right}>
        {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginBottom: theme.spacing.sm,
  },
  pressed: { opacity: 0.88 },
  label: { color: theme.colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  destructive: { color: '#E5484D' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '55%' },
  value: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
});
