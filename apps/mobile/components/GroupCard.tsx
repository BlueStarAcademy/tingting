import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Group } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { t } = useLocale();
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.icon}>
        <Ionicons name="people" size={22} color={theme.colors.primaryLight} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.meta}>{group.memberIds.length}{t('common.members')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface(),
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    minWidth: 0,
  },
  pressed: { opacity: 0.92 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.tint.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  body: { flex: 1, minWidth: 0 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  meta: { color: theme.colors.textMuted, fontSize: 13, marginTop: 3 },
});
