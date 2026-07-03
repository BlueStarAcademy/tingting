import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  Pressable,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { AdminUserSummary, CustomerInquiry } from '@tingting/shared';
import { isAdminProfile } from '@tingting/shared';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { StarAmount } from '@/components/StarAmount';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { cardSurface, sectionTitleStyle } from '@/lib/ui';
import { theme } from '@/constants/theme';

export default function AdminScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [starAmount, setStarAmount] = useState('100');
  const [mailUserId, setMailUserId] = useState('');
  const [mailTitle, setMailTitle] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [broadcastAll, setBroadcastAll] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextUsers, nextInquiries] = await Promise.all([
        api.adminListUsers(userQuery),
        api.adminListInquiries(),
      ]);
      setUsers(nextUsers);
      setInquiries(nextInquiries);
      if (!selectedUserId && nextUsers.length > 0) {
        setSelectedUserId(nextUsers[0].id);
        setMailUserId(nextUsers[0].id);
      }
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, t, userQuery]);

  useFocusEffect(
    useCallback(() => {
      if (!isAdminProfile(profile)) {
        router.replace('/(tabs)/home');
        return;
      }
      load();
    }, [load, profile, router])
  );

  const grantStars = async () => {
    if (!selectedUserId) return;
    const amount = Number(starAmount);
    if (!Number.isFinite(amount) || amount === 0) {
      Alert.alert(t('common.error'), t('admin.invalidAmount'));
      return;
    }
    setBusy(true);
    try {
      await api.adminGrantStars(selectedUserId, amount);
      Alert.alert(t('common.alert'), t('admin.grantDone'));
      await load();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBusy(false);
    }
  };

  const resolveInquiry = async (inquiryId: string) => {
    setBusy(true);
    try {
      await api.adminResolveInquiry(inquiryId);
      await load();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBusy(false);
    }
  };

  const sendMail = async () => {
    if (!mailTitle.trim() || !mailBody.trim()) {
      Alert.alert(t('common.error'), t('admin.mailRequired'));
      return;
    }
    setBusy(true);
    try {
      if (broadcastAll) {
        const result = await api.adminBroadcastMailbox({
          title: mailTitle.trim(),
          body: mailBody.trim(),
        });
        Alert.alert(t('common.alert'), t('admin.mailSentCount', { count: result.sent }));
      } else {
        if (!mailUserId.trim()) {
          Alert.alert(t('common.error'), t('admin.userRequired'));
          return;
        }
        await api.adminSendMailbox({
          userId: mailUserId.trim(),
          title: mailTitle.trim(),
          body: mailBody.trim(),
        });
        Alert.alert(t('common.alert'), t('admin.mailSent'));
      }
      setMailTitle('');
      setMailBody('');
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (!isAdminProfile(profile)) return null;

  return (
    <AppScreen
      title={t('admin.title')}
      showBack
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary} />}
    >
      <View style={[styles.card, cardSurface]}>
        <Text style={sectionTitleStyle}>{t('admin.testMode')}</Text>
        <Text style={styles.hint}>{t('admin.testModeHint')}</Text>
      </View>

      <View style={[styles.card, cardSurface]}>
        <Text style={sectionTitleStyle}>{t('admin.users')}</Text>
        <TextInput
          style={styles.input}
          value={userQuery}
          onChangeText={setUserQuery}
          placeholder={t('admin.userSearch')}
          placeholderTextColor={theme.colors.textMuted}
        />
        <PremiumButton title={t('admin.search')} onPress={load} variant="outline" style={styles.btn} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userScroll}>
          {users.map((user) => {
            const active = user.id === selectedUserId;
            return (
              <Pressable
                key={user.id}
                style={[styles.userChip, active && styles.userChipActive]}
                onPress={() => {
                  setSelectedUserId(user.id);
                  setMailUserId(user.id);
                }}
              >
                <Text style={[styles.userChipName, active && styles.userChipNameActive]} numberOfLines={1}>
                  {user.displayName}
                </Text>
                <Text style={styles.userChipMeta} numberOfLines={1}>
                  {user.email}
                </Text>
                <StarAmount amount={user.stars} compact textStyle={styles.userChipMeta} />
              </Pressable>
            );
          })}
        </ScrollView>
        <TextInput
          style={styles.input}
          value={starAmount}
          onChangeText={setStarAmount}
          keyboardType="number-pad"
          placeholder={t('admin.starAmount')}
          placeholderTextColor={theme.colors.textMuted}
        />
        <PremiumButton title={t('admin.grantStars')} onPress={grantStars} loading={busy} style={styles.btn} />
      </View>

      <View style={[styles.card, cardSurface]}>
        <Text style={sectionTitleStyle}>{t('admin.inquiries')}</Text>
        {inquiries.length === 0 ? (
          <Text style={styles.empty}>{t('admin.noInquiries')}</Text>
        ) : (
          inquiries.map((inquiry) => (
            <View key={inquiry.id} style={styles.inquiryCard}>
              <View style={styles.inquiryHeader}>
                <Text style={styles.inquiryUser}>
                  {inquiry.userDisplayName ?? inquiry.userEmail ?? t('admin.anonymous')}
                </Text>
                <Text style={[styles.status, inquiry.status === 'resolved' && styles.statusDone]}>
                  {inquiry.status === 'resolved' ? t('admin.resolved') : t('admin.open')}
                </Text>
              </View>
              <Text style={styles.inquiryMessage}>{inquiry.message}</Text>
              <Text style={styles.inquiryDate}>{new Date(inquiry.createdAt).toLocaleString()}</Text>
              {inquiry.status === 'open' ? (
                <PremiumButton
                  title={t('admin.markResolved')}
                  onPress={() => resolveInquiry(inquiry.id)}
                  variant="outline"
                  loading={busy}
                  style={styles.btn}
                />
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, cardSurface]}>
        <Text style={sectionTitleStyle}>{t('admin.mailbox')}</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleChip, broadcastAll && styles.toggleChipActive]}
            onPress={() => setBroadcastAll(true)}
          >
            <Text style={[styles.toggleText, broadcastAll && styles.toggleTextActive]}>{t('admin.broadcastAll')}</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleChip, !broadcastAll && styles.toggleChipActive]}
            onPress={() => setBroadcastAll(false)}
          >
            <Text style={[styles.toggleText, !broadcastAll && styles.toggleTextActive]}>{t('admin.sendOne')}</Text>
          </Pressable>
        </View>
        {!broadcastAll ? (
          <TextInput
            style={styles.input}
            value={mailUserId}
            onChangeText={setMailUserId}
            placeholder={t('admin.targetUserId')}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
          />
        ) : null}
        <TextInput
          style={styles.input}
          value={mailTitle}
          onChangeText={setMailTitle}
          placeholder={t('admin.mailTitle')}
          placeholderTextColor={theme.colors.textMuted}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={mailBody}
          onChangeText={setMailBody}
          placeholder={t('admin.mailBody')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <PremiumButton title={t('admin.sendMail')} onPress={sendMail} loading={busy} style={styles.btn} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.md, padding: theme.spacing.md },
  hint: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  btn: { marginTop: theme.spacing.sm },
  userScroll: { marginTop: theme.spacing.sm },
  userChip: {
    width: 140,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  userChipActive: { borderColor: theme.colors.primaryLight, backgroundColor: 'rgba(79,107,149,0.12)' },
  userChipName: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  userChipNameActive: { color: theme.colors.primaryDark },
  userChipMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { color: theme.colors.textMuted, marginTop: theme.spacing.sm },
  inquiryCard: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inquiryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  inquiryUser: { color: theme.colors.text, fontWeight: '700', flex: 1 },
  status: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '700' },
  statusDone: { color: theme.colors.textMuted },
  inquiryMessage: { color: theme.colors.text, marginTop: 6, lineHeight: 20 },
  inquiryDate: { color: theme.colors.textMuted, fontSize: 12, marginTop: 6 },
  toggleRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  toggleChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleChipActive: { borderColor: theme.colors.primaryLight, backgroundColor: 'rgba(79,107,149,0.12)' },
  toggleText: { color: theme.colors.textMuted, fontWeight: '700', fontSize: 13 },
  toggleTextActive: { color: theme.colors.primaryDark },
});
