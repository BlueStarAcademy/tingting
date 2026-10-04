import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

/** A small status pill: `show(text)` fades after a moment, `show(text, true)` stays with a spinner until cleared. */
export function useToast(): [ReactNode, (message: string | null, sticky?: boolean) => void] {
  const [state, setState] = useState<{ message: string; sticky: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string | null, sticky = false) => {
    if (timer.current) clearTimeout(timer.current);
    setState(message ? { message, sticky } : null);
    if (message && !sticky) timer.current = setTimeout(() => setState(null), 2600);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const node = state ? (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.pill, shadow('md')]}>
        {state.sticky ? <ActivityIndicator size="small" color="#fff" /> : null}
        <Text style={styles.text} numberOfLines={2}>
          {state.message}
        </Text>
      </View>
    </View>
  ) : null;
  return [node, show];
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 40 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '88%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(45,31,36,0.9)',
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
