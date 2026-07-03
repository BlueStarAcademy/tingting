import { Platform } from 'react-native';
import type { Href } from 'expo-router';

type BackRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
};

const DEFAULT_FALLBACK: Href = '/(tabs)/home';

/** Web `/` is the marketing landing; `/app` runs auth entry redirect. */
export const APP_ENTRY_HREF: Href = Platform.OS === 'web' ? '/app' : '/';

export function safeBack(router: BackRouter, fallback: Href = DEFAULT_FALLBACK): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
