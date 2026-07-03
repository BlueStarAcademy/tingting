import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { UserProfile } from '@tingting/shared';
import { formatPhone, isValidPhone, normalizePhone } from '@/lib/phone';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { ProfileSection } from '@/components/ProfileSection';
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

type FoundUser = { userId: string; displayName: string; phone: string; profile: UserProfile };

export function InviteMemberModal({ visible, groupId, onClose, onInvited }: Props) {
  const { t } = useLocale();
  const [phone, setPhone] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);

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

    setSearching(true);
    try {
      const user = await api.searchUserByPhone(digits);
      if (!user) {
        Alert.alert(t('common.alert'), t('group.userNotFound'));
        setFoundUser(null);
        return;
      }
      const profile = user.profile ?? (await api.getUserProfile(user.userId));
      if (!profile || profile.profilePublic === false) {
        Alert.alert(t('common.alert'), t('group.userProfilePrivate'));
        setFoundUser(null);
        return;
      }
      setFoundUser({ ...user, profile });
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'PROFILE_PRIVATE') {
        Alert.alert(t('common.alert'), t('group.userProfilePrivate'));
      } else if (code === 'USER_NOT_FOUND') {
        Alert.alert(t('common.alert'), t('group.userNotFound'));
      } else {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
      }
      setFoundUser(null);
    } finally {
      setSearching(false);
    }
  };

  const sendInvite = async () => {
    if (!foundUser) return;

    setInviting(true);
    try {
      await api.inviteGroupMember(groupId, foundUser.phone);
      reset();
      onClose();
      onInvited();
      Alert.alert(t('group.invited'), t('group.inviteSent'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setInviting(false);
    }
  };

  return (
    <AppModal visible={visible} animationType="slide" onRequestClose={handleClose} withGroupChat>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
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

          <PremiumButton
            title={t('group.searchPhone')}
            onPress={search}
            loading={searching}
            disabled={inviting}
          />

          {foundUser ? (
            <View style={styles.profileWrap}>
              <ProfileSection profile={foundUser.profile} onUpdated={() => {}} readOnly embedded />
              <PremiumButton
                title={t('group.sendInvite')}
                onPress={sendInvite}
                loading={inviting}
                disabled={searching}
              />
            </View>
          ) : null}
        </ScrollView>
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
  profileWrap: { gap: theme.spacing.sm, marginTop: theme.spacing.xs },
});
