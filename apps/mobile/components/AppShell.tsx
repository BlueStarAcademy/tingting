import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { WebMobileFrame } from '@/components/WebMobileFrame';

const FULL_WIDTH_WEB_ROUTES = ['/', '/app'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const useFullWidth =
    Platform.OS === 'web' && FULL_WIDTH_WEB_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}?`));

  if (useFullWidth) {
    return <>{children}</>;
  }

  return <WebMobileFrame>{children}</WebMobileFrame>;
}

export function shouldShowMainTabBar(pathname: string): boolean {
  if (pathname === '/' || pathname === '/app') return false;
  if (pathname.includes('(auth)')) return false;
  return true;
}
