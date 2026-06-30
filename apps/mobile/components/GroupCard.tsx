import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Group } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.icon}>
        <Ionicons name="people" size={22} color={theme.colors.primaryLight} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.meta}>{group.memberIds.length} members</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.2)',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  body: { flex: 1 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
});
