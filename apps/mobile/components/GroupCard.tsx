import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Group } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { t } = useLocale();
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.icon}
      >
        <Ionicons name="people" size={22} color="#fff" />
      </LinearGradient>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  body: { flex: 1, minWidth: 0 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  meta: { color: theme.colors.textMuted, fontSize: 13, marginTop: 3 },
});
