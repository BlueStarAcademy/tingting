import { useCallback, useRef, useState, type ReactNode } from 'react';
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
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
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
import { tabPill } from '@/lib/ui';
import {
  applyPhotoAdjust,
  getPhotoEffectPreset,
  normalizePhotoUri,
} from '@/lib/photo-effects';
import { savePhotoToGallery } from '@/lib/save-photo';
import { theme } from '@/constants/theme';

interface Props {
  sourceUri: string;
  onSourceChange?: (uri: string) => void;
  onPickAnother?: () => void;
  onSave?: (uri: string) => Promise<void>;
  saveLabel?: string;
  showPickAnother?: boolean;
}

const STICKER_POSITIONS = [
  { bottom: 24, right: 24, fontSize: 36 },
  { top: 24, left: 24, fontSize: 32 },
  { bottom: 24, left: 24, fontSize: 30 },
  { top: 24, right: 24, fontSize: 28 },
];

type EditorTab = 'filter' | 'ai' | 'adjust' | 'sticker' | 'frame' | 'effect' | 'watermark';

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
}: Props) {
  const { t, locale } = useLocale();
  const { refresh } = useAuth();
  const lang = locale === 'ko' ? 'ko' : 'en';
  const previewRef = useRef<View>(null);

  const [workingUri, setWorkingUri] = useState(sourceUri);
  const [passes, setPasses] = useState<FeaturePass[]>([]);
  const [loading, setLoading] = useState(false);
  const [passModalFeature, setPassModalFeature] = useState<EditorFeature | null>(null);
  const [passModalOpen, setPassModalOpen] = useState(false);

  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [activeStickers, setActiveStickers] = useState<string[]>([]);
  const [activeEffects, setActiveEffects] = useState<string[]>([]);
  const [watermark, setWatermark] = useState(true);
  const [activeTab, setActiveTab] = useState<EditorTab>('filter');

  const reloadPasses = useCallback(() => {
    api.getFeaturePasses().then(setPasses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setWorkingUri(sourceUri);
      setActiveFilterId(null);
      setActiveFrameId(null);
      setActiveStickers([]);
      setActiveEffects([]);
      reloadPasses();
    }, [sourceUri, reloadPasses]),
  );

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

  const effectPresets = activeEffects
    .map((id) => getEditorFeature(id))
    .flatMap((f) => (f?.effectKey ? getPhotoEffectPreset(f.effectKey).overlays : []));

  const allOverlays = [...filterPreset.overlays, ...effectPresets, ...(framePreset.overlays ?? [])];

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
    setLoading(true);
    try {
      await api.purchaseFeaturePass(passModalFeature.id, tier);
      await refresh();
      reloadPasses();
      setPassModalOpen(false);
      Alert.alert(t('photos.passPurchased'), t('photos.passPurchasedMessage'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    } finally {
      setLoading(false);
    }
  };

  const flattenPreview = async (): Promise<string> => {
    if (!previewRef.current) return workingUri;
    const uri = await captureRef(previewRef, { format: 'jpg', quality: 0.92 });
    return uri;
  };

  const applyFlattened = async () => {
    setLoading(true);
    try {
      const uri = await flattenPreview();
      updateUri(uri);
      setActiveFilterId(null);
      setActiveFrameId(null);
      setActiveStickers([]);
      setActiveEffects([]);
    } catch {
      Alert.alert(t('common.error'), t('photos.applyFailed'));
    } finally {
      setLoading(false);
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

  const toggleSticker = (feature: EditorFeature) => {
    ensureFeature(feature, () =>
      setActiveStickers((prev) =>
        prev.includes(feature.id) ? prev.filter((id) => id !== feature.id) : [...prev, feature.id],
      ),
    );
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
      setLoading(true);
      try {
        const uri = await applyPhotoAdjust(
          workingUri,
          feature.effectKey as 'rotate' | 'flip' | 'crop_square',
        );
        updateUri(uri);
      } catch {
        Alert.alert(t('common.error'), t('photos.applyFailed'));
      } finally {
        setLoading(false);
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

  const handleSave = async () => {
    setLoading(true);
    try {
      let uri = await flattenPreview();
      uri = await normalizePhotoUri(uri);
      if (onSave) {
        await onSave(uri);
      } else {
        await savePhotoToGallery(uri, {
          permissionTitle: t('photos.savePermissionTitle'),
          permissionMessage: t('photos.savePermissionMessage'),
          savedTitle: t('photos.savedTitle'),
          savedMessage: t('photos.savedMessage'),
          failed: t('photos.saveFailed'),
          webUnsupported: t('photos.webUnsupported'),
        });
      }
    } catch {
      Alert.alert(t('common.error'), t('photos.saveFailed'));
    } finally {
      setLoading(false);
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

    return (
      <Pressable
        key={feature.id}
        style={[styles.chip, active && styles.chipActive, !unlocked && styles.chipLocked]}
        onPress={onPress}
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {features.map((feature) => {
          const isFilterLike = activeTab === 'filter' || activeTab === 'ai';
          const active = isFilterLike
            ? activeFilterId === feature.id
            : activeTab === 'sticker'
              ? activeStickers.includes(feature.id)
              : activeTab === 'frame'
                ? activeFrameId === feature.id
                : activeTab === 'effect'
                  ? activeEffects.includes(feature.id)
                  : false;

          const onPress = () => {
            if (activeTab === 'filter' || activeTab === 'ai') selectFilter(feature);
            else if (activeTab === 'adjust') runAdjust(feature);
            else if (activeTab === 'sticker') toggleSticker(feature);
            else if (activeTab === 'frame') selectFrame(feature);
            else toggleEffect(feature);
          };

          const preview =
            activeTab === 'filter' && feature.previewColor ? (
              <View style={[styles.swatch, { backgroundColor: feature.previewColor }]} />
            ) : activeTab === 'sticker' && feature.emoji ? (
              <Text style={styles.stickerEmoji}>{feature.emoji}</Text>
            ) : null;

          return renderFeatureChip(feature, active, onPress, preview);
        })}
      </ScrollView>
    );
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: workingUri }}
              style={[styles.preview, filterPreset.imageOpacity ? { opacity: filterPreset.imageOpacity } : null]}
            />
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
            {activeStickers.map((id, index) => {
              const feature = getEditorFeature(id);
              if (!feature?.emoji) return null;
              const pos = STICKER_POSITIONS[index % STICKER_POSITIONS.length];
              return (
                <Text key={id} style={[styles.stickerOverlay, pos]}>
                  {feature.emoji}
                </Text>
              );
            })}
            {showWatermark ? <Text style={styles.watermark}>TingTing</Text> : null}
          </View>
        </View>

        {loading ? <ActivityIndicator color={theme.colors.primaryLight} style={styles.loader} /> : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {EDITOR_TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[tabPill(activeTab === tab.id), styles.tabItem]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {renderTabFeatures()}

        <PremiumButton title={t('photos.applyEdits')} onPress={applyFlattened} loading={loading} variant="outline" />
        <PremiumButton
          title={saveLabel ?? t('photos.saveToGallery')}
          onPress={handleSave}
          loading={loading}
        />
        {showPickAnother && onPickAnother ? (
          <PremiumButton title={t('photos.pickAnother')} onPress={onPickAnother} variant="outline" />
        ) : null}
      </ScrollView>

      <FeaturePassModal
        visible={passModalOpen}
        feature={passModalFeature}
        onClose={() => setPassModalOpen(false)}
        onPurchase={purchasePass}
        loading={loading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: theme.spacing.sm, paddingBottom: theme.spacing.lg },
  previewOuter: { borderRadius: theme.radius.md, overflow: 'hidden' },
  previewWrap: { position: 'relative', borderRadius: theme.radius.md, overflow: 'hidden' },
  preview: { width: '100%', height: 300, backgroundColor: theme.colors.surface },
  stickerOverlay: { position: 'absolute' },
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
  tabText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primaryLight, fontWeight: '800' },
  watermarkPanel: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    minHeight: 72,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: theme.colors.text, fontWeight: '600' },
  helper: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
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
  chipName: { color: theme.colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  chipLock: { fontSize: 10 },
  chipExpiry: { color: theme.colors.primaryLight, fontSize: 9, fontWeight: '700' },
  chipFree: { color: theme.colors.textMuted, fontSize: 9, fontWeight: '600' },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  stickerEmoji: { fontSize: 26 },
});
