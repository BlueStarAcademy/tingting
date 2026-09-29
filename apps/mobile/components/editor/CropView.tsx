import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import type { CropBox } from '@/lib/editor/image';
import type { BaseImage } from '@/lib/editor/types';

type Props = {
  base: BaseImage;
  busy: boolean;
  onTransform: (op: { rotate?: number; flip?: 'horizontal' | 'vertical' }) => void;
  onApply: (crop: CropBox | null) => void;
  onCancel: () => void;
};

type Corner = 'tl' | 'tr' | 'bl' | 'br';
type Box = { x: number; y: number; w: number; h: number };

const FULL: Box = { x: 0, y: 0, w: 1, h: 1 };
const MIN = 0.08;
const HANDLE_SLOP = 32;

const RATIOS: { id: string; label: string; ratio: number | null }[] = [
  { id: 'free', label: '자유', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function centeredBox(rn: number): Box {
  let w = 1;
  let h = 1 / rn;
  if (h > 1) {
    h = 1;
    w = rn;
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

function resize(start: Box, corner: Corner, dx: number, dy: number, rn: number | null): Box {
  const left = corner === 'tl' || corner === 'bl';
  const top = corner === 'tl' || corner === 'tr';
  const sx = left ? -1 : 1;
  const sy = top ? -1 : 1;
  const ax = left ? start.x + start.w : start.x;
  const ay = top ? start.y + start.h : start.y;
  const px = clamp((left ? start.x : start.x + start.w) + dx, 0, 1);
  const py = clamp((top ? start.y : start.y + start.h) + dy, 0, 1);
  let w = Math.max(MIN, (px - ax) * sx);
  let h = Math.max(MIN, (py - ay) * sy);
  const maxW = sx > 0 ? 1 - ax : ax;
  const maxH = sy > 0 ? 1 - ay : ay;
  if (rn) {
    if (w / h > rn) w = h * rn;
    else h = w / rn;
    if (w > maxW) {
      w = maxW;
      h = w / rn;
    }
    if (h > maxH) {
      h = maxH;
      w = h * rn;
    }
  }
  w = Math.min(w, maxW);
  h = Math.min(h, maxH);
  return { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w, h };
}

export function CropView({ base, busy, onTransform, onApply, onCancel }: Props) {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [box, setBox] = useState<Box>(FULL);
  const [ratioId, setRatioId] = useState('free');

  const fit = (() => {
    if (!area.width || !area.height) return { x: 0, y: 0, width: 0, height: 0 };
    const s = Math.min(area.width / base.width, area.height / base.height);
    const width = base.width * s;
    const height = base.height * s;
    return { x: (area.width - width) / 2, y: (area.height - height) / 2, width, height };
  })();

  const normRatio = (id: string) => {
    const r = RATIOS.find((item) => item.id === id)?.ratio ?? null;
    return r ? r * (base.height / base.width) : null;
  };

  useEffect(() => {
    setBox(ratioId === 'free' ? FULL : centeredBox(normRatio(ratioId) ?? 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.uri]);

  const live = useRef({ box, fit, rn: normRatio(ratioId) });
  live.current = { box, fit, rn: normRatio(ratioId) };
  const drag = useRef<{ mode: Corner | 'move' | null; start: Box }>({ mode: null, start: FULL });

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { box: b, fit: f } = live.current;
        const tx = evt.nativeEvent.locationX - f.x;
        const ty = evt.nativeEvent.locationY - f.y;
        const corners: Record<Corner, [number, number]> = {
          tl: [b.x * f.width, b.y * f.height],
          tr: [(b.x + b.w) * f.width, b.y * f.height],
          bl: [b.x * f.width, (b.y + b.h) * f.height],
          br: [(b.x + b.w) * f.width, (b.y + b.h) * f.height],
        };
        let mode: Corner | 'move' | null = null;
        let best = HANDLE_SLOP;
        (Object.keys(corners) as Corner[]).forEach((key) => {
          const [cx, cy] = corners[key];
          const d = Math.hypot(tx - cx, ty - cy);
          if (d < best) {
            best = d;
            mode = key;
          }
        });
        if (!mode) {
          const inside =
            tx >= b.x * f.width && tx <= (b.x + b.w) * f.width && ty >= b.y * f.height && ty <= (b.y + b.h) * f.height;
          mode = inside ? 'move' : null;
        }
        drag.current = { mode, start: b };
      },
      onPanResponderMove: (_evt, g) => {
        const { fit: f, rn } = live.current;
        const { mode, start } = drag.current;
        if (!mode || !f.width || !f.height) return;
        const dx = g.dx / f.width;
        const dy = g.dy / f.height;
        if (mode === 'move') {
          setBox({ ...start, x: clamp(start.x + dx, 0, 1 - start.w), y: clamp(start.y + dy, 0, 1 - start.h) });
        } else {
          setBox(resize(start, mode, dx, dy, rn));
        }
      },
    }),
  ).current;

  const pickRatio = (id: string) => {
    setRatioId(id);
    const rn = normRatio(id);
    setBox(rn ? centeredBox(rn) : FULL);
  };

  const apply = () => {
    const isFull = box.x < 0.002 && box.y < 0.002 && box.w > 0.996 && box.h > 0.996;
    onApply(isFull ? null : { x: box.x, y: box.y, width: box.w, height: box.h });
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  const bx = fit.x + box.x * fit.width;
  const by = fit.y + box.y * fit.height;
  const bw = box.w * fit.width;
  const bh = box.h * fit.height;

  return (
    <View style={styles.root}>
      <View style={styles.area} onLayout={onLayout} {...responder.panHandlers}>
        {fit.width > 0 ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: fit.x, top: fit.y, width: fit.width, height: fit.height }}>
            <Image source={{ uri: base.uri }} style={{ width: fit.width, height: fit.height }} />
          </View>
        ) : null}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.dim, { left: fit.x, top: fit.y, width: fit.width, height: by - fit.y }]} />
          <View style={[styles.dim, { left: fit.x, top: by + bh, width: fit.width, height: fit.y + fit.height - by - bh }]} />
          <View style={[styles.dim, { left: fit.x, top: by, width: bx - fit.x, height: bh }]} />
          <View style={[styles.dim, { left: bx + bw, top: by, width: fit.x + fit.width - bx - bw, height: bh }]} />
          <View style={[styles.box, { left: bx, top: by, width: bw, height: bh }]}>
            <View style={[styles.gridV, { left: '33.33%' }]} />
            <View style={[styles.gridV, { left: '66.66%' }]} />
            <View style={[styles.gridH, { top: '33.33%' }]} />
            <View style={[styles.gridH, { top: '66.66%' }]} />
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
        </View>
        {busy ? (
          <View style={styles.busy} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ratios}>
        {RATIOS.map((r) => (
          <Pressable key={r.id} onPress={() => pickRatio(r.id)} style={[styles.ratio, ratioId === r.id && styles.ratioOn]}>
            <Text style={[styles.ratioText, ratioId === r.id && styles.ratioTextOn]}>{r.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.tools}>
        <ToolButton icon="refresh-outline" label="왼쪽 회전" flip onPress={() => onTransform({ rotate: -90 })} disabled={busy} />
        <ToolButton icon="refresh-outline" label="오른쪽 회전" onPress={() => onTransform({ rotate: 90 })} disabled={busy} />
        <ToolButton icon="swap-horizontal" label="좌우 반전" onPress={() => onTransform({ flip: 'horizontal' })} disabled={busy} />
        <ToolButton icon="swap-vertical" label="상하 반전" onPress={() => onTransform({ flip: 'vertical' })} disabled={busy} />
      </View>

      <View style={styles.footer}>
        <Pressable onPress={onCancel} style={styles.footerBtn} hitSlop={8}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.footerTitle}>자르기 · 회전</Text>
        <Pressable onPress={apply} style={styles.footerBtn} hitSlop={8} disabled={busy}>
          <Ionicons name="checkmark" size={26} color={theme.colors.primaryLight} />
        </Pressable>
      </View>
    </View>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
  disabled,
  flip,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  flip?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.tool, disabled && { opacity: 0.4 }]}>
      <Ionicons name={icon} size={22} color="#fff" style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  area: { flex: 1, margin: 16 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  box: { position: 'absolute', borderWidth: 1.5, borderColor: '#FFFFFF' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.55)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.55)' },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: '#FFFFFF' },
  tl: { left: -3, top: -3, borderLeftWidth: 4, borderTopWidth: 4 },
  tr: { right: -3, top: -3, borderRightWidth: 4, borderTopWidth: 4 },
  bl: { left: -3, bottom: -3, borderLeftWidth: 4, borderBottomWidth: 4 },
  br: { right: -3, bottom: -3, borderRightWidth: 4, borderBottomWidth: 4 },
  busy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  ratios: { paddingHorizontal: 16, gap: 8, paddingVertical: 6 },
  ratio: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ratioOn: { backgroundColor: theme.colors.primary },
  ratioText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  ratioTextOn: { color: '#FFFFFF' },
  tools: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  tool: { alignItems: 'center', gap: 4, minWidth: 68 },
  toolText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  footerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  footerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
