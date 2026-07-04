import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';

export const isSupabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

export type AuthRedirectRoute = 'auth-callback' | 'reset-password';

export function getAuthRedirectUrl(route: AuthRedirectRoute): string {
  const path = `/${route}`;
  if (Platform.OS === 'web') {
    const origin = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return origin ? `${origin}${path}` : path;
  }
  return Linking.createURL(route);
}

function paramsFromUrl(urlToParse: string): URLSearchParams {
  const parsed = new URL(urlToParse);
  const params = new URLSearchParams(parsed.search);
  if (parsed.hash.startsWith('#')) {
    const hashParams = new URLSearchParams(parsed.hash.slice(1));
    hashParams.forEach((value, key) => params.set(key, value));
  }
  return params;
}

export class EmailVerifiedButSessionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailVerifiedButSessionFailedError';
  }
}

export async function handleSupabaseAuthUrl(urlToHandle: string): Promise<{ type?: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  const params = paramsFromUrl(urlToHandle);
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type') ?? undefined;

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      const isCodeVerifierMissing =
        error.message?.includes('code verifier') ||
        error.message?.includes('code_verifier') ||
        error.message?.includes('invalid request') ||
        error.message?.includes('both auth code and code verifier');
      if (isCodeVerifierMissing) {
        throw new EmailVerifiedButSessionFailedError(error.message);
      }
      throw error;
    }
    return { type };
  }

  if (accessToken && refreshToken) {
    const { error } = await sb.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return { type };
  }

  if (type === 'signup' || type === 'email') {
    throw new EmailVerifiedButSessionFailedError('no_session_params');
  }

  throw new Error('No authentication parameters found in URL');
}
