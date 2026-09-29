import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  View,
  Pressable,
  StyleSheet,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
  /** Tap backdrop to dismiss (default true except fullscreen) */
  dismissOnBackdrop?: boolean;
  sheetStyle?: StyleProp<ViewStyle>;
}

export function AppModal({
  visible,
  onRequestClose,
  children,
  variant = 'bottomSheet',
  animationType = 'slide',
  transparent = true,
  dismissOnBackdrop = variant !== 'fullscreen',
  sheetStyle,
}: Props) {
  const { footerInset, maxSheetHeight } = useBottomSheetLayout();

  const backdrop = dismissOnBackdrop ? (
    <Pressable style={styles.backdrop} onPress={onRequestClose} accessibilityRole="button" />
  ) : (
    <View style={styles.backdrop} />
  );

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      {variant === 'fullscreen' ? (
        <View style={styles.fullscreen}>{children}</View>
      ) : (
        <KeyboardAvoidingView
          style={[styles.root, variant === 'center' && styles.rootCenter]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {backdrop}
          {variant === 'center' ? (
            <View style={[styles.centerSheet, { maxHeight: maxSheetHeight * 0.92 }, sheetStyle]}>{children}</View>
          ) : (
            <View style={[styles.bottomSheet, { paddingBottom: footerInset, maxHeight: maxSheetHeight }, sheetStyle]}>
              {children}
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
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
    backgroundColor: 'rgba(30,15,20,0.45)',
  },
  bottomSheet: {
    alignSelf: 'stretch',
    flexShrink: 1,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  centerSheet: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    ...Platform.select({
      android: { elevation: 12 },
      default: {},
    }),
  },
  fullscreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
