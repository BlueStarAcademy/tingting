import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Group } from '@tingting/shared';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  group: Group;
  isOwner: boolean;
  onUpdated: () => void;
}

export function GroupHomeTab({ group, isOwner, onUpdated }: Props) {
  const { t } = useLocale();
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

  return (
    <View style={styles.wrap}>
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

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={20} color={theme.colors.primaryLight} />
          <Text style={styles.statNum}>{group.members?.length ?? group.memberIds.length}</Text>
          <Text style={styles.statLabel}>{t('group.tabMembers')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={20} color={theme.colors.primaryLight} />
          <Text style={styles.statLabel}>{new Date(group.createdAt).toLocaleDateString('ko-KR')}</Text>
          <Text style={styles.statSub}>{t('group.createdAt')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  descHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  descLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.tint.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  descMuted: { color: theme.colors.textMuted, fontSize: 14, fontStyle: 'italic' },
  descInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    color: theme.colors.text,
    fontSize: 14,
    minHeight: 96,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  stats: { flexDirection: 'row', gap: theme.spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.tint.medium,
  },
  statNum: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  statSub: { color: theme.colors.textMuted, fontSize: 11 },
});
