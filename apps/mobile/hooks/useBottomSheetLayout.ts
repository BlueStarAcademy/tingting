import { useWindowDimensions } from 'react-native';
import { MODAL_TOP_CLEARANCE } from '@/constants/layout';
import { useFooterInset } from '@/hooks/useFooterInset';

/** Footer inset + max height for bottom sheets. */
export function useBottomSheetLayout() {
  const footerInset = useFooterInset();
  const { height: windowHeight } = useWindowDimensions();
  const maxSheetHeight = Math.max(240, windowHeight - MODAL_TOP_CLEARANCE);
  return { footerInset, maxSheetHeight };
}
