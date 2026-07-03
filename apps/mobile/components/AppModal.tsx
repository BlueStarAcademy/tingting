import type { ReactNode } from 'react';
import { Modal, View, Pressable, StyleSheet, Platform } from 'react-native';
import { useBottomSheetLayout } from '@/hooks/useBottomSheetLayout';
import { theme } from '@/constants/theme';

type Variant = 'bottomSheet' | 'center' | 'fullscreen';

interface Props {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  variant?: Variant;
  animationType?: 'none' | 'slide' | 'fade';
  transparent?: boolean;
  /** Group detail: clear tab bar + TingTalk bubble */
  withGroupChat?: boolean;
  /** Tap backdrop to dismiss (default true except fullscreen) */
  dismissOnBackdrop?: boolean;
}

export function AppModal({
  visible,
  onRequestClose,
  children,
  variant = 'bottomSheet',
  animationType = 'slide',
  transparent = true,
  withGroupChat = false,
  dismissOnBackdrop = variant !== 'fullscreen',
}: Props) {
  const { footerInset, maxSheetHeight } = useBottomSheetLayout(withGroupChat);

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      {variant === 'fullscreen' ? (
        <View style={[styles.fullscreen, { paddingBottom: footerInset }]}>{children}</View>
      ) : (
        <View style={[styles.root, variant === 'center' && styles.rootCenter]}>
          {dismissOnBackdrop ? (
            <Pressable style={styles.backdrop} onPress={onRequestClose} accessibilityRole="button" />
          ) : (
            <View style={styles.backdrop} />
          )}
          {variant === 'bottomSheet' ? (
            <View
              style={[styles.bottomSheet, { marginBottom: footerInset, maxHeight: maxSheetHeight }]}
            >
              {children}
            </View>
          ) : (
            <View style={[styles.centerSheet, { maxHeight: maxSheetHeight * 0.85 }]}>
              {children}
            </View>
          )}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 200,
    ...Platform.select({
      web: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 },
    }),
  },
  rootCenter: {
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomSheet: {
    alignSelf: 'stretch',
    zIndex: 201,
    flexShrink: 1,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
  },
  centerSheet: {
    alignSelf: 'stretch',
    zIndex: 201,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    zIndex: 200,
  },
});
