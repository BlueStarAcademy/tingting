import { useEffect } from 'react';
import { checkAndApplyUpdatesOnLaunch } from '@/lib/updates';

export function UpdateChecker() {
  useEffect(() => {
    void checkAndApplyUpdatesOnLaunch();
  }, []);

  return null;
}
