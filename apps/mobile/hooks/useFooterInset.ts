import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFooterBottomInset } from '@/constants/layout';

/** Bottom inset so modals/overlays sit above the tab bar (and optional group chat bubble). */
export function useFooterInset(withGroupChat = false): number {
  const insets = useSafeAreaInsets();
  return getFooterBottomInset({ safeAreaBottom: insets.bottom, withGroupChat });
}
