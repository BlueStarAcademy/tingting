import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocale } from '@/hooks/useLocale';

interface Props {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function KakaoLoginButton({ onPress, loading, disabled }: Props) {
  const { t } = useLocale();

  return (
    <Pressable
      style={[styles.button, (loading || disabled) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color="#3C1E1E" />
      ) : (
        <Text style={styles.label}>{t('auth.kakaoLogin')}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FEE500',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    color: '#3C1E1E',
    fontSize: 16,
    fontWeight: '800',
  },
});
