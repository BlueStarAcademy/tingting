import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { PremiumButton } from '@/components/PremiumButton';
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('group.editNameTitle')}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
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
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
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
