import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/hooks/useAuth';
import { LogoutConfirmProvider } from '@/hooks/useLogoutConfirm';
import { LocaleProvider } from '@/hooks/useLocale';
import { AppShell } from '@/components/AppShell';
import { WebLayoutFix } from '@/components/WebLayoutFix';
import { MainTabBar } from '@/components/MainTabBar';
import { UpdateChecker } from '@/components/UpdateChecker';
import { OnboardingNicknameGate } from '@/components/auth/OnboardingNicknameGate';
import { View } from 'react-native';
import { theme } from '@/constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WebLayoutFix />
      <AppShell>
        <LocaleProvider>
          <AuthProvider>
            <LogoutConfirmProvider>
              <UpdateChecker />
              <OnboardingNicknameGate />
              <StatusBar style="dark" />
              <View style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.colors.background, flex: 1 },
                  }}
                />
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50 }}>
                  <MainTabBar />
                </View>
              </View>
            </LogoutConfirmProvider>
          </AuthProvider>
        </LocaleProvider>
      </AppShell>
    </SafeAreaProvider>
  );
}
