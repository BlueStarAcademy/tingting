import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface LogoutConfirmContextValue {
  requestLogout: () => void;
}

const LogoutConfirmContext = createContext<LogoutConfirmContextValue>({
  requestLogout: () => {},
});

export function LogoutConfirmProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const requestLogout = useCallback(() => setOpen(true), []);

  const close = useCallback(() => {
    if (!loggingOut) setOpen(false);
  }, [loggingOut]);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      setOpen(false);
      router.replace('/(auth)/login');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <LogoutConfirmContext.Provider value={{ requestLogout }}>
      {children}
      <AppModal visible={open} animationType="fade" onRequestClose={close} variant="center">
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('header.logout')}</Text>
          <Text style={styles.body}>{t('header.logoutConfirm')}</Text>
          <View style={styles.actions}>
            <PremiumButton
              title={t('header.cancel')}
              variant="outline"
              onPress={close}
              disabled={loggingOut}
              fullWidth={false}
              style={styles.button}
            />
            <PremiumButton
              title={t('header.logout')}
              variant="danger"
              onPress={confirmLogout}
              loading={loggingOut}
              fullWidth={false}
              style={styles.button}
            />
          </View>
        </View>
      </AppModal>
    </LogoutConfirmContext.Provider>
  );
}

export function useLogoutConfirm() {
  return useContext(LogoutConfirmContext);
}

const styles = StyleSheet.create({
  sheet: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    minWidth: 280,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
  },
});
