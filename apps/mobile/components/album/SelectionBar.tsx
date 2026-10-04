import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { getMainTabBarBottomInset } from '@/constants/layout';
import { shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

export type SelectionAction = {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export const SELECTION_BAR_HEIGHT = 112;

/** Floating bar for multi-select mode, docked above the main tab bar. */
export function SelectionBar({
  count,
  allSelected,
  onToggleAll,
  onDone,
  actions,
  title,
}: {
  count: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onDone: () => void;
  actions: SelectionAction[];
  title?: string;
}) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, shadow('lg'), { bottom: getMainTabBarBottomInset(insets.bottom) + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.count} numberOfLines={1}>
          {title ?? t('album.select.count', { count })}
        </Text>
        <Pressable onPress={onToggleAll} hitSlop={8}>
          <Text style={styles.link}>{allSelected ? t('album.select.none') : t('album.select.all')}</Text>
        </Pressable>
        <Pressable onPress={onDone} hitSlop={8} style={styles.done}>
          <Text style={styles.doneText}>{t('album.select.done')}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actions}>
        {actions.map((action) => {
          const disabled = action.disabled || count === 0;
          const color = action.danger ? theme.colors.error : theme.colors.primaryDark;
          return (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              disabled={disabled}
              style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && styles.pressed]}
            >
              <Ionicons name={action.icon} size={20} color={color} />
              <Text style={[styles.actionText, { color }]} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 30,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingTop: 10,
    paddingBottom: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, marginBottom: 6 },
  count: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  link: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },
  done: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.light,
  },
  doneText: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '800' },
  actions: { paddingHorizontal: 8, gap: 2 },
  action: { minWidth: 64, alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 12 },
  actionText: { fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: theme.colors.tint.soft },
});
