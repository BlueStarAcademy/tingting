import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { LocalePreference } from '@/lib/i18n/translations';
import { getLocaleLabel, SUPPORTED_LOCALES } from '@/lib/i18n/translations';
import { AppScreen } from '@/components/AppScreen';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { SettingsMenuRow } from '@/components/settings/SettingsMenuRow';
import { PhoneVerifyModal } from '@/components/settings/PhoneVerifyModal';
import { PhoneInviteSettingsModal } from '@/components/settings/PhoneInviteSettingsModal';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import {
  applyAppUpdate,
  checkForAppUpdate,
  getAppVersionLabel,
  isAppUpdateEnabled,
  openLatestApkDownload,
} from '@/lib/updates';
import { theme } from '@/constants/theme';

type SettingsTab = 'display' | 'account';

const LANGUAGE_OPTIONS: { value: LocalePreference; label?: string }[] = [
  { value: 'system' },
  ...SUPPORTED_LOCALES.map((locale) => ({ value: locale.code as LocalePreference, label: locale.label })),
];

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference, t } = useLocale();
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('display');
  const [langOpen, setLangOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const [phoneInviteOpen, setPhoneInviteOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [coupon, setCoupon] = useState('');
  const [inquiry, setInquiry] = useState('');
  const [busy, setBusy] = useState(false);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'display', label: t('settings.tabDisplay') },
    { id: 'account', label: t('settings.tabAccount') },
  ];

  const currentLanguageLabel =
    preference === 'system' ? t('settings.languageSystem') : getLocaleLabel(preference);

  const changePassword = async () => {
    setBusy(true);
    try {
      await api.changePassword(pwCurrent, pwNext);
      setPwCurrent('');
      setPwNext('');
      setPwOpen(false);
      Alert.alert(t('settings.pwChanged'), t('settings.pwChangedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBusy(false);
    }
  };

  const applyCoupon = async () => {
    setBusy(true);
    try {
      const { stars } = await api.redeemCoupon(coupon);
      setCoupon('');
      setCouponOpen(false);
      Alert.alert(t('settings.couponDone'), t('settings.couponDoneMessage', { stars }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBusy(false);
    }
  };

  const sendInquiry = async () => {
    setBusy(true);
    try {
      await api.submitCustomerInquiry(inquiry);
      setInquiry('');
      setInquiryOpen(false);
      Alert.alert(t('settings.inquirySent'), t('settings.inquirySentMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBusy(false);
    }
  };

  const handleAppUpdate = async () => {
    if (Platform.OS === 'web') return;

    if (!isAppUpdateEnabled()) {
      Alert.alert(t('settings.appUpdate'), t('settings.updateDisabled'), [
        {
          text: t('settings.downloadLatestApk'),
          onPress: () => {
            void openLatestApkDownload();
          },
        },
        { text: t('header.cancel'), style: 'cancel' },
      ]);
      return;
    }

    setBusy(true);
    try {
      const { status, message } = await checkForAppUpdate();
      if (status === 'available') {
        Alert.alert(t('settings.updateApplied'), t('settings.updateAppliedMessage'));
        await applyAppUpdate();
        return;
      }
      if (status === 'upToDate') {
        Alert.alert(t('settings.updateUpToDate'), t('settings.updateUpToDateMessage'), [
          {
            text: t('settings.downloadLatestApk'),
            onPress: () => {
              void openLatestApkDownload();
            },
          },
          { text: t('common.continue'), style: 'default' },
        ]);
        return;
      }
      Alert.alert(t('settings.updateFailed'), message ?? t('group.failed'));
    } catch (e: unknown) {
      Alert.alert(t('settings.updateFailed'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t('settings.deleteTitle'), t('settings.deleteMessage'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccount'),
        style: 'destructive',
        onPress: async () => {
          await api.deleteAccount();
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <AppScreen title={t('settings.title')} showBack>
      <View style={styles.tabRow}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.tab, tab === item.id && styles.tabActive]}
            onPress={() => setTab(item.id)}
          >
            <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'display' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <SettingsMenuRow
            label={t('settings.language')}
            value={currentLanguageLabel}
            onPress={() => setLangOpen(true)}
          />
          {Platform.OS !== 'web' ? (
            <SettingsMenuRow
              label={t('settings.appUpdate')}
              value={t('settings.appVersion', { version: getAppVersionLabel() })}
              onPress={handleAppUpdate}
            />
          ) : null}
        </View>
      ) : (
        <ScrollView style={styles.account} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <SettingsMenuRow label={t('settings.changePassword')} onPress={() => setPwOpen(true)} />
          <SettingsMenuRow label={t('settings.coupon')} onPress={() => setCouponOpen(true)} />
          <SettingsMenuRow label={t('settings.inquiry')} onPress={() => setInquiryOpen(true)} />
          <SettingsMenuRow
            label={t('settings.phoneVerify')}
            value={profile?.phoneVerified ? t('settings.phoneVerifyDone') : t('settings.phoneVerifyPending')}
            onPress={() => setPhoneVerifyOpen(true)}
          />
          <SettingsMenuRow
            label={t('settings.phoneInviteSettings')}
            onPress={() => setPhoneInviteOpen(true)}
          />
          <SettingsMenuRow label={t('settings.deleteAccount')} onPress={confirmDelete} destructive />
        </ScrollView>
      )}

      <AppModal visible={langOpen} animationType="fade" onRequestClose={() => setLangOpen(false)} variant="center">
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.language')}</Text>
            <PremiumIconButton
              icon="close"
              onPress={() => setLangOpen(false)}
              variant="soft"
              color={theme.colors.textMuted}
              accessibilityLabel={t('header.cancel')}
            />
          </View>
          <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
            {LANGUAGE_OPTIONS.map((option) => {
              const selected = preference === option.value;
              const label = option.label ?? t('settings.languageSystem');
              return (
                <Pressable
                  key={option.value}
                  style={[styles.langRow, selected && styles.langRowActive]}
                  onPress={async () => {
                    await setPreference(option.value);
                    setLangOpen(false);
                  }}
                >
                  <Text style={[styles.langText, selected && styles.langTextActive]}>{label}</Text>
                  {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.primaryLight} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </AppModal>

      <AppModal visible={pwOpen} animationType="fade" onRequestClose={() => setPwOpen(false)} variant="center">
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.changePassword')}</Text>
            <PremiumIconButton
              icon="close"
              onPress={() => setPwOpen(false)}
              variant="soft"
              color={theme.colors.textMuted}
              accessibilityLabel={t('header.cancel')}
            />
          </View>
          <TextInput
            style={styles.input}
            value={pwCurrent}
            onChangeText={setPwCurrent}
            placeholder={t('settings.currentPassword')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={pwNext}
            onChangeText={setPwNext}
            placeholder={t('settings.newPassword')}
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
          />
          <PremiumButton title={t('settings.changePassword')} onPress={changePassword} loading={busy} />
        </View>
      </AppModal>

      <AppModal visible={couponOpen} animationType="fade" onRequestClose={() => setCouponOpen(false)} variant="center">
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.coupon')}</Text>
            <PremiumIconButton
              icon="close"
              onPress={() => setCouponOpen(false)}
              variant="soft"
              color={theme.colors.textMuted}
              accessibilityLabel={t('header.cancel')}
            />
          </View>
          <TextInput
            style={styles.input}
            value={coupon}
            onChangeText={setCoupon}
            placeholder={t('settings.couponPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
          />
          <PremiumButton title={t('settings.couponApply')} onPress={applyCoupon} loading={busy} variant="outline" />
        </View>
      </AppModal>

      <AppModal visible={inquiryOpen} animationType="fade" onRequestClose={() => setInquiryOpen(false)} variant="center">
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('settings.inquiry')}</Text>
            <PremiumIconButton
              icon="close"
              onPress={() => setInquiryOpen(false)}
              variant="soft"
              color={theme.colors.textMuted}
              accessibilityLabel={t('header.cancel')}
            />
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={inquiry}
            onChangeText={setInquiry}
            placeholder={t('settings.inquiryPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
          <PremiumButton title={t('settings.inquirySend')} onPress={sendInquiry} loading={busy} variant="outline" />
        </View>
      </AppModal>

      <PhoneVerifyModal visible={phoneVerifyOpen} onClose={() => setPhoneVerifyOpen(false)} />
      <PhoneInviteSettingsModal visible={phoneInviteOpen} onClose={() => setPhoneInviteOpen(false)} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: theme.colors.tint.strong },
  tabText: { color: theme.colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primaryLight, fontWeight: '800' },
  section: { gap: theme.spacing.xs },
  sectionTitle: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  account: { flex: 1 },
  modalSheet: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    maxHeight: '80%',
    minWidth: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  modalTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', flex: 1 },
  langList: { maxHeight: 420 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLight,
  },
  langRowActive: { backgroundColor: 'rgba(79,107,149,0.08)' },
  langText: { color: theme.colors.text, fontSize: 16, fontWeight: '500' },
  langTextActive: { color: theme.colors.primaryDark, fontWeight: '700' },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
