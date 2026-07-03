import { Platform } from 'react-native';
import { isHttpApiConfigured } from '@/lib/http-api';

export const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY?.trim() ?? '';

type KakaoAuthResult = { access_token: string };

type KakaoSdk = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Auth: {
    login: (opts: {
      success: (result: KakaoAuthResult) => void;
      fail: (error: unknown) => void;
    }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

export function isKakaoLoginConfigured(): boolean {
  return Platform.OS === 'web' && KAKAO_JS_KEY.length > 0 && isHttpApiConfigured();
}

async function waitForKakaoSdk(timeoutMs = 10000): Promise<KakaoSdk> {
  if (typeof window === 'undefined') {
    throw new Error('Kakao login is web-only');
  }

  const started = Date.now();
  while (!window.Kakao) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Kakao SDK failed to load');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return window.Kakao;
}

async function ensureKakaoReady(): Promise<KakaoSdk> {
  const kakao = await waitForKakaoSdk();
  if (!kakao.isInitialized()) {
    kakao.init(KAKAO_JS_KEY);
  }
  if (!kakao.isInitialized()) {
    throw new Error('Kakao SDK init failed');
  }
  return kakao;
}

export async function requestKakaoAccessToken(): Promise<string> {
  if (Platform.OS !== 'web') {
    throw new Error('Kakao login is only available on web');
  }

  const kakao = await ensureKakaoReady();

  return new Promise((resolve, reject) => {
    kakao.Auth.login({
      success: ({ access_token }) => {
        if (!access_token) {
          reject(new Error('Kakao access token missing'));
          return;
        }
        resolve(access_token);
      },
      fail: (error) => {
        reject(error instanceof Error ? error : new Error('Kakao login cancelled'));
      },
    });
  });
}
