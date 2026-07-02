export const MAIN_TAB_BAR_HEIGHT = 62;
export const MOBILE_MAX_WIDTH = 430;
export const GROUP_CHAT_BUBBLE_HEIGHT = 50;
export const GROUP_CHAT_BUBBLE_MARGIN = 12;
/** Space above bottom sheets so content is not clipped at the top */
export const MODAL_TOP_CLEARANCE = 48;

/** Main tab bar + safe area — use for bottom sheets and modals on tab screens */
export function getMainTabBarBottomInset(safeAreaBottom = 0): number {
  return MAIN_TAB_BAR_HEIGHT + Math.max(safeAreaBottom, 8);
}

/** Bottom clearance so floating UI sits above the TingTalk bubble + tab bar */
export function getGroupChatBubbleBottomInset(safeAreaBottom = 0): number {
  return (
    MAIN_TAB_BAR_HEIGHT +
    Math.max(safeAreaBottom, 6) +
    GROUP_CHAT_BUBBLE_MARGIN +
    GROUP_CHAT_BUBBLE_HEIGHT
  );
}

export type FooterInsetOptions = {
  safeAreaBottom?: number;
  /** Group detail screen: tab bar + TingTalk bubble */
  withGroupChat?: boolean;
};

/** Unified footer clearance for modals and bottom overlays */
export function getFooterBottomInset(options: FooterInsetOptions = {}): number {
  const { safeAreaBottom = 0, withGroupChat = false } = options;
  return withGroupChat
    ? getGroupChatBubbleBottomInset(safeAreaBottom)
    : getMainTabBarBottomInset(safeAreaBottom);
}
