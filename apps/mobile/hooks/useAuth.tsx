import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthSession, UserProfile } from '@tingting/shared';
import { api } from '@/lib/api';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthContextValue {
  session: AuthSession | null;
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const s = await api.getSession();
    setSession(s);
    if (s) {
      setProfile(await api.getProfile());
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const {
      data: { subscription },
    } = getSupabase()!.auth.onAuthStateChange(() => {
      refresh().catch(() => undefined);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await api.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
