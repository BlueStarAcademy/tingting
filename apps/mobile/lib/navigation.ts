import type { Href } from 'expo-router';

type BackRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
};

const DEFAULT_FALLBACK: Href = '/(tabs)/home';

export function safeBack(router: BackRouter, fallback: Href = DEFAULT_FALLBACK): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
