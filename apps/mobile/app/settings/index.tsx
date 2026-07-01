import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import type { LocalePreference } from '@/lib/i18n/translations';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

type SettingsTab = 'display' | 'account';

const LANG_OPTIONS: { value: LocalePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.languageSystem' },
  { value: 'ko', labelKey: 'settings.languageKo' },
  { value: 'en', labelKey: 'settings.languageEn' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference, t } = useLocale();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('display');
  const [langOpen, setLangOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNext, setPwNext] = useState('');
  const [coupon, setCoupon] = useState('');
  const [inquiry, setInquiry] = useState('');

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'display', label: t('settings.tabDisplay') },
    { id: 'account', label: t('settings.tabAccount') },
  ];

  const changePassword = async () => {
    try {
      await api.changePassword(pwCurrent, pwNext);
      setPwCurrent('');
      setPwNext('');
      Alert.alert(t('settings.pwChanged'), t('settings.pwChangedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const applyCoupon = async () => {
    try {
      const { stars } = await api.redeemCoupon(coupon);
      setCoupon('');
      Alert.alert(t('settings.couponDone'), t('settings.couponDoneMessage', { stars }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  const sendInquiry = async () => {
    try {
      await api.submitCustomerInquiry(inquiry);
      setInquiry('');
      Alert.alert(t('settings.inquirySent'), t('settings.inquirySentMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
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
          <Text style={styles.label}>{t('settings.language')}</Text>
          <Pressable style={styles.dropdown} onPress={() => setLangOpen(true)}>
            <Text style={styles.dropdownText}>
              {t(LANG_OPTIONS.find((o) => o.value === preference)?.labelKey ?? 'settings.languageSystem')}
            </Text>
          </Pressable>
          <Text style={styles.hint}>{t('settings.languageHint')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.account} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('settings.changePassword')}</Text>
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
          <PremiumButton title={t('settings.changePassword')} onPress={changePassword} />

          <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>{t('settings.coupon')}</Text>
          <TextInput
            style={styles.input}
            value={coupon}
            onChangeText={setCoupon}
            placeholder={t('settings.couponPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
          />
          <PremiumButton title={t('settings.couponApply')} onPress={applyCoupon} variant="outline" />

          <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>{t('settings.inquiry')}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={inquiry}
            onChangeText={setInquiry}
            placeholder={t('settings.inquiryPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
          <PremiumButton title={t('settings.inquirySend')} onPress={sendInquiry} variant="outline" />

          <View style={{ marginTop: theme.spacing.xl }}>
            <PremiumButton title={t('settings.deleteAccount')} onPress={confirmDelete} />
          </View>
        </ScrollView>
      )}

      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setLangOpen(false)} />
        <View style={styles.modalSheet}>
          {LANG_OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              style={styles.opt}
              onPress={async () => {
                await setPreference(o.value);
                setLangOpen(false);
              }}
            >
              <Text style={styles.optText}>{t(o.labelKey)}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
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
  account: { flex: 1 },
  label: { color: theme.colors.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  hint: { color: theme.colors.textMuted, fontSize: 13, marginTop: theme.spacing.sm },
  dropdown: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  dropdownText: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginBottom: theme.spacing.sm,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  modalBg: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  opt: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceLight },
  optText: { color: theme.colors.text, fontSize: 16 },
});
