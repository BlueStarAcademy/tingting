import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumButton } from '@/components/PremiumButton';
import { TabPage } from '@/components/TabPage';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function MyScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLocale();

  return (
    <TabPage contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>{profile?.displayName ?? t('my.traveler')}</Text>
      <Text style={styles.email}>{profile?.email}</Text>
      <View style={styles.spacer} />
      <PremiumButton title={t('my.plus')} onPress={() => router.push('/subscription')} />
      <PremiumButton title={t('my.starShop')} onPress={() => router.push('/shop')} variant="outline" />
      <PremiumButton title={t('my.createGroup')} onPress={() => router.push('/group/create')} variant="outline" />
    </TabPage>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 0, gap: theme.spacing.md, alignItems: 'stretch' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  email: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  spacer: { height: theme.spacing.md },
});
