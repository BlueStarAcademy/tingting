import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { AppModal } from '@/components/AppModal';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onInvited: () => void;
}

type FoundUser = { userId: string; displayName: string; phone: string };

export function InviteMemberModal({ visible, groupId, onClose, onInvited }: Props) {
  const { t } = useLocale();
  const [phone, setPhone] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPhone('');
    setFoundUser(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onChangePhone = (text: string) => {
    setFoundUser(null);
    setPhone(formatPhone(text));
  };

  const search = async () => {
    const digits = normalizePhone(phone);
    if (!isValidPhone(digits)) {
      Alert.alert(t('common.alert'), t('group.invalidPhone'));
      return;
    }

    setLoading(true);
    try {
      const user = await api.searchUserByPhone(digits);
      if (!user) {
        Alert.alert(t('common.alert'), t('group.userNotFound'));
        setFoundUser(null);
        return;
      }
      setFoundUser(user);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!foundUser) {
      await search();
      return;
    }

    setLoading(true);
    try {
      await api.inviteGroupMember(groupId, foundUser.phone);
      reset();
      onClose();
      onInvited();
      Alert.alert(t('group.invited'), t('group.inviteSent'));
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
            <Text style={styles.title}>{t('group.inviteTitle')}</Text>
            <PremiumIconButton
              icon="close"
              onPress={handleClose}
              variant="soft"
              color={theme.colors.textMuted}
              accessibilityLabel={t('header.cancel')}
            />
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

          {foundUser ? (
            <View style={styles.foundBox}>
              <Ionicons name="person-circle-outline" size={28} color={theme.colors.primaryLight} />
              <Text style={styles.foundText}>{t('group.userFound', { name: foundUser.displayName })}</Text>
            </View>
          ) : null}

          <Text style={styles.free}>{t('group.inviteSlotNote')}</Text>
          <PremiumButton
            title={foundUser ? t('group.sendInvite') : t('group.searchPhone')}
            onPress={submit}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
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
  foundBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.tint.pill,
    borderRadius: theme.radius.md,
    padding: 12,
  },
  foundText: { color: theme.colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  free: { color: theme.colors.success, fontSize: 14, fontWeight: '600' },
});
