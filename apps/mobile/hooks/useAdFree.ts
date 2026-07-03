import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { isAdFreePurchased, setAdFreePurchased } from '@/lib/ad-store';

export function useAdFree() {
  const [adFree, setAdFree] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isAdFreePurchased().then((v) => {
      setAdFree(v);
      setLoading(false);
    });
  }, []);

  const purchase = useCallback(async () => {
    await setAdFreePurchased();
    setAdFree(true);
  }, []);

  return { adFree, loading, purchase };
}

/**
 * Simulated rewarded ad. In production, replace with real ad SDK call.
 * Returns true if the user watched the ad successfully.
 */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      '광고 시청',
      '광고를 시청하면 이어서 도전할 수 있습니다.',
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        {
          text: '광고 보기',
          onPress: () => {
            setTimeout(() => resolve(true), 1500);
          },
        },
      ],
      { cancelable: false },
    );
  });
}
