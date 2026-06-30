import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export function ScreenHeader({ title, showBack }: { title: string; showBack?: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  back: { width: 40 },
  title: { flex: 1, textAlign: 'center', color: theme.colors.text, fontSize: 18, fontWeight: '700' },
});
