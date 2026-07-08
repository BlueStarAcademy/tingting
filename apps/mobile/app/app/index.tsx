import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AppEntryRedirect } from '@/components/AppEntryRedirect';
import { requestWebFullscreen } from '@/lib/pwa';

/** Web `/app` — 랜딩에서 「체험하기」 진입 (PWA / 전체화면) */
export default function AppEntry() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      requestWebFullscreen();
    }
  }, []);

  return <AppEntryRedirect />;
}
