import { useCallback, useEffect, useState } from 'react';
import { isAdFreePurchased, setAdFreePurchased } from '@/lib/ad-store';
import { showRewardedAd, watchAdForReward, type AdPlacement } from '@/lib/rewarded-ad';

export type { AdPlacement };

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

  const watchAd = useCallback(
    (placement: AdPlacement) => watchAdForReward(placement, adFree),
    [adFree],
  );

  return { adFree, loading, purchase, watchAd };
}

export { showRewardedAd, watchAdForReward };
