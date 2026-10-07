import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { theme } from '@/constants/theme';
import { now } from '@/lib/perf';

type Props = {
  value: number;
  /** bipolar sliders run -1..1 with the thumb resting in the middle */
  bipolar?: boolean;
  /**
   * At most once per animation frame while dragging (the latest value wins), and once more with the
   * final value before `onComplete`. `inputAt` is when the touch that produced it arrived.
   */
  onChange: (value: number, inputAt: number) => void;
  onComplete: () => void;
  label?: string;
};

const THUMB = 22;

export function EditorSlider({ value, bipolar = false, onChange, onComplete, label }: Props) {
  const [width, setWidth] = useState(0);
  // the thumb follows the finger locally; the (heavier) parent update is coalesced per frame
  const [dragValue, setDragValue] = useState<number | null>(null);
  const widthRef = useRef(0);
  const startRef = useRef(0);
  const handlers = useRef({ onChange, onComplete, bipolar });
  handlers.current = { onChange, onComplete, bipolar };
  const pending = useRef<{ value: number; at: number } | null>(null);
  const lastSent = useRef<number | null>(null);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const minOf = (isBipolar: boolean) => (isBipolar ? -1 : 0);
  const toX = (v: number) => ((v - minOf(bipolar)) / (1 - minOf(bipolar))) * widthRef.current;

  const responder = useRef(
    (() => {
      const fromX = (x: number) => {
        const isBipolar = handlers.current.bipolar;
        const min = minOf(isBipolar);
        const w = widthRef.current || 1;
        const v = min + (Math.min(w, Math.max(0, x)) / w) * (1 - min);
        if (isBipolar && Math.abs(v) < 0.04) return 0;
        return Math.round(v * 100) / 100;
      };
      const send = () => {
        raf.current = 0;
        const p = pending.current;
        pending.current = null;
        if (p) handlers.current.onChange(p.value, p.at);
      };
      const input = (x: number) => {
        const v = fromX(x);
        if (v === lastSent.current) return;
        lastSent.current = v;
        setDragValue(v);
        // keep the time of the first touch the next frame will reflect
        pending.current = { value: v, at: pending.current?.at ?? now() };
        if (!raf.current) raf.current = requestAnimationFrame(send);
      };
      const end = () => {
        cancelAnimationFrame(raf.current);
        send();
        lastSent.current = null;
        setDragValue(null);
        handlers.current.onComplete();
      };
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX - THUMB / 2;
          startRef.current = x;
          input(x);
        },
        onPanResponderMove: (_evt, g) => input(startRef.current + g.dx),
        onPanResponderRelease: end,
        onPanResponderTerminate: end,
      });
    })(),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.max(0, e.nativeEvent.layout.width - THUMB);
    widthRef.current = w;
    setWidth(w);
  };

  const shownValue = dragValue ?? value;
  const thumbX = width > 0 ? toX(shownValue) : 0;
  const zeroX = width > 0 ? toX(0) : 0;
  const fillLeft = Math.min(zeroX, thumbX);
  const fillWidth = Math.abs(thumbX - zeroX);
  const shown = Math.round(shownValue * 100);

  return (
    <View style={styles.row}>
      {label ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
      <View style={styles.track} onLayout={onLayout} {...responder.panHandlers}>
        <View style={styles.rail} pointerEvents="none" />
        <View style={[styles.fill, { left: THUMB / 2 + fillLeft, width: fillWidth }]} pointerEvents="none" />
        {bipolar ? <View style={[styles.zero, { left: THUMB / 2 + zeroX - 1 }]} pointerEvents="none" /> : null}
        <View style={[styles.thumb, { left: thumbX }]} pointerEvents="none">
          <View style={styles.thumbDot} />
        </View>
      </View>
      <Text style={styles.value}>{bipolar && shown > 0 ? `+${shown}` : shown}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 44 },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', width: 64 },
  track: { flex: 1, height: 44, justifyContent: 'center' },
  rail: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  fill: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: theme.colors.primaryLight },
  zero: { position: 'absolute', width: 2, height: 10, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.5)' },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  thumbDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  value: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', width: 34, textAlign: 'right' },
});
