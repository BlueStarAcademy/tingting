import { ScrollView, StyleSheet } from 'react-native';
import { EmptyState } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

/** The browser has no device gallery; keeps expo-media-library out of the web bundle. */
export function PhoneAlbumTab(_props: { active: boolean }) {
  const { t } = useLocale();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <EmptyState icon="phone-portrait-outline" title={t('album.phone.webOnlyTitle')} message={t('album.phone.webOnlyMessage')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xl },
});
