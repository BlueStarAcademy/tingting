import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { BEAUTY_PRESETS } from '@/lib/editor/types';
import { pickGalleryPhoto } from '@/lib/pick-photo';

export type CaptureLook = { beauty: string; filter: string | null };

type Props = {
  onCapture: (uri: string, look: CaptureLook) => void;
  onClose: () => void;
};

const QUICK_FILTERS: { id: string | null; label: string; color: string }[] = [
  { id: null, label: '원본', color: '#9CA3AF' },
  { id: 'ai_bbosyap', label: '뽀샵', color: '#FBCFE8' },
  { id: 'filter_peach_skin', label: '피치', color: '#FDBA74' },
  { id: 'filter_rosy', label: '로지', color: '#FB7185' },
  { id: 'filter_soft_clean', label: '소프트', color: '#FCE7F3' },
  { id: 'filter_kodak_gold', label: '코닥', color: '#FBBF24' },
  { id: 'filter_film', label: '필름', color: '#78716C' },
  { id: 'filter_jeju_sea', label: '바다', color: '#0EA5E9' },
  { id: 'filter_mono', label: '흑백', color: '#64748B' },
];

const TIMERS = [0, 3, 10] as const;
const FLASH_ORDER: FlashMode[] = ['off', 'auto', 'on'];

export function BeautyCameraScreen({ onCapture, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(0);
  const [grid, setGrid] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [beauty, setBeauty] = useState('natural');
  const [filter, setFilter] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const look = (): CaptureLook => ({ beauty, filter });

  const shoot = async () => {
    const camera = cameraRef.current;
    if (!camera) return;
    setBusy(true);
    try {
      const photo = await camera.takePictureAsync({ quality: 0.95 });
      if (photo?.uri) onCapture(photo.uri, look());
    } catch (e) {
      Alert.alert('촬영 실패', e instanceof Error ? e.message : '다시 시도해 주세요');
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const onShutter = () => {
    if (busy || countdown > 0) return;
    if (timer === 0) {
      void shoot();
      return;
    }
    let left: number = timer;
    setCountdown(left);
    const tick = setInterval(() => {
      left -= 1;
      if (!alive.current) {
        clearInterval(tick);
        return;
      }
      setCountdown(left);
      if (left <= 0) {
        clearInterval(tick);
        void shoot();
      }
    }, 1000);
  };

  const fromGallery = async () => {
    const uri = await pickGalleryPhoto({
      permissionTitle: '사진 접근 권한',
      permissionMessage: '설정에서 사진 접근을 허용해 주세요.',
    });
    if (uri) onCapture(uri, look());
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>카메라는 휴대폰 앱에서 사용할 수 있어요.</Text>
        <Pressable onPress={onClose} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>확인</Text>
        </Pressable>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={42} color={theme.colors.primary} />
        <Text style={styles.permissionText}>사진을 찍으려면 카메라 권한이 필요해요.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>카메라 허용</Text>
        </Pressable>
        <Pressable onPress={() => void fromGallery()} style={styles.linkBtn}>
          <Text style={styles.linkText}>갤러리에서 고르기</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.linkBtn}>
          <Text style={styles.linkText}>닫기</Text>
        </Pressable>
      </View>
    );
  }

  const flashIcon = flash === 'on' ? 'flash' : flash === 'auto' ? 'flash-outline' : 'flash-off-outline';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        zoom={zoom}
        mirror={facing === 'front'}
        animateShutter
      />
      {grid ? (
        <View pointerEvents="none" style={styles.grid}>
          <View style={[styles.gridV, { left: '33.33%' }]} />
          <View style={[styles.gridV, { left: '66.66%' }]} />
          <View style={[styles.gridH, { top: '33.33%' }]} />
          <View style={[styles.gridH, { top: '66.66%' }]} />
        </View>
      ) : null}
      {countdown > 0 ? (
        <View pointerEvents="none" style={styles.countdown}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : null}

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <RoundIcon icon="close" onPress={onClose} />
        <View style={styles.topTools}>
          <RoundIcon icon={flashIcon} onPress={() => setFlash((f) => FLASH_ORDER[(FLASH_ORDER.indexOf(f) + 1) % FLASH_ORDER.length])} />
          <Pressable onPress={() => setTimer((t) => TIMERS[(TIMERS.indexOf(t) + 1) % TIMERS.length])} style={styles.roundBtn}>
            <Ionicons name="timer-outline" size={20} color="#fff" />
            {timer > 0 ? <Text style={styles.timerBadge}>{timer}</Text> : null}
          </Pressable>
          <RoundIcon icon={grid ? 'grid' : 'grid-outline'} onPress={() => setGrid((g) => !g)} />
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.zoomRow}>
          {[0, 0.15, 0.35].map((z, i) => (
            <Pressable key={z} onPress={() => setZoom(z)} style={[styles.zoomChip, zoom === z && styles.zoomChipOn]}>
              <Text style={[styles.zoomText, zoom === z && styles.zoomTextOn]}>{['1x', '2x', '3x'][i]}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {BEAUTY_PRESETS.map((p) => (
            <Pressable key={p.id} onPress={() => setBeauty(p.id)} style={[styles.chip, beauty === p.id && styles.chipOn]}>
              <Text style={[styles.chipText, beauty === p.id && styles.chipTextOn]}>{p.id === 'none' ? '뷰티 끔' : p.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {QUICK_FILTERS.map((f) => (
            <Pressable key={f.label} onPress={() => setFilter(f.id)} style={styles.filterItem}>
              <View style={[styles.filterDot, { backgroundColor: f.color }, filter === f.id && styles.filterDotOn]} />
              <Text style={[styles.filterText, filter === f.id && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.note}>뷰티·필터는 찍은 뒤 편집 화면에서 바로 적용돼요</Text>

        <View style={styles.shutterRow}>
          <Pressable onPress={() => void fromGallery()} style={styles.sideBtn}>
            <Ionicons name="images-outline" size={24} color="#fff" />
          </Pressable>
          <Pressable style={[styles.shutter, busy && { opacity: 0.6 }]} onPress={onShutter} disabled={busy}>
            {busy ? <ActivityIndicator color={theme.colors.primary} /> : <View style={styles.shutterInner} />}
          </Pressable>
          <Pressable onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.sideBtn}>
            <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RoundIcon({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.roundBtn} hitSlop={6}>
      <Ionicons name={icon} size={20} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
  },
  permissionText: { color: theme.colors.text, textAlign: 'center', fontSize: 15, lineHeight: 22 },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  linkBtn: { padding: 8 },
  linkText: { color: theme.colors.textMuted, fontWeight: '600' },
  grid: { ...StyleSheet.absoluteFill },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' },
  countdown: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  countdownText: {
    color: '#fff',
    fontSize: 96,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 12,
  },
  topBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTools: { flexDirection: 'row', gap: 8 },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '900',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 10,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  zoomRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  zoomChip: {
    width: 38,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  zoomChipOn: { backgroundColor: 'rgba(255,255,255,0.9)' },
  zoomText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  zoomTextOn: { color: '#111' },
  chipRow: { paddingHorizontal: 14, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  chipOn: { backgroundColor: theme.colors.primary },
  chipText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: '#fff', fontWeight: '800' },
  filterItem: { alignItems: 'center', gap: 4, width: 48 },
  filterDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  filterDotOn: { borderColor: '#fff', transform: [{ scale: 1.1 }] },
  filterText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  note: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center' },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 4 },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: theme.colors.primaryLight },
});
