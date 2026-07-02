import { useState } from 'react';
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
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteMemberModal({ visible, groupId, onClose, onInvited }: Props) {
  const { t } = useLocale();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => setPhone('');

  const handleClose = () => {
    reset();
    onClose();
  };

  const onChangePhone = (text: string) => {
    setPhone(formatPhone(text));
  };

  const submit = async () => {
    const digits = normalizePhone(phone);
    if (!isValidPhone(digits)) {
      Alert.alert(t('common.alert'), t('group.invalidPhone'));
      return;
    }

    setLoading(true);
    try {
      await api.inviteGroupMember(groupId, digits);
      reset();
      onClose();
      onInvited();
      Alert.alert(t('group.invited'), t('group.invitedFree'));
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
            <Text style={styles.title}>{t('group.inviteTitle')}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.hint}>{t('group.inviteHint')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={onChangePhone}
            placeholder={t('group.phonePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
            maxLength={13}
          />
          <Text style={styles.free}>{t('group.inviteSlotNote')}</Text>
          <PremiumButton title={t('group.sendInvite')} onPress={submit} loading={loading} />
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
  hint: { color: theme.colors.textMuted, fontSize: 14 },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  free: { color: theme.colors.success, fontSize: 14, fontWeight: '600' },
});
