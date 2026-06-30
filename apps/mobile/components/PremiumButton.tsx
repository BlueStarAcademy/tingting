import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline';
}

export function PremiumButton({ title, onPress, loading, variant = 'primary' }: Props) {
  if (variant === 'outline') {
    return (
      <Pressable style={styles.outline} onPress={onPress} disabled={loading}>
        {loading ? <ActivityIndicator color={theme.colors.primaryLight} /> : <Text style={styles.outlineText}>{title}</Text>}
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} disabled={loading} style={styles.wrap}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={styles.btn}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: theme.radius.md, overflow: 'hidden' },
  btn: { paddingVertical: 14, alignItems: 'center', borderRadius: theme.radius.md },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outline: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryLight,
  },
  outlineText: { color: theme.colors.primaryLight, fontSize: 16, fontWeight: '600' },
});
