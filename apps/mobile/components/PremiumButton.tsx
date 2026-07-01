import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shadow } from '@/lib/ui';
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
      <Pressable
        style={({ pressed }) => [styles.outline, pressed && styles.pressed]}
        onPress={onPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.primaryLight} />
        ) : (
          <Text style={styles.outlineText}>{title}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.wrap, shadow('md'), pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.primary, theme.colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', borderRadius: theme.radius.md, overflow: 'hidden' },
  btn: { paddingVertical: 15, alignItems: 'center', borderRadius: theme.radius.md },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  outline: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.tint.border,
    backgroundColor: theme.colors.tint.soft,
  },
  outlineText: { color: theme.colors.primaryDark, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
});
