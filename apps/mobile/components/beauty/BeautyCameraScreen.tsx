import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { ArLiveOverlay, createArFeed } from '@/components/ar/ArLiveOverlay';
import { EditorSlider } from '@/components/editor/EditorSlider';
import { ChipRow, ItemRow } from '@/components/editor/panels';
import { AR_EFFECTS, getArEffect } from '@/lib/ar/effects';
import { AR_SPRITES } from '@/lib/ar/sprites';
import { translate as t } from '@/lib/i18n/translations';
import {
  CAMERA_FILTERS,
  DEFAULT_CAMERA_LOOK,
  loadCameraLook,
  matchingPreset,
  presetLook,
  saveCameraLook,
  type CameraLook,
} from '@/lib/editor/look';
import { BEAUTY_ITEMS, BEAUTY_PRESETS, EMPTY_BEAUTY, FACE_ONLY_BEAUTY, type BeautyKey } from '@/lib/editor/types';
import { pickGalleryPhoto } from '@/lib/pick-photo';
import { loadCameraSafeMode, saveCameraSafeMode, takeUnfinishedLiveSession, type CameraSafeMode } from '@/lib/camera-safe-mode';
import { breadcrumb, logEvent, onJsStall } from '@/lib/diagnostics';
import { LiveBeautyView, type LiveBeautyHandle, type LiveMode, type TrackingStatus } from './LiveBeautyView';

type Props = {
  onCapture: (uri: string, look: CameraLook) => void;
  onClose: () => void;
};

type Aspect = '3:4' | '1:1' | '9:16';
type FlashSetting = 'off' | 'auto' | 'on';
type Panel = 'beauty' | 'filter' | 'sticker' | null;
type ItemKey = BeautyKey | 'lip' | 'blush';

const TIMERS = [0, 3, 5, 10] as const;
const ASPECTS: Aspect[] = ['3:4', '1:1', '9:16'];
const ZOOMS = [
  { value: 0, label: '1x' },
  { value: 0.12, label: '2x' },
];

const ITEMS: { key: ItemKey; label: string; icon: string; bipolar?: boolean }[] = [
  ...BEAUTY_ITEMS,
  { key: 'lip', label: '립 틴트', icon: '💋' },
  { key: 'blush', label: '블러셔', icon: '🌸' },
];
const FACE_ITEMS: ItemKey[] = [...FACE_ONLY_BEAUTY, 'lip', 'blush'];

const NO_LOOK: CameraLook = { beauty: EMPTY_BEAUTY, lip: 0, blush: 0, filterId: null, filterIntensity: 0, effectId: null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function itemValue(look: CameraLook, key: ItemKey): number {
  if (key === 'lip') return look.lip;
  if (key === 'blush') return look.blush;
  return look.beauty[key];
}

function withItem(look: CameraLook, key: ItemKey, v: number): CameraLook {
  if (key === 'lip') return { ...look, lip: v };
  if (key === 'blush') return { ...look, blush: v };
  return { ...look, beauty: { ...look.beauty, [key]: v } };
}

/** Center-crops the shot to the chosen frame so the result matches what the preview showed. */
async function cropToAspect(photo: { uri: string; width: number; height: number }, aspect: Aspect): Promise<string> {
  const target = aspect === '1:1' ? 1 : aspect === '3:4' ? 3 / 4 : 9 / 16;
  const { width, height } = photo;
  if (!width || !height) return photo.uri;
  const current = width / height;
  if (Math.abs(current - target) / target < 0.015) return photo.uri;
  const cropW = current > target ? Math.round(height * target) : width;
  const cropH = current > target ? height : Math.round(width / target);
  const out = await ImageManipulator.manipulateAsync(
    photo.uri,
    [{ crop: { originX: Math.round((width - cropW) / 2), originY: Math.round((height - cropH) / 2), width: cropW, height: cropH } }],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG },
  );
  return out.uri;
}

export function BeautyCameraScreen({ onCapture, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const liveRef = useRef<LiveBeautyHandle | null>(null);

  const [facing, setFacing] = useState<CameraType>('front');
  const [flash, setFlash] = useState<FlashSetting>('off');
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(0);
  const [aspect, setAspect] = useState<Aspect>('3:4');
  const [grid, setGrid] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [look, setLook] = useState<CameraLook>(DEFAULT_CAMERA_LOOK);
  const [panel, setPanel] = useState<Panel>(null);
  const [item, setItem] = useState<ItemKey>('smooth');
  const [comparing, setComparing] = useState(false);
  const [mode, setMode] = useState<LiveMode>('starting');
  const [tracking, setTracking] = useState<TrackingStatus>('off');
  const [safe, setSafe] = useState<CameraSafeMode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const blink = useRef(new Animated.Value(0)).current;
  const arFeed = useRef(createArFeed());
  const alive = useRef(true);
  const lookRef = useRef(look);
  lookRef.current = look;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const safeRef = useRef(safe);
  safeRef.current = safe;

  useEffect(() => {
    loadCameraLook().then((saved) => alive.current && setLook(saved));
    Promise.all([loadCameraSafeMode(), takeUnfinishedLiveSession()]).then(([saved, unfinished]) => {
      logEvent('camera_mount', { safe: saved.on, reason: saved.reason, unfinished });
      if (!alive.current) return;
      if (unfinished && !saved.on) {
        const next = { on: true, reason: 'unfinished' };
        saveCameraSafeMode(next);
        setSafe(next);
        setNotice('지난번에 카메라가 멈춘 것 같아 안전 모드로 열었어요');
      } else {
        setSafe(saved);
      }
    });
    return () => {
      alive.current = false;
      breadcrumb('camera_unmount');
    };
  }, []);

  const enableSafeMode = useCallback((reason: string) => {
    if (!alive.current || safeRef.current?.on) return;
    const next = { on: true, reason };
    logEvent('camera_safe_mode_auto', { reason }, 'warn');
    saveCameraSafeMode(next);
    setSafe(next);
    setNotice('카메라가 버거워해서 안전 모드로 바꿨어요');
  }, []);

  const toggleSafeMode = () => {
    const next = { on: !safe?.on, reason: 'user' };
    breadcrumb('camera_safe_mode_toggle', { on: next.on });
    saveCameraSafeMode(next);
    setSafe(next);
    setNotice(next.on ? '안전 모드: 미리보기는 원본, 찍으면 효과가 적용돼요' : '실시간 뷰티를 다시 켰어요');
  };

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // A long JS freeze while the live pipeline runs means this phone can't sustain it.
  useEffect(
    () =>
      onJsStall((ms) => {
        if (ms >= 1500 && modeRef.current !== 'fallback' && safeRef.current && !safeRef.current.on) {
          enableSafeMode('js stall');
        }
      }),
    [enableSafeMode],
  );

  const onModeChange = useCallback(
    (m: LiveMode, reason?: string) => {
      setMode(m);
      if (m === 'fallback' && reason?.startsWith('stall:')) enableSafeMode(reason);
    },
    [enableSafeMode],
  );

  const persist = useCallback(() => saveCameraLook(lookRef.current), []);
  const changeLook = (next: CameraLook, save = true) => {
    setLook(next);
    if (save) saveCameraLook(next);
  };

  const shoot = async () => {
    const camera = liveRef.current;
    if (!camera) return;
    setBusy(true);
    const useScreenFlash = facing === 'front' && flash === 'on';
    try {
      if (useScreenFlash) {
        setScreenFlash(true);
        await sleep(350);
      }
      const photo = await camera.takePicture();
      setScreenFlash(false);
      blink.setValue(1);
      Animated.timing(blink, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      if (!photo) throw new Error('사진을 만들지 못했어요');
      const uri = await cropToAspect(photo, aspect);
      onCapture(uri, lookRef.current);
    } catch (e) {
      Alert.alert('촬영 실패', e instanceof Error ? e.message : '다시 시도해 주세요');
    } finally {
      if (alive.current) {
        setScreenFlash(false);
        setBusy(false);
      }
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
    if (uri) onCapture(uri, lookRef.current);
  };

  const box = useMemo(() => {
    const w = screenW;
    const h = aspect === '9:16' ? (w * 16) / 9 : (w * 4) / 3;
    const top = aspect === '9:16' ? Math.max(0, Math.min(insets.top, screenH - h)) : insets.top + 56;
    const band = aspect === '1:1' ? (h - w) / 2 : 0;
    return { w, h, top, band };
  }, [aspect, screenW, screenH, insets.top]);

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
  const flashOrder: FlashSetting[] = facing === 'front' ? ['off', 'on'] : ['off', 'auto', 'on'];
  const cameraFlash = facing === 'front' ? 'off' : flash;
  const activePreset = matchingPreset(look);
  const currentItem = ITEMS.find((i) => i.key === item) ?? ITEMS[0];
  const arEffect = getArEffect(look.effectId);

  const safeOn = !!safe?.on;
  const status = (() => {
    if (safeOn) return { text: '안전 모드 · 찍으면 뷰티·스티커가 적용돼요', live: false };
    if (mode === 'starting') return { text: '카메라 준비 중…', live: false };
    if (mode === 'fallback') return { text: '미리보기는 원본 · 찍으면 뷰티가 적용돼요', live: false };
    if (tracking === 'tracking') return { text: '실시간 뷰티 · 얼굴 인식됨', live: true };
    if (tracking === 'searching') return { text: '실시간 뷰티 · 얼굴 찾는 중', live: true };
    if (tracking === 'unavailable') return { text: '실시간 피부·필터 · 얼굴형은 찍은 뒤 적용', live: true };
    return { text: '실시간 뷰티', live: true };
  })();
  const faceHint =
    FACE_ITEMS.includes(item) && (mode !== 'live' || tracking === 'unavailable')
      ? '이 항목은 찍은 뒤 결과 화면에서 적용돼요'
      : FACE_ITEMS.includes(item) && tracking !== 'tracking'
        ? '얼굴이 화면에 잘 보이게 해 주세요'
        : null;
  const arHint = (() => {
    if (!arEffect) return t('ar.pickHint');
    if (!arEffect.ambient || arEffect.trigger) {
      if (mode === 'fallback' || tracking === 'unavailable') return t('ar.afterShot');
      if (tracking !== 'tracking') return t('ar.showFace');
    }
    return arEffect.trigger ? t(`ar.trigger.${arEffect.trigger}`) : t('ar.multiFace');
  })();

  const renderPanel = () => {
    if (panel === 'beauty') {
      return (
        <View style={styles.panel}>
          <ChipRow
            options={BEAUTY_PRESETS.map((p) => ({ key: p.id, label: p.id === 'none' ? '초기화' : p.label }))}
            value={activePreset}
            onChange={(id) => changeLook(presetLook(id, look))}
          />
          <EditorSlider
            value={itemValue(look, item)}
            bipolar={currentItem.bipolar}
            label={currentItem.label}
            onChange={(v) => changeLook(withItem(look, item, v), false)}
            onComplete={persist}
          />
          {faceHint ? <Text style={styles.panelHint}>{faceHint}</Text> : null}
          <ItemRow
            items={ITEMS.map((i) => ({ key: i.key, label: i.label, icon: i.icon, active: Math.abs(itemValue(look, i.key)) > 0.001 }))}
            selected={item}
            onSelect={(k) => setItem(k as ItemKey)}
          />
        </View>
      );
    }
    if (panel === 'filter') {
      return (
        <View style={styles.panel}>
          {look.filterId ? (
            <EditorSlider
              value={look.filterIntensity}
              label="강도"
              onChange={(v) => changeLook({ ...look, filterIntensity: v }, false)}
              onComplete={persist}
            />
          ) : (
            <View style={{ height: 44 }} />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <FilterChip label="원본" color="#9CA3AF" on={!look.filterId} onPress={() => changeLook({ ...look, filterId: null })} />
            {CAMERA_FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                label={f.label}
                color={f.color}
                on={look.filterId === f.id}
                onPress={() =>
                  changeLook({ ...look, filterId: f.id, filterIntensity: look.filterId === f.id ? look.filterIntensity : 0.8 })
                }
              />
            ))}
          </ScrollView>
        </View>
      );
    }
    if (panel === 'sticker') {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelHint} numberOfLines={1}>
            {arHint}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.arRow}>
            <ArThumb label={t('ar.none')} on={!look.effectId} onPress={() => changeLook({ ...look, effectId: null })} />
            {AR_EFFECTS.map((e) => (
              <ArThumb
                key={e.id}
                label={t(e.labelKey)}
                image={AR_SPRITES[e.thumb].src}
                badge={!!e.trigger}
                on={look.effectId === e.id}
                onPress={() => changeLook({ ...look, effectId: e.id })}
              />
            ))}
          </ScrollView>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.previewBox, { top: box.top, width: box.w, height: box.h }]}>
        {safe ? (
          <LiveBeautyView
            ref={liveRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            flash={cameraFlash}
            zoom={zoom}
            ratio={aspect === '9:16' ? '16:9' : '4:3'}
            look={comparing ? NO_LOOK : look}
            live={!safe.on}
            onModeChange={onModeChange}
            onTrackingChange={setTracking}
            onFaces={(faces, bufferWidth) => {
              arFeed.current = { faces, bufferWidth, at: Date.now() };
            }}
          />
        ) : null}
        {look.effectId && !comparing && !safeOn && mode === 'live' ? (
          <ArLiveOverlay effectId={look.effectId} feed={arFeed} width={box.w} height={box.h} />
        ) : null}
        {box.band > 0 ? (
          <>
            <View pointerEvents="none" style={[styles.band, { top: 0, height: box.band }]} />
            <View pointerEvents="none" style={[styles.band, { bottom: 0, height: box.band }]} />
          </>
        ) : null}
        {grid ? (
          <View pointerEvents="none" style={[styles.grid, { top: box.band, bottom: box.band }]}>
            <View style={[styles.gridV, { left: '33.33%' }]} />
            <View style={[styles.gridV, { left: '66.66%' }]} />
            <View style={[styles.gridH, { top: '33.33%' }]} />
            <View style={[styles.gridH, { top: '66.66%' }]} />
          </View>
        ) : null}
        {comparing ? (
          <View pointerEvents="none" style={[styles.compareBadge, { top: box.band + 12 }]}>
            <Text style={styles.compareBadgeText}>원본</Text>
          </View>
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.blink, { opacity: blink }]} />
      </View>

      {countdown > 0 ? (
        <View pointerEvents="none" style={styles.countdown}>
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      ) : null}

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <RoundIcon icon="close" onPress={onClose} />
        <View style={styles.topTools}>
          <RoundIcon
            icon={flashIcon}
            onPress={() => setFlash((f) => flashOrder[(Math.max(0, flashOrder.indexOf(f)) + 1) % flashOrder.length])}
          />
          <Pressable onPress={() => setTimer((t) => TIMERS[(TIMERS.indexOf(t) + 1) % TIMERS.length])} style={styles.roundBtn}>
            <Ionicons name="timer-outline" size={20} color="#fff" />
            {timer > 0 ? <Text style={styles.timerBadge}>{timer}</Text> : null}
          </Pressable>
          <Pressable onPress={() => setAspect((a) => ASPECTS[(ASPECTS.indexOf(a) + 1) % ASPECTS.length])} style={styles.aspectBtn}>
            <Text style={styles.aspectText}>{aspect}</Text>
          </Pressable>
          <RoundIcon icon={grid ? 'grid' : 'grid-outline'} onPress={() => setGrid((g) => !g)} />
        </View>
      </View>
      <View pointerEvents="box-none" style={[styles.statusRow, { top: insets.top + 58 }]}>
        <View pointerEvents="none" style={[styles.statusChip, status.live && styles.statusChipLive]}>
          <View style={[styles.statusDot, status.live && styles.statusDotLive]} />
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
        <Pressable
          onPress={toggleSafeMode}
          disabled={!safe}
          hitSlop={8}
          style={[styles.safeChip, safeOn && styles.safeChipOn]}
          accessibilityRole="switch"
          accessibilityState={{ checked: safeOn }}
        >
          <Ionicons name={safeOn ? 'shield-checkmark' : 'shield-outline'} size={13} color="#fff" />
          <Text style={styles.statusText}>{safeOn ? '안전 모드 켜짐' : '안전 모드'}</Text>
        </Pressable>
        {notice ? (
          <View pointerEvents="none" style={styles.noticeChip}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
        {renderPanel()}
        <View style={styles.modeRow}>
          <Pressable onPress={() => void fromGallery()} style={styles.galleryChip} hitSlop={6}>
            <Ionicons name="images-outline" size={16} color="#fff" />
          </Pressable>
          <View style={styles.zoomRow}>
            {ZOOMS.map((z) => (
              <Pressable key={z.label} onPress={() => setZoom(z.value)} style={[styles.zoomChip, zoom === z.value && styles.zoomChipOn]}>
                <Text style={[styles.zoomText, zoom === z.value && styles.zoomTextOn]}>{z.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPressIn={() => setComparing(true)}
            onPressOut={() => setComparing(false)}
            style={[styles.compareBtn, comparing && styles.compareBtnOn]}
          >
            <Ionicons name="git-compare-outline" size={16} color="#fff" />
            <Text style={styles.compareText}>비교</Text>
          </Pressable>
        </View>

        <View style={styles.shutterRow}>
          <SideButton icon="happy-outline" label="뷰티" on={panel === 'beauty'} onPress={() => setPanel((p) => (p === 'beauty' ? null : 'beauty'))} />
          <SideButton
            icon={look.effectId ? 'sparkles' : 'sparkles-outline'}
            label={t('ar.button')}
            on={panel === 'sticker'}
            onPress={() => setPanel((p) => (p === 'sticker' ? null : 'sticker'))}
          />
          <Pressable style={[styles.shutter, busy && { opacity: 0.6 }]} onPress={onShutter} disabled={busy}>
            {busy ? <ActivityIndicator color={theme.colors.primary} /> : <View style={styles.shutterInner} />}
          </Pressable>
          <SideButton
            icon="color-filter-outline"
            label="필터"
            on={panel === 'filter'}
            onPress={() => setPanel((p) => (p === 'filter' ? null : 'filter'))}
          />
          <Pressable onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))} style={styles.sideBtn}>
            <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      {screenFlash ? <View pointerEvents="none" style={styles.screenFlash} /> : null}
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

function SideButton({
  icon,
  label,
  on,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.modeBtn} hitSlop={6}>
      <Ionicons name={icon} size={24} color={on ? theme.colors.primaryLight : '#fff'} />
      <Text style={[styles.modeText, on && styles.modeTextOn]}>{label}</Text>
    </Pressable>
  );
}

function ArThumb({
  label,
  image,
  badge,
  on,
  onPress,
}: {
  label: string;
  image?: number;
  badge?: boolean;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.arItem}>
      <View style={[styles.arFrame, on && styles.arFrameOn]}>
        {image ? (
          <Image source={image} style={styles.arImage} resizeMode="contain" />
        ) : (
          <Ionicons name="ban-outline" size={24} color="rgba(255,255,255,0.75)" />
        )}
        {badge ? <View style={styles.arBadge} /> : null}
      </View>
      <Text style={[styles.filterText, on && styles.filterTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterChip({ label, color, on, onPress }: { label: string; color: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.filterItem}>
      <View style={[styles.filterDot, { backgroundColor: color }, on && styles.filterDotOn]} />
      <Text style={[styles.filterText, on && styles.filterTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
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
  previewBox: { position: 'absolute', left: 0, overflow: 'hidden', backgroundColor: '#000' },
  band: { position: 'absolute', left: 0, right: 0, backgroundColor: '#000' },
  grid: { position: 'absolute', left: 0, right: 0 },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' },
  blink: { ...StyleSheet.absoluteFill, backgroundColor: '#fff' },
  screenFlash: { ...StyleSheet.absoluteFill, backgroundColor: '#FFF8F0' },
  compareBadge: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  compareBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
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
  aspectBtn: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  timerBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '900',
  },
  statusRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 },
  safeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  safeChipOn: { backgroundColor: 'rgba(37,99,235,0.7)' },
  noticeChip: {
    maxWidth: '86%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  noticeText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  statusChipLive: { backgroundColor: 'rgba(224,96,126,0.55)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  statusDotLive: { backgroundColor: '#7CFFB2' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: { gap: 2, paddingBottom: 2 },
  panelHint: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  filterRow: { paddingHorizontal: 12, gap: 6, alignItems: 'flex-start' },
  filterItem: { alignItems: 'center', gap: 4, width: 54 },
  filterDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  filterDotOn: { borderColor: '#fff', borderWidth: 3 },
  filterText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  filterTextOn: { color: '#fff', fontWeight: '800' },
  arRow: { paddingHorizontal: 12, gap: 6, alignItems: 'flex-start', paddingTop: 4 },
  arItem: { alignItems: 'center', gap: 4, width: 60 },
  arFrame: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arFrameOn: { borderColor: theme.colors.primaryLight, backgroundColor: 'rgba(224,96,126,0.3)' },
  arImage: { width: 40, height: 40 },
  arBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD36E',
  },
  galleryChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  zoomRow: { flexDirection: 'row', gap: 6 },
  zoomChip: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  zoomChipOn: { backgroundColor: 'rgba(255,255,255,0.9)' },
  zoomText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  zoomTextOn: { color: '#111' },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  compareBtnOn: { backgroundColor: theme.colors.primary },
  compareText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 2 },
  modeBtn: { width: 52, alignItems: 'center', gap: 2 },
  modeText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },
  modeTextOn: { color: theme.colors.primaryLight, fontWeight: '800' },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primaryLight },
});
