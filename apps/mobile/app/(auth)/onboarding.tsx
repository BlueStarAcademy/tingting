import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/** 레거시 /onboarding 경로 → 홈 (닉네임 모달은 전역 게이트에서 표시) */
export default function OnboardingScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/home');
  }, [router]);

  return null;
}
