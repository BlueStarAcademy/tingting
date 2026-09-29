import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal } from '@/components/AppModal';
import { CalendarMonth } from '@/components/CalendarMonth';
import { SheetHeader } from '@/components/SheetHeader';
import { formatDateKey, parseDateKey, todayKey } from '@/lib/dates';
import { theme } from '@/constants/theme';

type Props = {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
};

export function DateField({ label, value, onChange, placeholder = '날짜 선택', clearable }: Props) {
  const [open, setOpen] = useState(false);
  const base = parseDateKey(value ?? todayKey());
  const [cursor, setCursor] = useState({ year: base.getFullYear(), month: base.getMonth() });

  const openPicker = () => {
    const d = parseDateKey(value ?? todayKey());
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setOpen(true);
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.input} onPress={openPicker}>
        <Ionicons name="calendar-outline" size={17} color={theme.colors.primary} />
        <Text style={[styles.value, !value && styles.placeholder]}>{value ? formatDateKey(value, true) : placeholder}</Text>
        {clearable && value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSubtle} />
          </Pressable>
        ) : null}
      </Pressable>
      <AppModal visible={open} onRequestClose={() => setOpen(false)}>
        <SheetHeader title={label ?? '날짜 선택'} onClose={() => setOpen(false)} />
        <View style={styles.calendar}>
          <CalendarMonth
            year={cursor.year}
            month={cursor.month}
            selected={value}
            onChangeMonth={(year, month) => setCursor({ year, month })}
            onSelect={(key) => {
              onChange(key);
              setOpen(false);
            }}
          />
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, flex: 1 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  value: { flex: 1, color: theme.colors.text, fontSize: 15 },
  placeholder: { color: theme.colors.textSubtle },
  calendar: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
});
