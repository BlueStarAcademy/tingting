import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { NicknameSetupModal } from '@/components/auth/NicknameSetupModal';

/** 첫 로그인/가입 후 닉네임 설정 모달 — 완료 전까지 홈 진입을 막지 않고 오버레이로 표시 */
export function OnboardingNicknameGate() {
  const router = useRouter();
  const { session, profile, loading, refresh } = useAuth();

  const visible = !loading && !!session && !!profile && !profile.onboardingComplete;

  const handleComplete = async (displayName: string) => {
    await api.completeOnboarding(displayName);
    await refresh();
    router.replace('/(tabs)/home');
  };

  if (!profile) return null;

  return <NicknameSetupModal visible={visible} profile={profile} onComplete={handleComplete} />;
}
