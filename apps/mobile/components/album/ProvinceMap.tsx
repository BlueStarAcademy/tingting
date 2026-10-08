import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRegion } from '@tingting/shared';
import { ProvinceMapCanvas } from '@/components/album/ProvinceMapCanvas';
import { useLocale } from '@/hooks/useLocale';
import { buildCityScene } from '@/lib/city-map-scene';
import { CITY_MAP_ATTRIBUTION, cityAt, clampViewport, fitViewport, getProvinceMap, type CityStat, type Viewport } from '@/lib/city-map';
import { theme } from '@/constants/theme';

const TAP_TOLERANCE_PX = 16;
const MAX_ZOOM = 6;

type WebPressEvent = {
  nativeEvent: { locationX?: number; locationY?: number; clientX?: number; clientY?: number };
  currentTarget?: { getBoundingClientRect?: () => { left: number; top: number } };
};

/** Press position inside the pressed view; react-native-web hands `onPress` a DOM click without `locationX`. */
function pressPoint(e: GestureResponderEvent): { x: number; y: number } {
  const { nativeEvent: n, currentTarget } = e as unknown as WebPressEvent;
  if (typeof n.locationX === 'number' && typeof n.locationY === 'number') return { x: n.locationX, y: n.locationY };
  const rect = currentTarget?.getBoundingClientRect?.();
  if (rect && typeof n.clientX === 'number' && typeof n.clientY === 'number') return { x: n.clientX - rect.left, y: n.clientY - rect.top };
  return { x: -1, y: -1 };
}

type Props = {
  regionCode: string;
  width: number;
  stats: Map<string, CityStat>;
  selected?: string | null;
  onCityPress: (cityCode: string) => void;
};

/** Province outline with its 시·군·구, sized to `width`; tap a municipality to open its folders. */
export function ProvinceMap({ regionCode, width, stats, selected, onCityPress }: Props) {
  const { t } = useLocale();
  const [zoomOpen, setZoomOpen] = useState(false);
  const map = getProvinceMap(regionCode);
  const height = map ? Math.round(Math.min(width * (map.h / map.w), width * 1.25)) : 0;
  const viewport = useMemo(() => (map ? fitViewport(map, width, height) : null), [map, width, height]);
  const scale = viewport ? width / viewport.w : 1;
  const nodes = useMemo(
    () => (viewport ? buildCityScene({ regionCode, viewport, scale, stats, selected }) : []),
    [regionCode, viewport, scale, stats, selected],
  );

  if (!map || !viewport) return null;

  const onPress = (e: GestureResponderEvent) => {
    const { x, y } = pressPoint(e);
    const code = cityAt(regionCode, viewport.x + x / scale, viewport.y + y / scale, TAP_TOLERANCE_PX / scale);
    if (code) onCityPress(code);
  };

  return (
    <View>
      <View style={[styles.frame, { width, height }]}>
        <Pressable onPress={onPress} style={StyleSheet.absoluteFill} accessibilityRole="imagebutton" accessibilityLabel={t('city.mapA11y', { region: getRegion(regionCode)?.name ?? '' })}>
          <View pointerEvents="none">
            <ProvinceMapCanvas nodes={nodes} viewport={viewport} width={width} height={height} />
          </View>
        </Pressable>
        <Pressable onPress={() => setZoomOpen(true)} hitSlop={8} style={styles.expand} accessibilityLabel={t('city.zoomOpen')}>
          <Ionicons name="expand-outline" size={18} color={theme.colors.primaryDark} />
        </Pressable>
      </View>
      <Text style={styles.attribution}>{CITY_MAP_ATTRIBUTION}</Text>
      {zoomOpen ? (
        <ProvinceZoomModal
          regionCode={regionCode}
          stats={stats}
          selected={selected}
          onClose={() => setZoomOpen(false)}
          onCityPress={(code) => {
            setZoomOpen(false);
            onCityPress(code);
          }}
        />
      ) : null}
    </View>
  );
}

function ProvinceZoomModal({
  regionCode,
  stats,
  selected,
  onClose,
  onCityPress,
}: {
  regionCode: string;
  stats: Map<string, CityStat>;
  selected?: string | null;
  onClose: () => void;
  onCityPress: (cityCode: string) => void;
}) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const map = getProvinceMap(regionCode)!;
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [vp, setVp] = useState<Viewport | null>(null);
  const base = useMemo(() => (size ? fitViewport(map, size.w, size.h) : null), [map, size]);
  const view = vp ?? base;
  const scale = size && view ? size.w / view.w : 1;
  const nodes = useMemo(
    () => (view ? buildCityScene({ regionCode, viewport: view, scale, stats, selected }) : []),
    [regionCode, view, scale, stats, selected],
  );

  // Live gesture transform; committed into the viewBox when the fingers lift so SVG re-renders crisp.
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const zs = useRef(new Animated.Value(1)).current;
  const live = useRef({ s: 1, px: 0, py: 0, fx: 0, fy: 0, active: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (!size || size.w !== width || size.h !== height)) {
      setSize({ w: width, h: height });
      setVp(null);
    }
  };

  const applyLive = useCallback(() => {
    if (!size) return;
    const { s, px, py, fx, fy } = live.current;
    const cx = size.w / 2;
    const cy = size.h / 2;
    tx.setValue((fx - cx) * (1 - s) + px);
    ty.setValue((fy - cy) * (1 - s) + py);
    zs.setValue(s);
  }, [size, tx, ty, zs]);

  const zoomTo = useCallback(
    (factor: number, fx: number, fy: number, panX = 0, panY = 0) => {
      const cur = viewRef.current;
      if (!cur || !base || !size) return;
      const k = size.w / cur.w;
      // Screen origin after the gesture shows what used to be at p0 before it.
      const p0x = fx - (fx + panX) / factor;
      const p0y = fy - (fy + panY) / factor;
      const next = clampViewport({ x: cur.x + p0x / k, y: cur.y + p0y / k, w: cur.w / factor, h: cur.h / factor }, base, MAX_ZOOM);
      setVp(next);
    },
    [base, size],
  );

  const commit = useCallback(() => {
    const { s, px, py, fx, fy } = live.current;
    live.current = { s: 1, px: 0, py: 0, fx: 0, fy: 0, active: 0 };
    if (s !== 1 || px !== 0 || py !== 0) zoomTo(s, fx, fy, px, py);
    tx.setValue(0);
    ty.setValue(0);
    zs.setValue(1);
  }, [tx, ty, zs, zoomTo]);

  const started = () => {
    live.current.active += 1;
  };
  const finished = () => {
    live.current.active -= 1;
    if (live.current.active <= 0) commit();
  };

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart((e) => {
      live.current.fx = e.focalX;
      live.current.fy = e.focalY;
      started();
    })
    .onUpdate((e) => {
      const cur = viewRef.current;
      if (!cur || !base) return;
      const zoom = base.w / cur.w;
      live.current.s = Math.min(MAX_ZOOM / zoom, Math.max(1 / zoom, e.scale));
      applyLive();
    })
    .onEnd(finished);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(6)
    .onStart(started)
    .onUpdate((e) => {
      live.current.px = e.translationX;
      live.current.py = e.translationY;
      applyLive();
    })
    .onEnd(finished);

  const tapAt = (x: number, y: number) => {
    const cur = viewRef.current;
    if (!cur || !size) return;
    const k = size.w / cur.w;
    const code = cityAt(regionCode, cur.x + x / k, cur.y + y / k, TAP_TOLERANCE_PX / k);
    if (code) onCityPress(code);
  };

  const doubleTap = Gesture.Tap()
    .runOnJS(true)
    .numberOfTaps(2)
    .onEnd((e, ok) => {
      if (ok) zoomTo(2, e.x, e.y);
    });
  const singleTap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(300)
    .onEnd((e, ok) => {
      if (ok) tapAt(e.x, e.y);
    });

  const gesture = Gesture.Race(Gesture.Exclusive(doubleTap, singleTap), Gesture.Simultaneous(pinch, pan));

  const zoomButton = (factor: number) => {
    if (size) zoomTo(factor, size.w / 2, size.h / 2);
  };
  const zoomed = Boolean(view && base && base.w / view.w > 1.01);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={[styles.modal, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <View style={styles.flex}>
            <Text style={styles.modalTitle}>{t('city.zoomTitle', { region: getRegion(regionCode)?.name ?? '' })}</Text>
            <Text style={styles.modalHint}>{t(Platform.OS === 'web' ? 'city.zoomHintWeb' : 'city.zoomHint')}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close} accessibilityLabel={t('common.close')}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>
        </View>
        <GestureDetector gesture={gesture}>
          <View style={styles.zoomArea} onLayout={onLayout} collapsable={false}>
            {size && view ? (
              <Animated.View
                pointerEvents="none"
                style={{ width: size.w, height: size.h, transform: [{ translateX: tx }, { translateY: ty }, { scale: zs }] }}
              >
                <ProvinceMapCanvas nodes={nodes} viewport={view} width={size.w} height={size.h} />
              </Animated.View>
            ) : null}
          </View>
        </GestureDetector>
        <View style={[styles.controls, { bottom: insets.bottom + 20 }]}>
          <Pressable onPress={() => zoomButton(1.6)} style={styles.controlBtn} accessibilityLabel={t('city.zoomIn')}>
            <Ionicons name="add" size={22} color={theme.colors.primaryDark} />
          </Pressable>
          <Pressable onPress={() => zoomButton(1 / 1.6)} style={styles.controlBtn} accessibilityLabel={t('city.zoomOut')}>
            <Ionicons name="remove" size={22} color={theme.colors.primaryDark} />
          </Pressable>
          {zoomed ? (
            <Pressable onPress={() => setVp(null)} style={styles.controlBtn} accessibilityLabel={t('city.zoomReset')}>
              <Ionicons name="scan-outline" size={19} color={theme.colors.primaryDark} />
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.attribution, styles.modalAttribution, { bottom: insets.bottom + 6 }]}>{CITY_MAP_ATTRIBUTION}</Text>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  frame: {
    alignSelf: 'center',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.mapBackground,
    borderWidth: 1,
    borderColor: theme.colors.mapFrameBorder,
  },
  expand: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.mapControlBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  attribution: { color: theme.colors.textSubtle, fontSize: 9.5, fontWeight: '600', textAlign: 'right', marginTop: 4 },
  modal: { flex: 1, backgroundColor: theme.colors.mapSeaStart },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  modalHint: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  zoomArea: { flex: 1, overflow: 'hidden' },
  controls: { position: 'absolute', right: 16, gap: 10 },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.mapControlBg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    elevation: 3,
    shadowColor: '#2D1F24',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  modalAttribution: { position: 'absolute', left: 16 },
});
