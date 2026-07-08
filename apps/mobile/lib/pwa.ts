import { Platform } from 'react-native';

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

/** True when running as an installed/standalone web app (Android PWA or iOS home-screen). */
export function isStandaloneDisplay(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const fullscreen = window.matchMedia?.('(display-mode: fullscreen)')?.matches;
  const iosStandalone = window.navigator.standalone === true;
  return Boolean(media || fullscreen || iosStandalone);
}

export function isIosWeb(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listening = false;

function ensureInstallPromptListener() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || listening) return;
  listening = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

ensureInstallPromptListener();

/**
 * Enter the in-app experience as close to fullscreen/PWA as the browser allows.
 * - Already standalone → navigate in place
 * - Android Chrome install prompt → install then open /app
 * - Otherwise → navigate to /app (and optionally open a new window for desktop)
 */
export async function launchAppExperience(navigate: (path: string) => void): Promise<'standalone' | 'installed' | 'navigated' | 'ios-hint'> {
  ensureInstallPromptListener();

  if (isStandaloneDisplay()) {
    navigate('/app');
    return 'standalone';
  }

  if (deferredPrompt) {
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice.outcome === 'accepted') {
        navigate('/app');
        return 'installed';
      }
    } catch {
      // fall through to normal navigation
    }
  }

  if (isIosWeb() && !isStandaloneDisplay()) {
    navigate('/app');
    return 'ios-hint';
  }

  navigate('/app');
  return 'navigated';
}

/** Attempt Fullscreen API (Android Chrome tabs). No-ops if unsupported / blocked. */
export function requestWebFullscreen(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (document.fullscreenElement) return;
    if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => undefined);
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } catch {
    // ignore — browsers often require a later gesture
  }
}
