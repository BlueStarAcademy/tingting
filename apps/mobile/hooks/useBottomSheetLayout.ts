import { useWindowDimensions } from 'react-native';
import { MODAL_TOP_CLEARANCE } from '@/constants/layout';
import { useFooterInset } from '@/hooks/useFooterInset';

/** Footer inset + max height for bottom sheets (tab bar / TingTalk bubble aware). */
export function useBottomSheetLayout(withGroupChat = false) {
  const footerInset = useFooterInset(withGroupChat);
  const { height: windowHeight } = useWindowDimensions();
  const maxSheetHeight = Math.max(240, windowHeight - footerInset - MODAL_TOP_CLEARANCE);
  return { footerInset, maxSheetHeight };
}
