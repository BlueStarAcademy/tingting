export const MAIN_TAB_BAR_HEIGHT = 62;
export const MOBILE_MAX_WIDTH = 430;
/** Space above bottom sheets so content is not clipped at the top */
export const MODAL_TOP_CLEARANCE = 48;

/** Main tab bar + safe area — use for floating UI on tab screens */
export function getMainTabBarBottomInset(safeAreaBottom = 0): number {
  return MAIN_TAB_BAR_HEIGHT + Math.max(safeAreaBottom, 8);
}
