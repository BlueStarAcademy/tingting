import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from '@/components/AppModal';
import { SheetHeader } from '@/components/SheetHeader';
import type { IconName } from '@/components/ui';
import { theme } from '@/constants/theme';

export type SheetOption = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  danger?: boolean;
  hint?: string;
};

/** iOS cannot present a picker or another modal while a modal is still animating out. */
export function afterSheetClose(fn: () => void): void {
  if (Platform.OS === 'ios') setTimeout(fn, 400);
  else fn();
}

/** Simple list of choices; Android alerts only fit three buttons. */
export function ActionSheet({
  visible,
  title,
  message,
  options,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  return (
    <AppModal visible={visible} onRequestClose={onClose}>
      <SheetHeader title={title} onClose={onClose} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <ScrollView contentContainerStyle={styles.list}>
        {options.map((option) => {
          const color = option.danger ? theme.colors.error : theme.colors.text;
          return (
            <Pressable
              key={option.key}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => {
                onClose();
                afterSheetClose(option.onPress);
              }}
            >
              <View style={[styles.icon, option.danger && styles.iconDanger]}>
                <Ionicons name={option.icon} size={18} color={option.danger ? theme.colors.error : theme.colors.primary} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.label, { color }]}>{option.label}</Text>
                {option.hint ? <Text style={styles.hint}>{option.hint}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  message: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: theme.spacing.lg,
    marginTop: -4,
    marginBottom: 8,
  },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12 },
  pressed: { backgroundColor: theme.colors.tint.soft },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  iconDanger: { backgroundColor: 'rgba(217,91,91,0.1)' },
  body: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '700' },
  hint: { color: theme.colors.textMuted, fontSize: 12 },
});
