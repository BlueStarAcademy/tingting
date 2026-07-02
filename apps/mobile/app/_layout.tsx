import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/hooks/useAuth';
import { LocaleProvider } from '@/hooks/useLocale';
import { WebMobileFrame } from '@/components/WebMobileFrame';
import { WebLayoutFix } from '@/components/WebLayoutFix';
import { MainTabBar } from '@/components/MainTabBar';
import { View } from 'react-native';
import { theme } from '@/constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <WebLayoutFix />
      <WebMobileFrame>
        <LocaleProvider>
          <AuthProvider>
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
          </AuthProvider>
        </LocaleProvider>
      </WebMobileFrame>
    </SafeAreaProvider>
  );
}
