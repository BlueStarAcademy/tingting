import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton } from '@/components/PremiumButton';
import { StarChip } from '@/components/StarChip';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function MyScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{profile?.displayName ?? '여행자'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        {profile ? <StarChip stars={profile.stars} onPress={() => router.push('/shop')} /> : null}
        <View style={styles.spacer} />
        <PremiumButton title="TingTing Plus" onPress={() => router.push('/subscription')} />
        <PremiumButton title="스타 상점" onPress={() => router.push('/shop')} variant="outline" />
        <PremiumButton title="그룹 만들기" onPress={() => router.push('/group/create')} variant="outline" />
        <PremiumButton title="Sign Out" onPress={async () => { await signOut(); router.replace('/(auth)/login'); }} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'flex-start' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  email: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  spacer: { height: theme.spacing.md },
});
