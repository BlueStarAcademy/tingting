import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { UserProfile } from '@tingting/shared';
import { ProfileSection } from '@/components/ProfileSection';
import { AppModal } from '@/components/AppModal';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visible: boolean;
  profile: UserProfile | null;
  loading?: boolean;
  isSelf: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ProfileViewModal({ visible, profile, loading, isSelf, onClose, onUpdated }: Props) {
  const { t } = useLocale();

  return (
    <AppModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      variant="fullscreen"
      transparent={false}
      dismissOnBackdrop={false}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.title')}</Text>
          <PremiumIconButton
            icon="close"
            onPress={onClose}
            variant="soft"
            color={theme.colors.textMuted}
            accessibilityLabel={t('header.cancel')}
          />
        </View>
        {loading ? (
          <ActivityIndicator color={theme.colors.primaryLight} style={styles.loader} />
        ) : profile ? (
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <ProfileSection
              profile={profile}
              onUpdated={() => onUpdated?.()}
              readOnly={!isSelf}
              embedded
              detailsHidden={!isSelf && profile.profilePublic === false}
            />
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  body: { padding: theme.spacing.lg, paddingTop: 0 },
  loader: { marginTop: theme.spacing.xl },
});
