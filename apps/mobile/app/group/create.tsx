import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { slot } = useLocalSearchParams<{ slot?: string }>();
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const slotIndex = slot !== undefined ? Number(slot) : undefined;
  const isFirstSlot = slotIndex === 0 || slotIndex === undefined;

  const submit = async () => {
    if (!name.trim()) return Alert.alert(t('common.alert'), t('group.enterName'));
    setLoading(true);
    try {
      const { group } = await api.createGroup(
        name.trim(),
        description.trim() || undefined,
        slotIndex
      );
      Alert.alert(t('group.created'), t('group.createdFree'));
      router.replace(`/group/${group.id}` as Href);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen title={t('group.createTitle')} showBack scroll={false}>
      {isFirstSlot ? (
        <View style={styles.badgeRow}>
          <Text style={styles.hint}>{t('group.costHint')}</Text>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>{t('common.free')}</Text>
          </View>
        </View>
      ) : null}
      <TextInput
        style={styles.input}
        placeholder={t('group.namePlaceholder')}
        placeholderTextColor={theme.colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={t('group.descPlaceholder')}
        placeholderTextColor={theme.colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <PremiumButton title={t('group.createFree')} onPress={submit} loading={loading} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  hint: { color: theme.colors.textMuted, fontSize: 14, flex: 1 },
  freeBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  freeBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
