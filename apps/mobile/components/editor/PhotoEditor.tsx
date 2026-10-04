import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, ImageFormat, Skia, drawAsImage, type SkImage } from '@shopify/react-native-skia';
import { EDITOR_FEATURES } from '@tingting/shared';
import { loadArImages, useArImages } from '@/components/ar/ArLayer';
import { theme } from '@/constants/theme';
import { AR_EFFECTS } from '@/lib/ar/effects';
import { AR_SPRITES } from '@/lib/ar/sprites';
import { translate } from '@/lib/i18n/translations';
import { EditorScene } from './EditorScene';
import { EditorSlider } from './EditorSlider';
import { CropView } from './CropView';
import { TextSheet, type TextDraft } from './TextSheet';
import { ChipRow, EmojiGrid, FilterStrip, ItemRow, Swatches, TileRow } from './panels';
import { FILTERS, FILTER_GROUPS } from '@/lib/editor/color';
import { detectFaces, type FaceDetectResult } from '@/lib/editor/faces';
import { FRAMES } from '@/lib/editor/frames';
import { useEditHistory } from '@/lib/editor/history';
import { prepareBaseImage, transformBase, writeJpegBase64, type CropBox } from '@/lib/editor/image';
import type { CameraLook } from '@/lib/editor/look';
import { buildSceneModel, hitTestItem } from '@/lib/editor/scene';
import { getEditorEffect } from '@/lib/editor/shader';
import {
  ADJUST_ITEMS,
  BEAUTY_ITEMS,
  BEAUTY_PRESETS,
  EFFECT_ITEMS,
  FACE_ONLY_BEAUTY,
  MAKEUP_ITEMS,
  createEditState,
  hasEdits,
  newItemId,
  type AdjustKey,
  type BaseImage,
  type BeautyKey,
  type EditState,
  type EffectKey,
  type MakeupKey,
  type OverlayItem,
  type TextItem,
} from '@/lib/editor/types';

type Props = {
  sourceUri: string;
  onCancel: () => void;
  /** receives null when nothing was changed */
  onDone: (editedUri: string | null) => Promise<void>;
  doneLabel?: string;
  initialBeauty?: string | null;
  initialFilter?: string | null;
  /** full look from the beauty camera; wins over initialBeauty / initialFilter */
  initialLook?: CameraLook | null;
  caption?: string;
};

type Tool = 'beauty' | 'makeup' | 'filter' | 'adjust' | 'effect' | 'crop' | 'text' | 'sticker' | 'lens' | 'frame';

const TOOLS: { id: Tool; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'beauty', label: '뷰티', icon: 'happy-outline' },
  { id: 'makeup', label: '메이크업', icon: 'color-palette-outline' },
  { id: 'filter', label: '필터', icon: 'color-filter-outline' },
  { id: 'adjust', label: '보정', icon: 'options-outline' },
  { id: 'effect', label: '효과', icon: 'sparkles-outline' },
  { id: 'crop', label: '자르기', icon: 'crop-outline' },
  { id: 'text', label: '텍스트', icon: 'text-outline' },
  { id: 'sticker', label: '스티커', icon: 'heart-outline' },
  { id: 'lens', label: 'AR 스티커', icon: 'glasses-outline' },
  { id: 'frame', label: '프레임', icon: 'albums-outline' },
];

const STICKERS = EDITOR_FEATURES.filter((f) => f.category === 'sticker' && f.emoji).map((f) => ({
  id: f.id,
  emoji: f.emoji as string,
  group: f.group?.ko ?? '기본',
}));
const STICKER_GROUPS = Array.from(new Set(STICKERS.map((s) => s.group)));

const TRAVEL_STAMP = 'lens_travel_stamp';
const STAMP_ICON = EDITOR_FEATURES.find((f) => f.id === TRAVEL_STAMP)?.icon ?? '✈️';

const PANEL_HEIGHT = 196;

export function PhotoEditor(props: Props) {
  const [original, setOriginal] = useState<BaseImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let alive = true;
    setOriginal(null);
    setError(null);
    prepareBaseImage(props.sourceUri)
      .then((base) => alive && setOriginal(base))
      .catch((e) => alive && setError(e instanceof Error ? e.message : '사진을 열 수 없어요'));
    return () => {
      alive = false;
    };
  }, [props.sourceUri]);

  if (!original) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={props.onCancel} style={styles.errorBtn}>
              <Text style={styles.errorBtnText}>닫기</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color="#fff" />
            <Text style={styles.loadingText}>사진 준비 중…</Text>
          </>
        )}
      </View>
    );
  }
  return <EditorBody {...props} original={original} />;
}

function useSkImage(uri: string, cache: Map<string, SkImage>): SkImage | null {
  const [loaded, setLoaded] = useState<{ uri: string; image: SkImage } | null>(() => {
    const hit = cache.get(uri);
    return hit ? { uri, image: hit } : null;
  });
  useEffect(() => {
    let alive = true;
    const hit = cache.get(uri);
    if (hit) {
      setLoaded({ uri, image: hit });
      return;
    }
    Skia.Data.fromURI(uri)
      .then((data) => {
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image) return;
        cache.set(uri, image);
        if (alive) setLoaded({ uri, image });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uri, cache]);
  return loaded && loaded.uri === uri ? loaded.image : null;
}

function initialState(
  original: BaseImage,
  beautyId?: string | null,
  filterId?: string | null,
  look?: CameraLook | null,
): EditState {
  const state = createEditState(original);
  if (look) {
    state.beauty = { ...look.beauty };
    state.makeup = {
      ...state.makeup,
      lip: { ...state.makeup.lip, amount: look.lip },
      blush: { ...state.makeup.blush, amount: look.blush },
    };
    if (look.filterId && FILTERS.some((f) => f.id === look.filterId)) {
      state.filterId = look.filterId;
      state.filterIntensity = look.filterIntensity;
    }
    state.arId = look.effectId;
    return state;
  }
  const preset = BEAUTY_PRESETS.find((p) => p.id === beautyId);
  if (preset) applyPreset(state, preset);
  if (filterId && FILTERS.some((f) => f.id === filterId)) state.filterId = filterId;
  return state;
}

function applyPreset(state: EditState, preset: (typeof BEAUTY_PRESETS)[number]): EditState {
  state.beauty = { ...preset.values };
  state.makeup = {
    ...state.makeup,
    lip: { ...state.makeup.lip, amount: preset.makeup?.lip ?? 0 },
    blush: { ...state.makeup.blush, amount: preset.makeup?.blush ?? 0 },
  };
  return state;
}

function EditorBody({
  original,
  onCancel,
  onDone,
  doneLabel = '저장',
  initialBeauty,
  initialFilter,
  initialLook,
  caption,
}: Props & { original: BaseImage }) {
  const insets = useSafeAreaInsets();
  const history = useEditHistory<EditState>(initialState(original, initialBeauty, initialFilter, initialLook));
  const { state, update, commit, apply } = history;

  const imageCache = useRef(new Map<string, SkImage>()).current;
  const image = useSkImage(state.base.uri, imageCache);
  const effect = useMemo(() => getEditorEffect(), []);
  const arImages = useArImages();

  const [faceResults, setFaceResults] = useState<Record<string, FaceDetectResult | 'loading'>>({});
  useEffect(() => {
    const uri = state.base.uri;
    if (faceResults[uri]) return;
    setFaceResults((prev) => ({ ...prev, [uri]: 'loading' }));
    detectFaces(uri, { contours: true, classify: true }).then((result) =>
      setFaceResults((prev) => ({ ...prev, [uri]: result })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.base.uri]);
  const faceResult = faceResults[state.base.uri];
  const faces = faceResult && faceResult !== 'loading' ? faceResult.faces : [];

  const model = useMemo(() => buildSceneModel(state, faces, caption), [state, faces, caption]);

  const [tool, setTool] = useState<Tool>('beauty');
  const [beautyKey, setBeautyKey] = useState<BeautyKey>('smooth');
  const [makeupKey, setMakeupKey] = useState<MakeupKey>('blush');
  const [adjustKey, setAdjustKey] = useState<AdjustKey>('brightness');
  const [effectKey, setEffectKey] = useState<EffectKey>('light_leak');
  const [filterGroup, setFilterGroup] = useState(FILTER_GROUPS[0] ?? '');
  const [stickerGroup, setStickerGroup] = useState(STICKER_GROUPS[0] ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textSheet, setTextSheet] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [area, setArea] = useState({ width: 0, height: 0 });

  const { layout } = model;
  const scale = area.width && area.height ? Math.min(area.width / layout.width, area.height / layout.height) : 0;
  const canvasW = layout.width * scale;
  const canvasH = layout.height * scale;

  const edited = hasEdits(state, original);

  const requestClose = useCallback(() => {
    if (!edited) {
      onCancel();
      return;
    }
    Alert.alert('편집을 그만둘까요?', '지금까지 편집한 내용은 저장되지 않아요.', [
      { text: '계속 편집', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: onCancel },
    ]);
  }, [edited, onCancel]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving) return true;
      if (tool === 'crop') {
        setTool('beauty');
        return true;
      }
      requestClose();
      return true;
    });
    return () => sub.remove();
  }, [tool, requestClose, saving]);

  // ---- overlay gestures -------------------------------------------------
  const live = useRef({ model, scale, selectedId, state });
  live.current = { model, scale, selectedId, state };
  const gestureStart = useRef<OverlayItem | null>(null);
  const pinchStart = useRef<OverlayItem | null>(null);
  const rotateStart = useRef<OverlayItem | null>(null);

  const itemAt = (x: number, y: number) => {
    const { model: m, scale: s } = live.current;
    if (!s) return null;
    return hitTestItem(m, x / s, y / s, 14 / s);
  };

  const beginOn = (id: string | null) => {
    const item = id ? live.current.state.items.find((it) => it.id === id) ?? null : null;
    gestureStart.current = item;
    return item;
  };

  const patchItem = (id: string, patch: (item: OverlayItem) => Partial<OverlayItem>) => {
    update((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? ({ ...it, ...patch(it) } as OverlayItem) : it)),
    }));
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(4)
    .onStart((e) => {
      const hit = itemAt(e.x, e.y);
      const id = hit?.id ?? live.current.selectedId;
      if (hit) setSelectedId(hit.id);
      beginOn(id);
    })
    .onUpdate((e) => {
      const start = gestureStart.current;
      const { model: m, scale: s } = live.current;
      if (!start || !s) return;
      const dx = e.translationX / s / m.layout.content.width;
      const dy = e.translationY / s / m.layout.content.height;
      patchItem(start.id, () => ({ x: start.x + dx, y: start.y + dy }));
    })
    .onEnd(() => commit());

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart((e) => {
      const hit = live.current.selectedId ? null : itemAt(e.focalX, e.focalY);
      if (hit) setSelectedId(hit.id);
      pinchStart.current = beginOn(hit?.id ?? live.current.selectedId);
    })
    .onUpdate((e) => {
      const start = pinchStart.current;
      if (!start) return;
      patchItem(start.id, () => ({ scale: Math.min(8, Math.max(0.15, start.scale * e.scale)) }));
    })
    .onEnd(() => commit());

  const rotation = Gesture.Rotation()
    .runOnJS(true)
    .onStart(() => {
      const id = live.current.selectedId;
      rotateStart.current = id ? live.current.state.items.find((it) => it.id === id) ?? null : null;
    })
    .onUpdate((e) => {
      const start = rotateStart.current;
      if (!start) return;
      patchItem(start.id, () => ({ rotation: start.rotation + e.rotation }));
    })
    .onEnd(() => commit());

  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(300)
    .onEnd((e, success) => {
      if (!success) return;
      const hit = itemAt(e.x, e.y);
      if (!hit) {
        setSelectedId(null);
        return;
      }
      if (hit.id === live.current.selectedId && hit.kind === 'text') {
        setTextSheet({ open: true, editId: hit.id });
        return;
      }
      setSelectedId(hit.id);
    });

  const gesture = Gesture.Race(tap, Gesture.Simultaneous(pan, pinch, rotation));

  // ---- item actions -----------------------------------------------------
  const addSticker = (emoji: string) => {
    const id = newItemId();
    apply((s) => ({
      ...s,
      items: [
        ...s.items,
        { id, kind: 'sticker', emoji, x: 0.5 + (Math.random() - 0.5) * 0.2, y: 0.45 + (Math.random() - 0.5) * 0.2, scale: 1, rotation: 0 },
      ],
    }));
    setSelectedId(id);
  };

  const submitText = (draft: TextDraft) => {
    const editId = textSheet.editId;
    if (editId) {
      apply((s) => ({
        ...s,
        items: s.items.map((it) => (it.id === editId && it.kind === 'text' ? { ...it, ...draft } : it)),
      }));
    } else {
      const id = newItemId();
      apply((s) => ({
        ...s,
        items: [...s.items, { id, kind: 'text', ...draft, x: 0.5, y: 0.5, scale: 1, rotation: 0 }],
      }));
      setSelectedId(id);
    }
    setTextSheet({ open: false, editId: null });
  };

  const deleteItem = (id: string) => {
    apply((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }));
    setSelectedId(null);
  };

  const bringToFront = (id: string) => {
    apply((s) => {
      const item = s.items.find((it) => it.id === id);
      return item ? { ...s, items: [...s.items.filter((it) => it.id !== id), item] } : s;
    });
  };

  const duplicateItem = (id: string) => {
    const copyId = newItemId();
    apply((s) => {
      const item = s.items.find((it) => it.id === id);
      return item ? { ...s, items: [...s.items, { ...item, id: copyId, x: item.x + 0.05, y: item.y + 0.05 }] } : s;
    });
    setSelectedId(copyId);
  };

  const selectedItem = state.items.find((it) => it.id === selectedId) ?? null;
  const selectedDraw = model.items.find((it) => it.id === selectedId) ?? null;
  const editingText =
    textSheet.editId != null
      ? (state.items.find((it) => it.id === textSheet.editId && it.kind === 'text') as TextItem | undefined) ?? null
      : null;

  // ---- base transforms (crop / rotate / flip) ---------------------------
  const runTransform = async (op: { rotate?: number; flip?: 'horizontal' | 'vertical'; crop?: CropBox }) => {
    setBusy(true);
    try {
      const next = await transformBase(state.base, op);
      apply((s) => ({ ...s, base: next }));
    } catch {
      Alert.alert('사진을 바꾸지 못했어요', '다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const applyCrop = async (crop: CropBox | null) => {
    if (crop) await runTransform({ crop });
    setTool('beauty');
  };

  // ---- export ------------------------------------------------------------
  const finish = async () => {
    if (saving) return;
    commit();
    setSelectedId(null);
    if (!edited) {
      setSaving(true);
      try {
        await onDone(null);
      } catch {
        setSaving(false);
      }
      return;
    }
    if (!image) return;
    setSaving(true);
    try {
      const sprites = state.arId ? await loadArImages() : arImages;
      const snapshot = await drawAsImage(
        <EditorScene image={image} model={model} effect={effect} arImages={sprites} scale={1} />,
        { width: Math.round(layout.width), height: Math.round(layout.height) },
      );
      if (!snapshot) throw new Error('export failed');
      const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 93);
      const uri = await writeJpegBase64(base64);
      await onDone(uri);
    } catch (e) {
      setSaving(false);
      if (e instanceof Error && e.message === 'export failed') {
        Alert.alert('저장 실패', '편집한 사진을 만들지 못했어요. 다시 시도해 주세요.');
      }
    }
  };

  // ---- panels ------------------------------------------------------------
  const faceStatus = (() => {
    if (!faceResult || faceResult === 'loading') return '얼굴 찾는 중…';
    if (faceResult.status === 'ok') return `얼굴 ${faceResult.faces.length}명 인식 · 얼굴형/눈/코/메이크업 적용`;
    if (faceResult.status === 'none') return '얼굴을 찾지 못했어요 · 피부 보정만 적용돼요';
    if (faceResult.status === 'error') return `얼굴 인식 오류 · 피부 보정만 적용돼요 (${faceResult.error ?? '알 수 없음'})`;
    return '이 앱 버전에서는 얼굴 인식을 쓸 수 없어요 · 새 APK로 업데이트해 주세요';
  })();
  const hasFaces = faces.length > 0;

  const renderPanel = () => {
    switch (tool) {
      case 'beauty': {
        const faceOnly = FACE_ONLY_BEAUTY.includes(beautyKey);
        const beautyItem = BEAUTY_ITEMS.find((b) => b.key === beautyKey) ?? BEAUTY_ITEMS[0];
        return (
          <View style={styles.panelInner}>
            <Text style={styles.hint} numberOfLines={1}>
              {faceStatus}
            </Text>
            <ChipRow
              options={BEAUTY_PRESETS.map((p) => ({ key: p.id, label: p.id === 'none' ? '초기화' : p.label }))}
              value={BEAUTY_PRESETS.find((p) => BEAUTY_ITEMS.every((b) => Math.abs(p.values[b.key] - state.beauty[b.key]) < 0.005))?.id ?? null}
              onChange={(id) => {
                const preset = BEAUTY_PRESETS.find((p) => p.id === id);
                if (preset) apply((s) => applyPreset({ ...s }, preset));
              }}
            />
            <EditorSlider
              value={state.beauty[beautyKey]}
              bipolar={beautyItem.bipolar}
              onChange={(v) => update((s) => ({ ...s, beauty: { ...s.beauty, [beautyKey]: v } }))}
              onComplete={commit}
              label={faceOnly && !hasFaces ? '얼굴 필요' : undefined}
            />
            <ItemRow
              items={BEAUTY_ITEMS.map((b) => ({ key: b.key, label: b.label, icon: b.icon, active: Math.abs(state.beauty[b.key]) > 0.001 }))}
              selected={beautyKey}
              onSelect={(k) => setBeautyKey(k as BeautyKey)}
            />
          </View>
        );
      }
      case 'makeup': {
        const item = MAKEUP_ITEMS.find((m) => m.key === makeupKey) ?? MAKEUP_ITEMS[0];
        const layer = state.makeup[makeupKey];
        return (
          <View style={styles.panelInner}>
            {hasFaces ? (
              <Swatches
                colors={item.palette}
                value={layer.color}
                onChange={(color) =>
                  apply((s) => ({
                    ...s,
                    makeup: { ...s.makeup, [makeupKey]: { amount: s.makeup[makeupKey].amount || 0.5, color } },
                  }))
                }
              />
            ) : (
              <Text style={styles.hint}>{faceStatus}</Text>
            )}
            <EditorSlider
              value={layer.amount}
              onChange={(v) => update((s) => ({ ...s, makeup: { ...s.makeup, [makeupKey]: { ...s.makeup[makeupKey], amount: v } } }))}
              onComplete={commit}
            />
            <ItemRow
              items={MAKEUP_ITEMS.map((m) => ({ key: m.key, label: m.label, icon: m.icon, active: state.makeup[m.key].amount > 0.001 }))}
              selected={makeupKey}
              onSelect={(k) => setMakeupKey(k as MakeupKey)}
            />
          </View>
        );
      }
      case 'filter':
        return (
          <View style={styles.panelInner}>
            <ChipRow options={FILTER_GROUPS.map((g) => ({ key: g, label: g }))} value={filterGroup} onChange={setFilterGroup} />
            {state.filterId ? (
              <EditorSlider
                value={state.filterIntensity}
                onChange={(v) => update((s) => ({ ...s, filterIntensity: v }))}
                onComplete={commit}
                label="강도"
              />
            ) : (
              <View style={{ height: 44 }} />
            )}
            <FilterStrip
              image={image}
              filters={FILTERS.filter((f) => f.group === filterGroup)}
              selected={state.filterId}
              onSelect={(id) => apply((s) => ({ ...s, filterId: id, filterIntensity: id === s.filterId ? s.filterIntensity : 1 }))}
            />
          </View>
        );
      case 'adjust': {
        const item = ADJUST_ITEMS.find((a) => a.key === adjustKey) ?? ADJUST_ITEMS[0];
        return (
          <View style={styles.panelInner}>
            <View style={{ height: 24 }} />
            <EditorSlider
              value={state.adjust[adjustKey]}
              bipolar={item.bipolar}
              onChange={(v) => update((s) => ({ ...s, adjust: { ...s.adjust, [adjustKey]: v } }))}
              onComplete={commit}
            />
            <ItemRow
              items={ADJUST_ITEMS.map((a) => ({ key: a.key, label: a.label, icon: a.icon, active: Math.abs(state.adjust[a.key]) > 0.001 }))}
              selected={adjustKey}
              onSelect={(k) => setAdjustKey(k as AdjustKey)}
            />
          </View>
        );
      }
      case 'effect':
        return (
          <View style={styles.panelInner}>
            <View style={{ height: 24 }} />
            <EditorSlider
              value={state.effects[effectKey]}
              onChange={(v) => update((s) => ({ ...s, effects: { ...s.effects, [effectKey]: v } }))}
              onComplete={commit}
            />
            <ItemRow
              items={EFFECT_ITEMS.map((f) => ({ key: f.key, label: f.label, icon: f.icon, active: state.effects[f.key] > 0.001 }))}
              selected={effectKey}
              onSelect={(k) => {
                setEffectKey(k as EffectKey);
                if (state.effects[k as EffectKey] < 0.001) {
                  apply((s) => ({ ...s, effects: { ...s.effects, [k]: 0.6 } }));
                }
              }}
            />
          </View>
        );
      case 'text':
        return (
          <View style={[styles.panelInner, styles.centerPanel]}>
            <Pressable style={styles.bigButton} onPress={() => setTextSheet({ open: true, editId: null })}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.bigButtonText}>텍스트 추가</Text>
            </Pressable>
            <Text style={styles.hint}>글자를 탭해 선택 · 다시 탭하면 수정 · 두 손가락으로 크기와 회전</Text>
          </View>
        );
      case 'sticker':
        return (
          <View style={styles.panelInner}>
            <ChipRow options={STICKER_GROUPS.map((g) => ({ key: g, label: g }))} value={stickerGroup} onChange={setStickerGroup} />
            <EmojiGrid emojis={STICKERS.filter((s) => s.group === stickerGroup)} onPick={addSticker} />
          </View>
        );
      case 'lens':
        return (
          <View style={[styles.panelInner, { justifyContent: 'center' }]}>
            <Text style={styles.hint} numberOfLines={1}>
              {faceStatus}
            </Text>
            <TileRow
              tiles={[
                { key: 'none', label: translate('ar.none'), icon: '🚫' },
                ...AR_EFFECTS.map((e) => ({
                  key: e.id,
                  label: translate(e.labelKey),
                  image: AR_SPRITES[e.thumb].src,
                  disabled: !hasFaces && !e.ambient,
                })),
                { key: TRAVEL_STAMP, label: translate('ar.travelStamp'), icon: STAMP_ICON },
              ]}
              selected={state.arId ?? state.lensId ?? 'none'}
              onSelect={(key) =>
                apply((s) => ({
                  ...s,
                  arId: key === 'none' || key === TRAVEL_STAMP ? null : key,
                  lensId: key === TRAVEL_STAMP ? key : null,
                }))
              }
            />
          </View>
        );
      case 'frame':
        return (
          <View style={[styles.panelInner, { justifyContent: 'center' }]}>
            <TileRow
              tiles={[{ key: 'none', label: '없음', icon: '🚫' }, ...FRAMES.map((f) => ({ key: f.id, label: f.label, swatch: f.swatch }))]}
              selected={state.frameId ?? 'none'}
              onSelect={(key) => apply((s) => ({ ...s, frameId: key === 'none' ? null : key }))}
            />
          </View>
        );
      default:
        return null;
    }
  };

  if (tool === 'crop') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="light" />
        <CropView
          base={state.base}
          busy={busy}
          onTransform={(op) => void runTransform(op)}
          onApply={(crop) => void applyCrop(crop)}
          onCancel={() => setTool('beauty')}
        />
      </View>
    );
  }

  const onArea = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width: width - 16, height: height - 16 });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <Pressable onPress={requestClose} hitSlop={10} style={styles.topBtn}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <View style={styles.topCenter}>
          <Pressable onPress={history.undo} disabled={!history.canUndo} hitSlop={8} style={styles.topBtn}>
            <Ionicons name="arrow-undo" size={22} color={history.canUndo ? '#fff' : 'rgba(255,255,255,0.3)'} />
          </Pressable>
          <Pressable onPress={history.redo} disabled={!history.canRedo} hitSlop={8} style={styles.topBtn}>
            <Ionicons name="arrow-redo" size={22} color={history.canRedo ? '#fff' : 'rgba(255,255,255,0.3)'} />
          </Pressable>
          <Pressable
            onPressIn={() => setShowOriginal(true)}
            onPressOut={() => setShowOriginal(false)}
            hitSlop={8}
            style={[styles.compareBtn, showOriginal && styles.compareBtnOn]}
          >
            <Ionicons name="git-compare-outline" size={18} color="#fff" />
            <Text style={styles.compareText}>비교</Text>
          </Pressable>
        </View>
        <Pressable onPress={finish} disabled={saving || !image} style={styles.doneBtn}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.doneText}>{doneLabel}</Text>}
        </Pressable>
      </View>

      <View style={styles.stage} onLayout={onArea}>
        {image && scale > 0 ? (
          <GestureDetector gesture={gesture}>
            <View style={{ width: canvasW, height: canvasH }} collapsable={false}>
              <Canvas style={{ width: canvasW, height: canvasH }}>
                <EditorScene
                  image={image}
                  model={model}
                  effect={effect}
                  arImages={arImages}
                  scale={scale}
                  original={showOriginal}
                />
              </Canvas>
              {selectedDraw && !showOriginal ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.selection,
                    {
                      left: selectedDraw.cx * scale - selectedDraw.halfW * selectedDraw.scale * scale - 6,
                      top: selectedDraw.cy * scale - selectedDraw.halfH * selectedDraw.scale * scale - 6,
                      width: selectedDraw.halfW * 2 * selectedDraw.scale * scale + 12,
                      height: selectedDraw.halfH * 2 * selectedDraw.scale * scale + 12,
                      transform: [{ rotate: `${selectedDraw.rotation}rad` }],
                    },
                  ]}
                />
              ) : null}
            </View>
          </GestureDetector>
        ) : (
          <ActivityIndicator color="#fff" />
        )}
        {showOriginal ? (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>원본</Text>
          </View>
        ) : null}
        {busy ? (
          <View style={styles.stageBusy} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
        {selectedItem ? (
          <View style={styles.itemBar}>
            {selectedItem.kind === 'text' ? (
              <ItemBarButton icon="create-outline" label="수정" onPress={() => setTextSheet({ open: true, editId: selectedItem.id })} />
            ) : null}
            <ItemBarButton icon="copy-outline" label="복제" onPress={() => duplicateItem(selectedItem.id)} />
            <ItemBarButton icon="layers-outline" label="맨 앞" onPress={() => bringToFront(selectedItem.id)} />
            <ItemBarButton icon="trash-outline" label="삭제" onPress={() => deleteItem(selectedItem.id)} danger />
            <ItemBarButton icon="checkmark" label="완료" onPress={() => setSelectedId(null)} />
          </View>
        ) : null}
      </View>

      <View style={[styles.panel, { height: PANEL_HEIGHT }]}>{renderPanel()}</View>

      <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {TOOLS.map((t) => {
            const on = t.id === tool;
            return (
              <Pressable key={t.id} onPress={() => setTool(t.id)} style={styles.tab}>
                <Ionicons name={t.icon} size={21} color={on ? theme.colors.primaryLight : 'rgba(255,255,255,0.6)'} />
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <TextSheet
        visible={textSheet.open}
        initial={editingText ? { text: editingText.text, color: editingText.color, look: editingText.look, bold: editingText.bold } : null}
        onClose={() => setTextSheet({ open: false, editId: null })}
        onSubmit={submitText}
        onDelete={
          textSheet.editId
            ? () => {
                deleteItem(textSheet.editId as string);
                setTextSheet({ open: false, editId: null });
              }
            : undefined
        }
      />

      {saving ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.loadingText}>저장하는 중…</Text>
        </View>
      ) : null}
    </View>
  );
}

function ItemBarButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.itemBarBtn} hitSlop={4}>
      <Ionicons name={icon} size={18} color={danger ? '#FF8A8A' : '#fff'} />
      <Text style={[styles.itemBarText, danger && { color: '#FF8A8A' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0A0C' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 32 },
  errorBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.primary },
  errorBtnText: { color: '#FFFFFF', fontWeight: '800' },
  topBar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  topCenter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 10,
    marginLeft: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  compareBtnOn: { backgroundColor: theme.colors.primary },
  compareText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  doneBtn: {
    minWidth: 76,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  doneText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  stageBusy: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  selection: { position: 'absolute', borderWidth: 1.5, borderColor: '#FFFFFF', borderStyle: 'dashed', borderRadius: 6 },
  badge: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  itemBar: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(20,14,17,0.88)',
  },
  itemBarBtn: { alignItems: 'center', paddingHorizontal: 8, gap: 2 },
  itemBarText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  panel: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  panelInner: { flex: 1, paddingTop: 8, gap: 4 },
  centerPanel: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16 },
  bigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  bigButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#140E11',
  },
  tabsContent: { paddingHorizontal: 6 },
  tab: { width: 62, alignItems: 'center', gap: 2, paddingVertical: 4 },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' },
  tabTextOn: { color: '#FFFFFF', fontWeight: '800' },
  savingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
