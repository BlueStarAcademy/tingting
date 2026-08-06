import { useCallback, useEffect, useState } from 'react';
import { isAdminProfile } from '@tingting/shared';
import { isAdFreePurchased, setAdFreePurchased } from '@/lib/ad-store';
import { showRewardedAd, watchAdForReward, type AdPlacement } from '@/lib/rewarded-ad';
import { useAuth } from '@/hooks/useAuth';

export type { AdPlacement };

export function useAdFree() {
  const { profile } = useAuth();
  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const adminFree = isAdminProfile(profile);
  const adFree = adminFree || purchased;

  useEffect(() => {
    isAdFreePurchased().then((v) => {
      setPurchased(v);
      setLoading(false);
    });
  }, []);

  const purchase = useCallback(async () => {
    await setAdFreePurchased();
    setPurchased(true);
  }, []);

  const watchAd = useCallback(
    (placement: AdPlacement) => watchAdForReward(placement, adFree),
    [adFree],
  );

  return { adFree, loading, purchase, watchAd };
}

export { showRewardedAd, watchAdForReward };
