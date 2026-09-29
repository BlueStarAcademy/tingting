import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toDateKey, todayKey, WEEKDAYS } from '@/lib/dates';
import { theme } from '@/constants/theme';

export type CalendarMarks = Record<string, string[]>;

type Props = {
  year: number;
  /** 0-11 */
  month: number;
  selected?: string | null;
  marks?: CalendarMarks;
  onSelect: (dateKey: string) => void;
  onChangeMonth: (year: number, month: number) => void;
};

export function CalendarMonth({ year, month, selected, marks = {}, onSelect, onChangeMonth }: Props) {
  const today = todayKey();
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { key: toDateKey(d), day: d.getDate(), inMonth: d.getMonth() === month, weekday: d.getDay() };
    });
  }, [year, month]);
  const rows = cells.slice(35).some((c) => c.inMonth) ? 6 : 5;

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  };

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.primaryDark} />
        </Pressable>
        <Text style={styles.title}>
          {year}년 {month + 1}월
        </Text>
        <Pressable onPress={() => shift(1)} hitSlop={10} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primaryDark} />
        </Pressable>
      </View>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={w} style={[styles.weekday, i === 0 && styles.sun, i === 6 && styles.sat]}>
            {w}
          </Text>
        ))}
      </View>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.weekRow}>
          {cells.slice(r * 7, r * 7 + 7).map((cell) => {
            const isSelected = cell.key === selected;
            const isToday = cell.key === today;
            const dots = marks[cell.key] ?? [];
            return (
              <Pressable key={cell.key} style={styles.cell} onPress={() => onSelect(cell.key)}>
                <View style={[styles.dayWrap, isToday && styles.today, isSelected && styles.selected]}>
                  <Text
                    style={[
                      styles.day,
                      !cell.inMonth && styles.outside,
                      cell.weekday === 0 && styles.sun,
                      cell.weekday === 6 && styles.sat,
                      isSelected && styles.selectedText,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {dots.slice(0, 3).map((color, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: color }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.soft,
  },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 6,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3, minHeight: 46 },
  dayWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: theme.colors.primaryLight },
  selected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  day: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  selectedText: { color: '#fff', fontWeight: '800' },
  outside: { opacity: 0.3 },
  sun: { color: '#D95B5B' },
  sat: { color: '#5B8DEF' },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
