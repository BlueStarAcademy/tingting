import { useCallback, useRef, useState, useMemo, type ReactNode, type RefObject } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Switch,
  Pressable,
  ActivityIndicator,
  PanResponder,
  Platform,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getEditorFeaturesByCategory,
  getEditorFeature,
  isEditorFeatureUnlocked,
  getActiveFeaturePass,
  formatPassExpiry,
  type EditorFeature,
  type FeaturePass,
  type FeaturePassTier,
} from '@tingting/shared';
import { PremiumButton } from '@/components/PremiumButton';
import { FeaturePassModal } from '@/components/FeaturePassModal';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { useAdFree } from '@/hooks/useAdFree';
import { tabPill } from '@/lib/ui';
import {
  DEFAULT_ADJUSTMENTS,
  applyPhotoAdjust,
  getPhotoAdjustmentPreset,
  getPhotoEffectPreset,
  isPhotoTransformKey,
  normalizePhotoUri,
  type PhotoAdjustmentValues,
} from '@/lib/photo-effects';
import { capturePreviewUri, waitForPaintFrames } from '@/lib/capture-preview';
import { savePhotoWithFilename } from '@/lib/save-photo';
import { PhotoSaveSheet } from '@/components/PhotoSaveSheet';
import { theme } from '@/constants/theme';

interface Props {
  sourceUri?: string | null;
  onSourceChange?: (uri: string) => void;
  onPickAnother?: () => void;
  onSave?: (uri: string) => Promise<void>;
  saveLabel?: string;
  showPickAnother?: boolean;
  /** 사진 탭 등: 저장 시 기기 갤러리에 바로 저장 */
  saveToDevice?: boolean;
  /** 스티커 드래그 중 상위 ScrollView 잠금용 */
  onScrollLockChange?: (locked: boolean) => void;
}

type EditorTab = 'filter' | 'ai' | 'adjust' | 'sticker' | 'frame' | 'effect' | 'watermark';
type AdjustmentKey = keyof PhotoAdjustmentValues;

interface StickerInstance {
  id: string;
  featureId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const ADJUSTMENT_KEYS: AdjustmentKey[] = [
  'brightness',
  'contrast',
  'saturation',
  'warmth',
  'tint',
  'fade',
  'highlights',
  'shadows',
  'vignette',
  'grain',
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const STICKER_SCALE_MIN = 0.5;
const STICKER_SCALE_MAX = 2.4;

function DraggableSticker({
  sticker,
  emoji,
  isSelected,
  onSelect,
  onUpdate,
  onDragStart,
  onDragEnd,
  previewSize,
}: {
  sticker: StickerInstance;
  emoji: string;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, patch: Partial<StickerInstance>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  previewSize: { width: number; height: number };
}) {
  const posRef = useRef({ x: sticker.x, y: sticker.y });
  posRef.current = { x: sticker.x, y: sticker.y };

  const scaleRef = useRef(sticker.scale);
  scaleRef.current = sticker.scale;

  const sizeRef = useRef(previewSize);
  sizeRef.current = previewSize;

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const idRef = useRef(sticker.id);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const scaleStartRef = useRef(sticker.scale);
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);

  const endGesture = () => {
    draggingRef.current = false;
    resizingRef.current = false;
    onDragEndRef.current();
  };

  const shouldDrag = (dx: number, dy: number) => draggingRef.current || Math.abs(dx) > 2 || Math.abs(dy) > 2;

  const movePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => shouldDrag(gesture.dx, gesture.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        draggingRef.current = true;
        onDragStartRef.current();
        onSelectRef.current();
        dragStartRef.current = { x: posRef.current.x, y: posRef.current.y };
      },
      onPanResponderMove: (_, gesture) => {
        const start = dragStartRef.current;
        const size = sizeRef.current;
        onUpdateRef.current(idRef.current, {
          x: clamp(start.x + gesture.dx, -32, Math.max(size.width - 20, 0)),
          y: clamp(start.y + gesture.dy, -32, Math.max(size.height - 20, 0)),
        });
      },
      onPanResponderRelease: endGesture,
      onPanResponderTerminate: endGesture,
    }),
  ).current;

  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        resizingRef.current = true;
        onDragStartRef.current();
        onSelectRef.current();
        scaleStartRef.current = scaleRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        const delta = (gesture.dx + gesture.dy) / 2;
        onUpdateRef.current(idRef.current, {
          scale: clamp(scaleStartRef.current + delta / 90, STICKER_SCALE_MIN, STICKER_SCALE_MAX),
        });
      },
      onPanResponderRelease: endGesture,
      onPanResponderTerminate: endGesture,
    }),
  ).current;

  return (
    <View
      style={[
        styles.stickerContainer,
        {
          left: sticker.x,
          top: sticker.y,
          transform: [{ scale: sticker.scale }, { rotate: `${sticker.rotation}deg` }],
        },
      ]}
    >
      {isSelected ? <View style={styles.stickerSelection} pointerEvents="none" /> : null}
      <View
        {...movePanResponder.panHandlers}
        style={[styles.stickerBody, Platform.OS === 'web' ? styles.stickerOverlayWeb : null]}
      >
        <Text style={styles.stickerOverlayText}>{emoji}</Text>
      </View>
      {isSelected ? (
        <View
          {...resizePanResponder.panHandlers}
          style={[styles.stickerResizeHandle, Platform.OS === 'web' ? styles.stickerOverlayWeb : null]}
          accessibilityLabel="Resize sticker"
        >
          <Ionicons name="resize-outline" size={12} color={theme.colors.primaryDark} />
        </View>
      ) : null}
    </View>
  );
}

const getAdjustmentKey = (effectKey?: string): AdjustmentKey | null => {
  if (!effectKey) return null;
  if (effectKey === 'vignette_adjust') return 'vignette';
  if (effectKey === 'grain_adjust') return 'grain';
  return ADJUSTMENT_KEYS.includes(effectKey as AdjustmentKey) ? (effectKey as AdjustmentKey) : null;
};

const EDITOR_TABS: { id: EditorTab; labelKey: string }[] = [
  { id: 'filter', labelKey: 'editor.filters' },
  { id: 'ai', labelKey: 'editor.ai' },
  { id: 'adjust', labelKey: 'photos.adjust' },
  { id: 'sticker', labelKey: 'editor.stickers' },
  { id: 'frame', labelKey: 'photos.frames' },
  { id: 'effect', labelKey: 'photos.effects' },
  { id: 'watermark', labelKey: 'editor.watermark' },
];

export function PhotoEditorPanel({
  sourceUri,
  onSourceChange,
  onPickAnother,
  onSave,
  saveLabel,
  showPickAnother = true,
  saveToDevice = false,
  onScrollLockChange,
}: Props) {
  const { t, locale } = useLocale();
  const { refresh } = useAuth();
  const { watchAd } = useAdFree();
  const lang = locale === 'ko' ? 'ko' : 'en';
  const previewRef = useRef<View>(null);

  const [workingUri, setWorkingUri] = useState(sourceUri ?? '');
  const [passes, setPasses] = useState<FeaturePass[]>([]);
  const [saving, setSaving] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passModalFeature, setPassModalFeature] = useState<EditorFeature | null>(null);
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [adUnlockLoading, setAdUnlockLoading] = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [pendingSaveUri, setPendingSaveUri] = useState<string | null>(null);

  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [activeStickers, setActiveStickers] = useState<StickerInstance[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  const [adjustments, setAdjustments] = useState<PhotoAdjustmentValues>(DEFAULT_ADJUSTMENTS);
  const [activeAdjustmentKey, setActiveAdjustmentKey] = useState<AdjustmentKey>('brightness');
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 300 });
  const [watermark, setWatermark] = useState(true);
  const [activeTab, setActiveTab] = useState<EditorTab>('filter');
  const [stickerDragging, setStickerDragging] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const setStickerDragActive = useCallback(
    (active: boolean) => {
      setStickerDragging(active);
      onScrollLockChange?.(active);
    },
    [onScrollLockChange],
  );

  const reloadPasses = useCallback(() => {
    api.getFeaturePasses().then(setPasses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setWorkingUri(sourceUri ?? '');
      setActiveFilterId(null);
      setActiveFrameId(null);
      setActiveStickers([]);
      setSelectedStickerId(null);
      setActiveEffects([]);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      reloadPasses();
    }, [sourceUri, reloadPasses]),
  );

  const hasPhoto = Boolean(workingUri);

  const watermarkUnlocked = isEditorFeatureUnlocked(
    getEditorFeature('watermark_remove')!,
    passes,
  );
  const showWatermark = watermarkUnlocked ? watermark : true;

  const filterFeature = activeFilterId ? getEditorFeature(activeFilterId) : null;
  const frameFeature = activeFrameId ? getEditorFeature(activeFrameId) : null;
  const aiFeature = activeFilterId?.startsWith('ai_') ? filterFeature : null;

  const filterPreset = getPhotoEffectPreset(
    aiFeature?.effectKey ?? filterFeature?.effectKey ?? null,
  );
  const framePreset = getPhotoEffectPreset(frameFeature?.effectKey ?? null);
  const adjustmentPreset = getPhotoAdjustmentPreset(adjustments);

  const effectPresets = activeEffects
    .map((id) => getEditorFeature(id))
    .flatMap((f) => (f?.effectKey ? getPhotoEffectPreset(f.effectKey).overlays : []));

  const allOverlays = [
    ...filterPreset.overlays,
    ...adjustmentPreset.overlays,
    ...effectPresets,
    ...(framePreset.overlays ?? []),
  ];

  const hasActiveEdits = useMemo(() => {
    if (activeStickers.length > 0) return true;
    if (activeFilterId || activeFrameId || activeEffects.length > 0) return true;
    if (showWatermark) return true;
    if (allOverlays.length > 0) return true;
    return ADJUSTMENT_KEYS.some((key) => adjustments[key] !== DEFAULT_ADJUSTMENTS[key]);
  }, [
    activeStickers.length,
    activeFilterId,
    activeFrameId,
    activeEffects.length,
    showWatermark,
    allOverlays.length,
    adjustments,
  ]);

  const updateUri = (uri: string) => {
    setWorkingUri(uri);
    onSourceChange?.(uri);
  };

  const ensureFeature = (feature: EditorFeature, action: () => void | Promise<void>) => {
    if (isEditorFeatureUnlocked(feature, passes)) {
      void action();
      return;
    }
    setPassModalFeature(feature);
    setPassModalOpen(true);
  };

  const purchasePass = async (tier: FeaturePassTier) => {
    if (!passModalFeature) return;
    setPassLoading(true);
    try {
      await api.purchaseFeaturePass(passModalFeature.id, tier);
      await refresh();
      reloadPasses();
      setPassModalOpen(false);
      Alert.alert(t('photos.passPurchased'), t('photos.passPurchasedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    } finally {
      setPassLoading(false);
    }
  };

  const unlockViaAd = async () => {
    if (!passModalFeature) return;
    setAdUnlockLoading(true);
    try {
      const watched = await watchAd('editor_unlock_1h');
      if (!watched) return;
      await api.grantEditorFeatureViaAd(passModalFeature.id);
      await refresh();
      reloadPasses();
      setPassModalOpen(false);
      Alert.alert(t('photos.passPurchased'), t('photos.passAdUnlockedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    } finally {
      setAdUnlockLoading(false);
    }
  };

  const flattenPreview = async (): Promise<string> => {
    setIsCapturing(true);
    setSelectedStickerId(null);
    await waitForPaintFrames(3);
    try {
      return await capturePreviewUri(previewRef, workingUri, {
        mustCapture: hasActiveEdits,
        width: previewSize.width,
        height: previewSize.height,
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const prepareSaveUri = async (uri: string): Promise<string> => {
    try {
      return await normalizePhotoUri(uri);
    } catch {
      return uri;
    }
  };

  const applyFlattened = async () => {
    if (!workingUri) {
      onPickAnother?.();
      return;
    }
    setSaving(true);
    try {
      const uri = await flattenPreview();
      updateUri(uri);
      setActiveFilterId(null);
      setActiveFrameId(null);
      setActiveStickers([]);
      setSelectedStickerId(null);
      setActiveEffects([]);
      setAdjustments(DEFAULT_ADJUSTMENTS);
    } catch {
      Alert.alert(t('common.error'), t('photos.applyFailed'));
    } finally {
      setSaving(false);
    }
  };

  const selectFilter = (feature: EditorFeature) => {
    ensureFeature(feature, () => setActiveFilterId(feature.id));
  };

  const selectFrame = (feature: EditorFeature) => {
    ensureFeature(feature, () =>
      setActiveFrameId((current) => (current === feature.id ? null : feature.id)),
    );
  };

  const addSticker = (feature: EditorFeature) => {
    ensureFeature(feature, () => {
      const instance: StickerInstance = {
        id: `${feature.id}-${Date.now()}`,
        featureId: feature.id,
        x: previewSize.width > 0 ? previewSize.width / 2 - 24 : 120,
        y: previewSize.height / 2 - 24,
        scale: 1,
        rotation: 0,
      };
      setActiveStickers((prev) => [...prev, instance]);
      setSelectedStickerId(instance.id);
    });
  };

  const toggleEffect = (feature: EditorFeature) => {
    ensureFeature(feature, () =>
      setActiveEffects((prev) =>
        prev.includes(feature.id) ? prev.filter((id) => id !== feature.id) : [...prev, feature.id],
      ),
    );
  };

  const runAdjust = async (feature: EditorFeature) => {
    ensureFeature(feature, async () => {
      if (!feature.effectKey) return;
      const adjustmentKey = getAdjustmentKey(feature.effectKey);
      if (adjustmentKey) {
        setActiveAdjustmentKey(adjustmentKey);
        return;
      }
      if (!isPhotoTransformKey(feature.effectKey)) return;
      if (!workingUri) {
        onPickAnother?.();
        return;
      }
      setSaving(true);
      try {
        const uri = await applyPhotoAdjust(workingUri, feature.effectKey);
        updateUri(uri);
      } catch {
        Alert.alert(t('common.error'), t('photos.applyFailed'));
      } finally {
        setSaving(false);
      }
    });
  };

  const toggleWatermark = (value: boolean) => {
    if (!value && !watermarkUnlocked) {
      const feature = getEditorFeature('watermark_remove');
      if (feature) ensureFeature(feature, () => setWatermark(false));
      return;
    }
    setWatermark(value);
  };

  const onPreviewLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPreviewSize({ width, height });
  };

  const updateSticker = (id: string, patch: Partial<StickerInstance>) => {
    setActiveStickers((prev) =>
      prev.map((sticker) => (sticker.id === id ? { ...sticker, ...patch } : sticker)),
    );
  };

  const removeSelectedSticker = () => {
    if (!selectedStickerId) return;
    setActiveStickers((prev) => prev.filter((sticker) => sticker.id !== selectedStickerId));
    setSelectedStickerId(null);
  };

  const setAdjustmentValue = (key: AdjustmentKey, value: number) => {
    const min = key === 'vignette' || key === 'grain' ? 0 : -1;
    setAdjustments((prev) => ({ ...prev, [key]: clamp(value, min, 1) }));
  };

  const resetAdjustments = () => setAdjustments(DEFAULT_ADJUSTMENTS);

  const saveLabels = () => ({
    permissionTitle: t('photos.savePermissionTitle'),
    permissionMessage: t('photos.savePermissionMessage'),
    savedTitle: t('photos.savedTitle'),
    savedMessage: t('photos.savedMessage'),
    savedMessageNamed: (name: string) => t('photos.savedMessageNamed', { name }),
    failed: t('photos.saveFailed'),
    webUnsupported: t('photos.webUnsupported'),
  });

  const closeSaveSheet = () => {
    if (saving) return;
    setSaveSheetOpen(false);
    setPendingSaveUri(null);
  };

  const confirmSaveToDevice = async (filename: string) => {
    if (!pendingSaveUri) return;
    setSaving(true);
    try {
      const saved = await savePhotoWithFilename(pendingSaveUri, filename, saveLabels());
      if (saved) closeSaveSheet();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!workingUri) {
      onPickAnother?.();
      return;
    }
    setSaving(true);
    try {
      const captured = await flattenPreview();
      const uri = await prepareSaveUri(captured);
      if (onSave) {
        await onSave(uri);
      } else if (saveToDevice) {
        setPendingSaveUri(uri);
        setSaveSheetOpen(true);
      }
    } catch {
      Alert.alert(t('common.error'), t('photos.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const renderFeatureChip = (
    feature: EditorFeature,
    active: boolean,
    onPress: () => void,
    preview?: ReactNode,
  ) => {
    const unlocked = isEditorFeatureUnlocked(feature, passes);
    const pass = getActiveFeaturePass(passes, feature.id);
    const expiry = formatPassExpiry(pass, lang);
    const disabled = !hasPhoto;

    return (
      <Pressable
        key={feature.id}
        style={[styles.chip, active && styles.chipActive, !unlocked && styles.chipLocked, disabled && styles.chipDisabled]}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
      >
        {preview}
        <Text style={styles.chipName} numberOfLines={1}>
          {feature.name[lang]}
        </Text>
        {!unlocked ? (
          <Text style={styles.chipLock}>🔒</Text>
        ) : expiry ? (
          <Text style={styles.chipExpiry}>{expiry}</Text>
        ) : feature.free ? (
          <Text style={styles.chipFree}>{t('photos.free')}</Text>
        ) : null}
      </Pressable>
    );
  };

  const filters = getEditorFeaturesByCategory('filter');
  const stickers = getEditorFeaturesByCategory('sticker');
  const frames = getEditorFeaturesByCategory('frame');
  const aiTools = getEditorFeaturesByCategory('ai');
  const adjusts = getEditorFeaturesByCategory('adjust');
  const effects = getEditorFeaturesByCategory('effect').filter((f) => f.id !== 'watermark_remove');

  const frameStyle = framePreset.frame;
  const selectedSticker = activeStickers.find((sticker) => sticker.id === selectedStickerId);
  const selectedStickerFeature = selectedSticker ? getEditorFeature(selectedSticker.featureId) : null;
  const activeAdjustmentFeature = adjusts.find(
    (feature) => getAdjustmentKey(feature.effectKey) === activeAdjustmentKey,
  );

  const renderValueSlider = (
    value: number,
    onChange: (value: number) => void,
    min = -1,
    max = 1,
  ) => {
    const percent = ((value - min) / (max - min)) * 100;
    const handleTrackPress = (event: GestureResponderEvent) => {
      const x = clamp(event.nativeEvent.locationX, 0, 168);
      onChange(min + (x / 168) * (max - min));
    };

    return (
      <View style={styles.sliderRow}>
        <Pressable style={styles.sliderButton} onPress={() => onChange(value - 0.1)}>
          <Text style={styles.sliderButtonText}>-</Text>
        </Pressable>
        <Pressable style={styles.sliderTrack} onPress={handleTrackPress}>
          <View style={[styles.sliderFill, { width: `${percent}%` }]} />
          <View style={[styles.sliderThumb, { left: `${percent}%` }]} />
        </Pressable>
        <Pressable style={styles.sliderButton} onPress={() => onChange(value + 0.1)}>
          <Text style={styles.sliderButtonText}>+</Text>
        </Pressable>
        <Text style={styles.sliderValue}>{Math.round(value * 100)}</Text>
      </View>
    );
  };

  const renderStickerControls = () => {
    if (!selectedSticker) {
      return <Text style={styles.helper}>{t('photos.stickerHint')}</Text>;
    }

    return (
      <View style={styles.controlPanel}>
        <View style={styles.row}>
          <Text style={styles.label}>
            {t('photos.selectedSticker')} · {selectedStickerFeature?.name[lang] ?? ''}
          </Text>
          <Pressable style={styles.deleteButton} onPress={removeSelectedSticker}>
            <Text style={styles.deleteButtonText}>{t('photos.stickerDelete')}</Text>
          </Pressable>
        </View>
        <Text style={styles.controlLabel}>{t('photos.stickerScale')}</Text>
        {renderValueSlider(
          selectedSticker.scale,
          (value) =>
            updateSticker(selectedSticker.id, {
              scale: clamp(value, STICKER_SCALE_MIN, STICKER_SCALE_MAX),
            }),
          STICKER_SCALE_MIN,
          STICKER_SCALE_MAX,
        )}
        <Text style={styles.controlLabel}>{t('photos.stickerRotate')}</Text>
        {renderValueSlider(selectedSticker.rotation, (value) =>
          updateSticker(selectedSticker.id, { rotation: clamp(value, -45, 45) }),
        -45, 45)}
      </View>
    );
  };

  const renderAdjustControls = () => {
    const value = adjustments[activeAdjustmentKey];
    const min = activeAdjustmentKey === 'vignette' || activeAdjustmentKey === 'grain' ? 0 : -1;

    return (
      <View style={styles.controlPanel}>
        <View style={styles.row}>
          <Text style={styles.label}>
            {activeAdjustmentFeature?.name[lang] ?? t('photos.adjust')} · {t('photos.adjustIntensity')}
          </Text>
          <Pressable style={styles.deleteButton} onPress={resetAdjustments}>
            <Text style={styles.deleteButtonText}>{t('photos.adjustReset')}</Text>
          </Pressable>
        </View>
        {renderValueSlider(value, (next) => setAdjustmentValue(activeAdjustmentKey, next), min, 1)}
      </View>
    );
  };

  const renderTabFeatures = () => {
    if (activeTab === 'watermark') {
      return (
        <View style={styles.watermarkPanel}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('editor.watermark')}</Text>
            <Switch
              value={watermarkUnlocked ? watermark : true}
              onValueChange={toggleWatermark}
            />
          </View>
          {!watermarkUnlocked ? (
            <Text style={styles.helper}>{t('photos.watermarkHint')}</Text>
          ) : null}
        </View>
      );
    }

    const features =
      activeTab === 'filter'
        ? filters
        : activeTab === 'ai'
          ? aiTools
          : activeTab === 'adjust'
            ? adjusts
            : activeTab === 'sticker'
              ? stickers
              : activeTab === 'frame'
                ? frames
                : effects;

    return (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
          {features.map((feature) => {
            const isFilterLike = activeTab === 'filter' || activeTab === 'ai';
            const adjustmentKey = getAdjustmentKey(feature.effectKey);
            const active = isFilterLike
              ? activeFilterId === feature.id
              : activeTab === 'sticker'
                ? activeStickers.some((sticker) => sticker.featureId === feature.id)
                : activeTab === 'frame'
                  ? activeFrameId === feature.id
                  : activeTab === 'effect'
                    ? activeEffects.includes(feature.id)
                    : activeAdjustmentKey === adjustmentKey;

            const onPress = () => {
              if (activeTab === 'filter' || activeTab === 'ai') selectFilter(feature);
              else if (activeTab === 'adjust') runAdjust(feature);
              else if (activeTab === 'sticker') addSticker(feature);
              else if (activeTab === 'frame') selectFrame(feature);
              else toggleEffect(feature);
            };

            const preview =
              activeTab === 'filter' && feature.previewColor ? (
                <View style={[styles.swatch, { backgroundColor: feature.previewColor }]} />
              ) : activeTab === 'sticker' && feature.emoji ? (
                <Text style={styles.stickerEmoji}>{feature.emoji}</Text>
              ) : feature.icon ? (
                <Text style={styles.stickerEmoji}>{feature.icon}</Text>
              ) : null;

            return renderFeatureChip(feature, active, onPress, preview);
          })}
        </ScrollView>
        {activeTab === 'adjust' ? renderAdjustControls() : null}
        {activeTab === 'sticker' ? renderStickerControls() : null}
        {selectedSticker && activeTab !== 'sticker' ? (
          <View style={styles.stickerQuickControls}>
            <Text style={styles.controlLabel}>{t('photos.stickerScale')}</Text>
            {renderValueSlider(
              selectedSticker.scale,
              (value) =>
                updateSticker(selectedSticker.id, {
                  scale: clamp(value, STICKER_SCALE_MIN, STICKER_SCALE_MAX),
                }),
              STICKER_SCALE_MIN,
              STICKER_SCALE_MAX,
            )}
          </View>
        ) : null}
      </>
    );
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!stickerDragging}
        keyboardShouldPersistTaps="handled"
      >
        <View
          ref={previewRef}
          collapsable={false}
          style={[
            styles.previewOuter,
            frameStyle && {
              borderWidth: frameStyle.borderWidth,
              borderColor: frameStyle.borderColor,
              borderRadius: frameStyle.borderRadius,
              padding: frameStyle.padding,
              backgroundColor: frameStyle.backgroundColor,
            },
          ]}
        >
          <View style={styles.previewWrap} onLayout={onPreviewLayout}>
            {hasPhoto ? (
              <Image
                source={{ uri: workingUri }}
                style={[styles.preview, filterPreset.imageOpacity ? { opacity: filterPreset.imageOpacity } : null]}
              />
            ) : (
              <Pressable style={styles.previewEmpty} onPress={onPickAnother}>
                <View style={styles.previewEmptyIcon}>
                  <Ionicons name="images-outline" size={34} color={theme.colors.primaryLight} />
                </View>
                <Text style={styles.previewEmptyTitle}>{t('photos.emptyTitle')}</Text>
                <Text style={styles.previewEmptySub}>{t('photos.emptySub')}</Text>
                {onPickAnother ? (
                  <View style={styles.previewEmptyButton}>
                    <Text style={styles.previewEmptyButtonText}>{t('photos.pickFromGallery')}</Text>
                  </View>
                ) : null}
              </Pressable>
            )}
            {allOverlays.map((layer, index) => (
              <View
                key={`${layer.backgroundColor}-${index}`}
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: layer.backgroundColor,
                    opacity: layer.opacity ?? 0.2,
                  },
                  layer.style,
                ]}
              />
            ))}
            {activeStickers.map((sticker) => {
              const feature = getEditorFeature(sticker.featureId);
              if (!feature?.emoji) return null;
              return (
                <DraggableSticker
                  key={sticker.id}
                  sticker={sticker}
                  emoji={feature.emoji}
                  isSelected={!isCapturing && sticker.id === selectedStickerId}
                  onSelect={() => setSelectedStickerId(sticker.id)}
                  onUpdate={updateSticker}
                  onDragStart={() => setStickerDragActive(true)}
                  onDragEnd={() => setStickerDragActive(false)}
                  previewSize={previewSize}
                />
              );
            })}
            {hasPhoto && showWatermark ? <Text style={styles.watermark}>TingTing</Text> : null}
          </View>
        </View>

        {saving ? <ActivityIndicator color={theme.colors.primaryLight} style={styles.loader} /> : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {EDITOR_TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[tabPill(activeTab === tab.id), styles.tabItem, !hasPhoto && styles.tabItemDisabled]}
              onPress={() => setActiveTab(tab.id)}
              disabled={!hasPhoto}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {renderTabFeatures()}

        <View style={styles.actionRow}>
          <PremiumButton
            title={t('photos.applyEdits')}
            onPress={applyFlattened}
            loading={saving}
            disabled={!hasPhoto}
            variant="outline"
            fullWidth={false}
            style={styles.actionButton}
          />
          <PremiumButton
            title={saveLabel ?? t('photos.saveToGallery')}
            onPress={handleSave}
            loading={saving}
            disabled={!hasPhoto}
            fullWidth={false}
            style={styles.actionButton}
          />
        </View>
        {showPickAnother && onPickAnother ? (
          <PremiumButton
            title={hasPhoto ? t('photos.pickAnother') : t('photos.pickFromGallery')}
            onPress={onPickAnother}
            variant={hasPhoto ? 'outline' : 'primary'}
          />
        ) : null}
      </ScrollView>

      <FeaturePassModal
        visible={passModalOpen}
        feature={passModalFeature}
        onClose={() => setPassModalOpen(false)}
        onPurchase={purchasePass}
        onWatchAd={unlockViaAd}
        adUnlockLoading={adUnlockLoading}
        loading={passLoading}
      />

      <PhotoSaveSheet
        visible={saveSheetOpen}
        loading={saving}
        onClose={closeSaveSheet}
        onSave={confirmSaveToDevice}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg },
  previewOuter: { borderRadius: theme.radius.md, overflow: 'hidden' },
  previewWrap: { position: 'relative', borderRadius: theme.radius.md, overflow: 'hidden' },
  preview: { width: '100%', height: 300, backgroundColor: theme.colors.surface },
  previewEmpty: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  previewEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.soft,
  },
  previewEmptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  previewEmptySub: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  previewEmptyButton: {
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  previewEmptyButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stickerContainer: {
    position: 'absolute',
    minWidth: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerBody: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerSelection: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.radius.sm,
    borderStyle: 'dashed',
  },
  stickerResizeHandle: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryLight,
    zIndex: 2,
  },
  stickerOverlayWeb: { touchAction: 'none', cursor: 'grab', userSelect: 'none' } as const,
  stickerOverlayText: { fontSize: 40, textShadowColor: 'rgba(0,0,0,0.22)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 2 } },
  watermark: {
    position: 'absolute',
    top: 12,
    right: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '800',
    fontSize: 18,
  },
  loader: { marginVertical: 4 },
  tabRow: { gap: 6, paddingRight: theme.spacing.sm },
  tabItem: { alignItems: 'center' },
  tabItemDisabled: { opacity: 0.45 },
  tabText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primaryLight, fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  watermarkPanel: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    minHeight: 72,
    justifyContent: 'center',
  },
  controlPanel: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: theme.colors.text, fontWeight: '600' },
  controlLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  stickerQuickControls: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  helper: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  deleteButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.tint.soft,
  },
  deleteButtonText: { color: theme.colors.primaryLight, fontSize: 11, fontWeight: '800' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sliderButtonText: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  sliderTrack: {
    width: 168,
    height: 18,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  sliderFill: { height: '100%', backgroundColor: theme.colors.primaryLight, opacity: 0.45 },
  sliderThumb: {
    position: 'absolute',
    top: -2,
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    backgroundColor: theme.colors.primaryLight,
  },
  sliderValue: { minWidth: 34, color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  rowScroll: { gap: 8, paddingRight: theme.spacing.sm, minHeight: 92, alignItems: 'center' },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
    maxWidth: 92,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  chipActive: { borderColor: theme.colors.primaryLight, backgroundColor: theme.colors.tint.soft },
  chipLocked: { opacity: 0.72 },
  chipDisabled: { opacity: 0.45 },
  chipName: { color: theme.colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  chipLock: { fontSize: 10 },
  chipExpiry: { color: theme.colors.primaryLight, fontSize: 9, fontWeight: '700' },
  chipFree: { color: theme.colors.textMuted, fontSize: 9, fontWeight: '600' },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  stickerEmoji: { fontSize: 26 },
});
