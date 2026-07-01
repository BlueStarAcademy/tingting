import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Switch, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import type { Visit } from '@tingting/shared';
import { AI_EFFECTS } from '@tingting/shared';
import {
  EDITOR_ASSETS,
  getAssetsByType,
  isAssetUnlocked,
  type EditorAsset,
} from '@/lib/editor-assets';
import { useLocale } from '@/hooks/useLocale';
import { pickPhoto } from '@/lib/pick-photo';
import { theme } from '@/constants/theme';

export default function EditorScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeStickers, setActiveStickers] = useState<string[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.getVisit(visitId).then((v) => {
        setVisit(v);
        setPreviewUri(v?.editedPhotoUri ?? v?.photoUri ?? null);
        setActiveFilter(v?.filter ?? null);
      });
      api.getUnlockedEditorAssets().then(setUnlockedIds);
    }, [visitId])
  );

  const applyFilter = async (asset: EditorAsset) => {
    if (!visit) return;
    if (!isAssetUnlocked(asset, unlockedIds)) {
      promptUnlock(asset);
      return;
    }
    setLoading(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        visit.photoUri,
        [{ resize: { width: 800 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPreviewUri(result.uri);
      setActiveFilter(asset.name);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('editor.filterFailed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleSticker = (asset: EditorAsset) => {
    if (!isAssetUnlocked(asset, unlockedIds)) {
      promptUnlock(asset);
      return;
    }
    setActiveStickers((prev) =>
      prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id]
    );
  };

  const promptUnlock = (asset: EditorAsset) => {
    Alert.alert(
      t('editor.unlockTitle'),
      t('editor.unlockMessage', { name: asset.name, cost: asset.starCost }),
      [
        { text: t('header.cancel'), style: 'cancel' },
        { text: t('editor.unlock'), onPress: () => unlockAsset(asset) },
      ]
    );
  };

  const unlockAsset = async (asset: EditorAsset) => {
    try {
      await api.unlockEditorAsset(asset.id, asset.starCost);
      setUnlockedIds((prev) => [...prev, asset.id]);
      Alert.alert(t('editor.unlockDone'), t('editor.unlockDoneMessage', { name: asset.name }));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    }
  };

  const applyBrightness = async (label: string, featureKey: string) => {
    if (!visit) return;
    setLoading(true);
    try {
      await api.useAiFeature(featureKey);
      const result = await ImageManipulator.manipulateAsync(
        visit.photoUri,
        [{ resize: { width: 800 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPreviewUri(result.uri);
      setActiveFilter(label);
      Alert.alert(label, 'AI 효과가 적용되었습니다 (클라이언트 미리보기)');
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  };

  const applySkyTint = async () => {
    if (!visit) return;
    setLoading(true);
    try {
      await api.useAiFeature('sky');
      const result = await ImageManipulator.manipulateAsync(
        visit.photoUri,
        [{ resize: { width: 800 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      setPreviewUri(result.uri);
      setActiveFilter(AI_EFFECTS.sky.label);
      Alert.alert(AI_EFFECTS.sky.label, '하늘 효과가 적용되었습니다');
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!visit || !previewUri) return;
    await api.updateVisit(visit.id, { editedPhotoUri: previewUri, filter: activeFilter ?? undefined });
    Alert.alert(t('editor.saved'), t('editor.savedMessage'));
    router.back();
  };

  const replacePhoto = async () => {
    if (!visit) return;
    const photoUri = await pickPhoto({
      upload: t('visits.replacePhoto'),
      fromLibrary: t('visits.fromLibrary'),
      fromCamera: t('visits.fromCamera'),
      cancel: t('header.cancel'),
      libraryPermissionTitle: t('visits.permissionTitle'),
      libraryPermissionMessage: t('visits.permissionMessage'),
      cameraPermissionTitle: t('visits.cameraPermissionTitle'),
      cameraPermissionMessage: t('visits.cameraPermissionMessage'),
    });
    if (!photoUri) return;
    setLoading(true);
    try {
      const updated = await api.replaceVisitPhoto(visit.id, photoUri);
      setVisit(updated);
      setPreviewUri(photoUri);
      setActiveFilter(null);
      setActiveStickers([]);
      Alert.alert(t('editor.saved'), t('editor.photoReplaced'));
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    } finally {
      setLoading(false);
    }
  };

  const deleteVisit = () => {
    if (!visit) return;
    Alert.alert(t('visits.delete'), t('visits.deleteConfirm'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('visits.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteVisit(visit.id);
            router.back();
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
          }
        },
      },
    ]);
  };

  if (!visit || !previewUri) return null;

  const filters = getAssetsByType('filter');
  const stickers = getAssetsByType('sticker');

  return (
    <AppScreen title={t('editor.title')} showBack contentStyle={styles.scroll}>
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.preview} />
          {activeStickers.map((id) => {
            const asset = EDITOR_ASSETS.find((a) => a.id === id);
            if (!asset?.emoji) return null;
            return (
              <Text key={id} style={styles.stickerOverlay}>
                {asset.emoji}
              </Text>
            );
          })}
          {watermark ? <Text style={styles.watermark}>TingTing</Text> : null}
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('editor.watermark')}</Text>
          <Switch value={watermark} onValueChange={setWatermark} />
        </View>

        <Text style={styles.section}>{t('editor.filters')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetRow}>
          {filters.map((asset) => {
            const unlocked = isAssetUnlocked(asset, unlockedIds);
            return (
              <Pressable
                key={asset.id}
                style={[styles.assetChip, activeFilter === asset.name && styles.assetChipActive, !unlocked && styles.assetLocked]}
                onPress={() => applyFilter(asset)}
              >
                <View style={[styles.filterSwatch, { backgroundColor: asset.previewColor ?? '#666' }]} />
                <Text style={styles.assetName}>{asset.name}</Text>
                {!unlocked ? <Text style={styles.lockLabel}>✦ {asset.starCost}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.section}>{t('editor.stickers')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assetRow}>
          {stickers.map((asset) => {
            const unlocked = isAssetUnlocked(asset, unlockedIds);
            const active = activeStickers.includes(asset.id);
            return (
              <Pressable
                key={asset.id}
                style={[styles.stickerChip, active && styles.assetChipActive, !unlocked && styles.assetLocked]}
                onPress={() => toggleSticker(asset)}
              >
                <Text style={styles.stickerEmoji}>{asset.emoji ?? '⭐'}</Text>
                <Text style={styles.assetName}>{asset.name}</Text>
                {!unlocked ? <Text style={styles.lockLabel}>✦ {asset.starCost}</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.section}>{t('editor.ai')}</Text>
        <PremiumButton title={AI_EFFECTS.bbosyap.label + ' (AI)'} onPress={() => applyBrightness(AI_EFFECTS.bbosyap.label, 'bbosyap')} loading={loading} />
        <PremiumButton title={AI_EFFECTS.sky.label + ' (AI)'} onPress={applySkyTint} loading={loading} variant="outline" />
        <PremiumButton title={t('editor.save')} onPress={save} />
        <PremiumButton title={t('visits.replacePhoto')} onPress={replacePhoto} loading={loading} variant="outline" />
        <PremiumButton title={t('editor.deleteVisit')} onPress={deleteVisit} variant="outline" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: theme.spacing.sm },
  previewWrap: { position: 'relative' },
  preview: { width: '100%', height: 280, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  stickerOverlay: { position: 'absolute', bottom: 24, right: 24, fontSize: 36 },
  watermark: { position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: theme.colors.text },
  section: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: theme.spacing.sm },
  assetRow: { marginBottom: theme.spacing.sm },
  assetChip: {
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    minWidth: 72,
  },
  stickerChip: {
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    minWidth: 64,
  },
  assetChipActive: { borderColor: theme.colors.primaryLight },
  assetLocked: { opacity: 0.65 },
  filterSwatch: { width: 36, height: 36, borderRadius: 18, marginBottom: 4 },
  stickerEmoji: { fontSize: 28, marginBottom: 4 },
  assetName: { color: theme.colors.text, fontSize: 11, fontWeight: '600' },
  lockLabel: { color: theme.colors.star, fontSize: 10, fontWeight: '700', marginTop: 2 },
});
