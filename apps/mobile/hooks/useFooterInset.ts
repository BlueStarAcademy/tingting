import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Bottom inset for modal sheets (they render above the tab bar, so only the safe area matters). */
export function useFooterInset(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12);
}
