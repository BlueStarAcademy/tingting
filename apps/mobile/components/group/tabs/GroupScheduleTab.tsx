import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  type GroupSchedule,
  SCHEDULE_STICKERS,
  DEFAULT_STICKER_ID,
  getStickerById,
} from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { getIntlTag } from '@/lib/i18n/locale';
import {
  buildMonthGrid,
  dateKeyFromParts,
  toDateKey,
} from '@/lib/schedule-utils';
import { theme } from '@/constants/theme';

interface Props {
  groupId: string;
  regionCode: string;
  schedules: GroupSchedule[];
  onUpdated: () => void | Promise<void>;
}

export function GroupScheduleTab({ groupId, regionCode, schedules, onUpdated }: Props) {
  const { t, formatDate, locale } = useLocale();
  const { profile } = useAuth();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [selectedStickerId, setSelectedStickerId] = useState(DEFAULT_STICKER_ID);
  const [deleteTarget, setDeleteTarget] = useState<GroupSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const ownedStickers: Record<string, number> = (profile as any)?.ownedStickers ?? {};

  const regionSchedules = useMemo(
    () => schedules.filter((s) => s.regionCode === regionCode),
    [schedules, regionCode]
  );

  const scheduleDates = useMemo(
    () => new Set(regionSchedules.map((s) => s.date)),
    [regionSchedules]
  );

  const schedulesByDate = useMemo(() => {
    const map: Record<string, GroupSchedule[]> = {};
    for (const s of regionSchedules) {
      (map[s.date] ??= []).push(s);
    }
    return map;
  }, [regionSchedules]);

  const selectedDateKey = dateKeyFromParts(viewYear, viewMonth, selectedDay);
  const daySchedules = regionSchedules.filter((s) => s.date === selectedDateKey);

  const weekLabels = [
    t('group.scheduleWeekSun'),
    t('group.scheduleWeekMon'),
    t('group.scheduleWeekTue'),
    t('group.scheduleWeekWed'),
    t('group.scheduleWeekThu'),
    t('group.scheduleWeekFri'),
    t('group.scheduleWeekSat'),
  ];

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(getIntlTag(locale), {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedDay(1);
  };

  const openAdd = () => {
    setTitle('');
    setNote('');
    setSelectedStickerId(DEFAULT_STICKER_ID);
    setAddOpen(true);
  };

  const saveSchedule = async () => {
    if (!title.trim()) {
      Alert.alert(t('common.alert'), t('group.scheduleTitlePlaceholder'));
      return;
    }
    const sticker = getStickerById(selectedStickerId);
    if (sticker && !sticker.free) {
      const count = ownedStickers[selectedStickerId] ?? 0;
      if (count <= 0) {
        Alert.alert(t('common.alert'), t('group.stickerNone'));
        return;
      }
    }
    try {
      await api.createGroupSchedule({
        groupId,
        regionCode,
        title: title.trim(),
        date: selectedDateKey,
        note: note.trim() || undefined,
        stickerId: selectedStickerId,
      });
      setAddOpen(false);
      onUpdated();
      Alert.alert(t('common.alert'), t('group.scheduleAdded'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const confirmDelete = (schedule: GroupSchedule) => {
    setDeleteTarget(schedule);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const runDelete = async (schedule: GroupSchedule) => {
    setDeleting(true);
    try {
      await api.deleteGroupSchedule(schedule.id);
      await onUpdated();
      setDeleteTarget(null);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setDeleting(false);
    }
  };

  const todayKey = toDateKey(today);

  const getFirstStickerForDate = (dateKey: string): string | null => {
    const dayItems = schedulesByDate[dateKey];
    if (!dayItems || dayItems.length === 0) return null;
    const stickerId = dayItems[0].stickerId ?? DEFAULT_STICKER_ID;
    return getStickerById(stickerId)?.emoji ?? null;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {weekLabels.map((label, i) => (
          <Text key={label} style={[styles.weekLabel, i === 0 && styles.weekSun, i === 6 && styles.weekSat]}>
            {label}
          </Text>
        ))}
      </View>

      {monthGrid.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.weekRow}>
          {row.map((day, colIndex) => {
            if (day == null) {
              return <View key={`empty-${rowIndex}-${colIndex}`} style={styles.dayCell} />;
            }
            const dateKey = dateKeyFromParts(viewYear, viewMonth, day);
            const isSelected = day === selectedDay;
            const isToday = dateKey === todayKey;
            const stickerEmoji = getFirstStickerForDate(dateKey);
            return (
              <Pressable
                key={dateKey}
                style={[styles.dayCell, isSelected && styles.daySelected, isToday && styles.dayToday]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.dayNum,
                    colIndex === 0 && styles.weekSun,
                    colIndex === 6 && styles.weekSat,
                    isSelected && styles.dayNumSelected,
                  ]}
                >
                  {day}
                </Text>
                {stickerEmoji ? (
                  <Text style={styles.stickerEmoji}>{stickerEmoji}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{formatDate(selectedDateKey)}</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={18} color={theme.colors.primaryLight} />
          <Text style={styles.addBtnText}>{t('group.scheduleAdd')}</Text>
        </Pressable>
      </View>

      {daySchedules.length === 0 ? (
        <Text style={styles.empty}>{t('group.scheduleEmptyDay')}</Text>
      ) : (
        daySchedules.map((schedule) => {
          const emoji = getStickerById(schedule.stickerId ?? DEFAULT_STICKER_ID)?.emoji ?? '❤️';
          return (
            <View key={schedule.id} style={styles.card}>
              <Text style={styles.cardSticker}>{emoji}</Text>
              <View style={styles.cardMain}>
                <Text style={styles.cardTitle}>{schedule.title}</Text>
                {schedule.note ? <Text style={styles.cardNote}>{schedule.note}</Text> : null}
              </View>
              <View style={styles.cardMeta}>
                <Pressable onPress={() => confirmDelete(schedule)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      {regionSchedules.length === 0 ? (
        <Text style={styles.emptyRegion}>{t('group.scheduleEmpty')}</Text>
      ) : null}

      <AppModal visible={addOpen} animationType="fade" onRequestClose={() => setAddOpen(false)} variant="center">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('group.scheduleAdd')}</Text>
          <Text style={styles.modalDate}>{formatDate(selectedDateKey)}</Text>

          <Text style={styles.inputLabel}>{t('group.stickerLabel')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stickerScroll} contentContainerStyle={styles.stickerRow}>
            {SCHEDULE_STICKERS.map((sticker) => {
              const isActive = sticker.id === selectedStickerId;
              const count = sticker.free ? Infinity : (ownedStickers[sticker.id] ?? 0);
              return (
                <Pressable
                  key={sticker.id}
                  style={[styles.stickerItem, isActive && styles.stickerItemActive]}
                  onPress={() => setSelectedStickerId(sticker.id)}
                  accessible={false}
                  {...(Platform.OS === 'web' ? { focusable: false, tabIndex: -1 } as any : {})}
                >
                  <Text style={[styles.stickerItemEmoji, Platform.OS === 'web' && { userSelect: 'none' } as any]}>{sticker.emoji}</Text>
                  <Text style={[styles.stickerCount, count === 0 && styles.stickerCountZero, Platform.OS === 'web' && { userSelect: 'none' } as any]}>
                    {sticker.free ? '∞' : count}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.inputLabel}>{t('group.scheduleTitle')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('group.scheduleTitlePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Text style={styles.inputLabel}>{t('group.scheduleNote')}</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder={t('group.scheduleNotePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
          <View style={styles.modalActions}>
            <PremiumButton title={t('header.cancel')} variant="outline" onPress={() => setAddOpen(false)} style={styles.modalActionBtn} />
            <PremiumButton title={t('common.save')} onPress={() => void saveSchedule()} style={styles.modalActionBtn} />
          </View>
        </ScrollView>
      </AppModal>

      <AppModal
        visible={deleteTarget != null}
        animationType="fade"
        onRequestClose={closeDeleteModal}
        variant="center"
      >
        <View style={styles.deleteModal}>
          <Text style={styles.deleteTitle}>{t('group.scheduleDelete')}</Text>
          <Text style={styles.deleteMessage}>{t('group.scheduleDeleteConfirm')}</Text>
          <View style={styles.modalActions}>
            <PremiumButton
              title={t('header.cancel')}
              variant="outline"
              onPress={closeDeleteModal}
              disabled={deleting}
              style={styles.modalActionBtn}
            />
            <PremiumButton
              title={t('group.scheduleDelete')}
              variant="danger"
              onPress={() => deleteTarget && void runDelete(deleteTarget)}
              loading={deleting}
              style={styles.modalActionBtn}
            />
          </View>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
  },
  monthTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 4,
  },
  weekSun: { color: '#f87171' },
  weekSat: { color: theme.colors.primaryLight },
  dayCell: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    margin: 1,
    gap: 1,
  },
  daySelected: { backgroundColor: theme.colors.tint.soft, borderWidth: 1, borderColor: theme.colors.primaryLight },
  dayToday: { backgroundColor: theme.colors.surface },
  dayNum: { color: theme.colors.text, fontSize: 12, fontWeight: '600' },
  dayNumSelected: { color: theme.colors.primaryDark, fontWeight: '800' },
  stickerEmoji: { fontSize: 12 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  listTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { color: theme.colors.primaryLight, fontSize: 13, fontWeight: '700' },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.md, fontSize: 13 },
  emptyRegion: { color: theme.colors.textMuted, textAlign: 'center', fontSize: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  cardSticker: { fontSize: 22 },
  cardMain: { flex: 1, gap: 4 },
  cardTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  cardNote: { color: theme.colors.textMuted, fontSize: 12 },
  cardMeta: { alignItems: 'flex-end', gap: 8 },
  modalContent: { gap: theme.spacing.sm, padding: theme.spacing.md },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  modalDate: { color: theme.colors.textMuted, fontSize: 14 },
  inputLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  stickerScroll: { flexGrow: 0 },
  stickerRow: { gap: 8, paddingVertical: 6 },
  stickerItem: {
    width: 52,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      web: { outlineStyle: 'none', cursor: 'pointer' } as any,
    }),
  },
  stickerItemActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  stickerItemEmoji: { fontSize: 22 },
  stickerCount: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700' },
  stickerCountZero: { color: '#f87171' },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 14,
  },
  noteInput: { minHeight: 72, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  modalActionBtn: { flex: 1 },
  deleteModal: { gap: theme.spacing.md, padding: theme.spacing.lg },
  deleteTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  deleteMessage: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
