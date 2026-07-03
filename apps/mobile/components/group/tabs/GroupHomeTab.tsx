import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  type Group,
  type GroupSchedule,
  getStickerById,
  DEFAULT_STICKER_ID,
} from '@tingting/shared';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const SCHEDULE_CARD_HEIGHT = 58;

interface Props {
  group: Group;
  isOwner: boolean;
  schedules: GroupSchedule[];
  onUpdated: () => void;
}

export function GroupHomeTab({ group, isOwner, schedules, onUpdated }: Props) {
  const { t, formatDate } = useLocale();
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(group.description ?? '');

  const startEdit = () => {
    setDesc(group.description ?? '');
    setEditingDesc(true);
  };

  const saveDesc = async () => {
    try {
      await api.updateGroup(group.id, { description: desc.trim() || undefined });
      setEditingDesc(false);
      onUpdated();
      Alert.alert(t('group.updated'), t('group.descUpdated'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const upcomingSchedules = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    return schedules
      .filter((s) => s.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [schedules]);

  return (
    <View style={styles.wrap}>
      {/* Description + stats combined panel */}
      <View style={styles.panel}>
        <View style={styles.descHeader}>
          <Text style={styles.descLabel}>{t('group.descriptionLabel')}</Text>
          {isOwner && !editingDesc ? (
            <Pressable style={styles.editBtn} onPress={startEdit}>
              <Ionicons name="pencil" size={14} color={theme.colors.primaryLight} />
            </Pressable>
          ) : null}
          {isOwner && editingDesc ? (
            <Pressable style={styles.editBtn} onPress={saveDesc}>
              <Ionicons name="checkmark" size={16} color={theme.colors.primaryLight} />
            </Pressable>
          ) : null}
        </View>

        {editingDesc && isOwner ? (
          <TextInput
            style={styles.descInput}
            value={desc}
            onChangeText={setDesc}
            placeholder={t('group.descPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            multiline
            autoFocus
          />
        ) : group.description ? (
          <Text style={styles.desc}>{group.description}</Text>
        ) : (
          <Text style={styles.descMuted}>{t('group.noDescription')}</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color={theme.colors.primaryLight} />
            <Text style={styles.statText}>
              {t('group.tabMembers')} {group.members?.length ?? group.memberIds.length}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.primaryLight} />
            <Text style={styles.statText}>
              {new Date(group.createdAt).toLocaleDateString('ko-KR')} {t('group.createdAt')}
            </Text>
          </View>
        </View>
      </View>

      {/* Upcoming schedules */}
      <View style={styles.scheduleSection}>
        <Text style={styles.scheduleTitle}>{t('group.upcomingSchedules')}</Text>
        {upcomingSchedules.length > 0 ? (
          <ScrollView
            style={styles.scheduleList}
            contentContainerStyle={styles.scheduleListContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={upcomingSchedules.length > 2}
          >
            {upcomingSchedules.map((schedule) => {
              const emoji = getStickerById(schedule.stickerId ?? DEFAULT_STICKER_ID)?.emoji ?? '❤️';
              return (
                <View key={schedule.id} style={styles.scheduleCard}>
                  <Text style={styles.scheduleSticker}>{emoji}</Text>
                  <View style={styles.scheduleMain}>
                    <Text style={styles.scheduleCardTitle} numberOfLines={1}>{schedule.title}</Text>
                    <Text style={styles.scheduleDate}>{formatDate(schedule.date)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.scheduleEmptyCard}>
            <Ionicons name="calendar-outline" size={24} color={theme.colors.textMuted} />
            <Text style={styles.scheduleEmptyText}>{t('group.scheduleEmpty')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  descHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  descLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.tint.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  descMuted: { color: theme.colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  descInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: 10,
    color: theme.colors.text,
    fontSize: 13,
    minHeight: 72,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  statDivider: { width: 1, height: 16, backgroundColor: theme.colors.border },
  statText: { color: theme.colors.text, fontSize: 12, fontWeight: '600' },
  scheduleSection: { gap: theme.spacing.sm },
  scheduleTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  scheduleList: {
    maxHeight: SCHEDULE_CARD_HEIGHT * 2 + theme.spacing.sm,
  },
  scheduleListContent: {
    gap: theme.spacing.sm,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: SCHEDULE_CARD_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  scheduleSticker: { fontSize: 20 },
  scheduleMain: { flex: 1, gap: 2 },
  scheduleCardTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  scheduleDate: { color: theme.colors.textMuted, fontSize: 11 },
  scheduleEmptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    borderStyle: 'dashed',
  },
  scheduleEmptyText: { color: theme.colors.textMuted, fontSize: 13 },
});
