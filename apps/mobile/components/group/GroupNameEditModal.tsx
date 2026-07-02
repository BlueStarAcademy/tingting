import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { AppModal } from '@/components/AppModal';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  groupId: string;
  currentName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function GroupNameEditModal({ visible, groupId, currentName, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) setName(currentName);
  }, [visible, currentName]);

  const handleClose = () => {
    setName(currentName);
    onClose();
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('common.alert'), t('group.enterName'));
      return;
    }
    if (trimmed === currentName) {
      handleClose();
      return;
    }
    setLoading(true);
    try {
      await api.updateGroup(groupId, { name: trimmed });
      onSaved();
      handleClose();
      Alert.alert(t('group.updated'), t('group.nameUpdated'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal visible={visible} animationType="slide" onRequestClose={handleClose} withGroupChat>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('group.editNameTitle')}</Text>
            <PremiumIconButton
              icon="close"
              onPress={handleClose}
              variant="soft"
              color={theme.colors.textMuted}
              accessibilityLabel={t('header.cancel')}
            />
          </View>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('group.namePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            maxLength={30}
            autoFocus
          />
          <PremiumButton title={t('common.save')} onPress={save} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
});
