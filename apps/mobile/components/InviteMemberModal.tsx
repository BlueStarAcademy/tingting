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
import { getGroupMemberInviteCost } from '@tingting/shared';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  groupId: string;
  currentMemberCount: number;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteMemberModal({ visible, groupId, currentMemberCount, onClose, onInvited }: Props) {
  const { t } = useLocale();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const cost = getGroupMemberInviteCost(currentMemberCount);

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

    const doInvite = async () => {
      setLoading(true);
      try {
        const result = await api.inviteGroupMember(groupId, digits);
        reset();
        onClose();
        onInvited();
        if (result.cost > 0) {
          Alert.alert(t('group.invited'), t('group.invitedPaid', { cost: result.cost }));
        } else {
          Alert.alert(t('group.invited'), t('group.invitedFree'));
        }
      } catch (e: unknown) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
      } finally {
        setLoading(false);
      }
    };

    if (cost > 0) {
      Alert.alert(t('group.inviteTitle'), t('group.inviteCostMessage', { cost }), [
        { text: t('header.cancel'), style: 'cancel' },
        { text: t('common.continue'), onPress: doInvite },
      ]);
    } else {
      await doInvite();
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
          {cost > 0 ? (
            <Text style={styles.cost}>✦ {cost} {t('group.inviteCostNote')}</Text>
          ) : (
            <Text style={styles.free}>{t('group.inviteFreeNote')}</Text>
          )}
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
  cost: { color: theme.colors.star, fontSize: 14, fontWeight: '700' },
  free: { color: theme.colors.success, fontSize: 14, fontWeight: '600' },
});
