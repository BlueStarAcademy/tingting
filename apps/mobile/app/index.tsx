import { Platform } from 'react-native';
import { LandingPage } from '@/components/landing/LandingPage';
import { AppEntryRedirect } from '@/components/AppEntryRedirect';

/** Web `/` = 홈페이지, Native `/` = 앱 진입 (인증 리다이렉트) */
export default function Index() {
  if (Platform.OS === 'web') {
    return <LandingPage />;
  }
  return <AppEntryRedirect />;
}
