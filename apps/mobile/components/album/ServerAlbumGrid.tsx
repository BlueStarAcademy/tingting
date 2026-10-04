import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRegion, type AlbumScope, type AlbumTarget, type Photo } from '@tingting/shared';
import { ActionSheet } from '@/components/album/ActionSheet';
import { AlbumTargetSheet } from '@/components/album/AlbumTargetSheet';
import { GRID_COLUMNS, GRID_GAP, PhotoTile, tileSize } from '@/components/album/PhotoTile';
import { PhotoViewer, type ViewerAction } from '@/components/album/PhotoViewer';
import { SELECTION_BAR_HEIGHT, SelectionBar, type SelectionAction } from '@/components/album/SelectionBar';
import { useToast } from '@/components/album/Toast';
import { ActionButton, EmptyState } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { useSelection } from '@/hooks/useSelection';
import { api } from '@/lib/api';
import { formatTimestamp } from '@/lib/dates';
import { pickGalleryPhoto, pickGalleryPhotos } from '@/lib/pick-photo';
import { displayUri, uploadPhotosTo, type PhotoPlacement } from '@/lib/photo-flow';
import { DevicePermissionError, savePhotosToDevice } from '@/lib/save-photo';
import { getMainTabBarBottomInset } from '@/constants/layout';
import { theme } from '@/constants/theme';

const PAGE = 60;
const MAX_PAGE = 200;

function scopeTarget(scope: AlbumScope): AlbumTarget | undefined {
  if (scope.kind === 'region') return { kind: 'region', regionCode: scope.regionCode };
  if (scope.kind === 'folder') return { kind: 'folder', folderId: scope.folderId };
  if (scope.kind === 'unsorted') return { kind: 'none' };
  return undefined;
}

function scopePlacement(scope: AlbumScope): PhotoPlacement | null {
  if (scope.kind === 'region') return { regionCode: scope.regionCode };
  if (scope.kind === 'folder') return { folderId: scope.folderId };
  return null;
}

function editorQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  return q.toString();
}

/** Paged keyset loading for one album scope. */
function useAlbumPhotos(scope: AlbumScope) {
  const [items, setItems] = useState<Photo[] | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);
  const itemsRef = useRef<Photo[] | null>(null);
  itemsRef.current = items;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  /** Reload from the top, keeping as many photos as are on screen so scroll position survives. */
  const reload = useCallback(async (opts: { pull?: boolean; reset?: boolean } = {}) => {
    const id = ++requestId.current;
    if (opts.reset) {
      setItems(null);
      setCursor(undefined);
      setError(null);
    }
    if (opts.pull) setRefreshing(true);
    const keep = opts.reset ? 0 : itemsRef.current?.length ?? 0;
    try {
      const page = await api.listAlbumPhotos(scopeRef.current, { limit: Math.min(MAX_PAGE, Math.max(PAGE, keep)) });
      if (id !== requestId.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setError(null);
    } catch (e) {
      if (id !== requestId.current) return;
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      if (opts.pull && id === requestId.current) setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await api.listAlbumPhotos(scopeRef.current, { cursor, limit: PAGE });
      if (id !== requestId.current) return;
      setItems((prev) => {
        const seen = new Set((prev ?? []).map((p) => p.id));
        return [...(prev ?? []), ...page.items.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.nextCursor);
    } catch {
      // the next scroll retries
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  return { items, setItems, error, refreshing, loadingMore, hasMore: Boolean(cursor), reload, loadMore };
}

type Props = {
  scope: AlbumScope;
  /** Only the visible sub-tab refreshes on focus */
  active: boolean;
  title: string;
  subtitle?: string;
  header?: ReactElement | null;
  emptyTitle: string;
  emptyMessage: string;
  /** Called after anything that changes counts (upload, move, copy, delete) */
  onChanged?: () => void;
  /** Extra right-side control in the toolbar (e.g. folder menu) */
  toolbarExtra?: ReactElement | null;
};

export function ServerAlbumGrid({ scope, active, title, subtitle, header, emptyTitle, emptyMessage, onChanged, toolbarExtra }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const width = useContentWidth() - theme.spacing.lg * 2;
  const size = tileSize(width);
  const scopeKey = JSON.stringify(scope);
  const { items, setItems, error, refreshing, loadingMore, reload, loadMore } = useAlbumPhotos(scope);
  const selection = useSelection();
  const [toast, showToast] = useToast();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState<{ mode: 'move' | 'copy'; ids: string[] } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const placement = scopePlacement(scope);
  const current = scopeTarget(scope);

  useEffect(() => {
    selection.done();
    setViewerIndex(null);
    void reload({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (active) void reload();
    }, [active, reload]),
  );
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) void reload();
    wasActive.current = active;
  }, [active, reload]);

  useEffect(() => {
    if (items) selection.retain(items.map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const selectedIds = useMemo(() => [...selection.selected], [selection.selected]);
  const selectedPhotos = useMemo(() => (items ?? []).filter((p) => selection.selected.has(p.id)), [items, selection.selected]);

  const run = async (fn: () => Promise<string | null | void>) => {
    setBusy(true);
    try {
      const message = await fn();
      showToast(message || null);
    } catch (e) {
      showToast(null);
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('album.loadFailed'));
    } finally {
      setBusy(false);
    }
  };

  const afterChange = async (removedIds: string[] = []) => {
    if (removedIds.length) {
      const gone = new Set(removedIds);
      setItems((prev) => (prev ? prev.filter((p) => !gone.has(p.id)) : prev));
    }
    selection.done();
    onChanged?.();
    await reload();
  };

  const transfer = (mode: 'move' | 'copy', ids: string[], target: AlbumTarget) =>
    run(async () => {
      showToast(t('album.working'), true);
      if (mode === 'move') {
        const { updated } = await api.movePhotos(ids, target);
        await afterChange(ids);
        return t('album.moved', { count: updated });
      }
      const { items: created } = await api.copyPhotos(ids, target);
      await afterChange();
      return t('album.copied', { count: created.length });
    });

  const confirmDelete = (ids: string[]) =>
    Alert.alert(t('album.deleteTitle'), t('album.deleteMessage', { count: ids.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('album.action.delete'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            const { deleted } = await api.deletePhotos(ids);
            await afterChange(ids);
            return t('album.deleted', { count: deleted });
          }),
      },
    ]);

  const saveToPhone = (photos: Photo[]) =>
    run(async () => {
      showToast(t('album.working'), true);
      try {
        const ok = await savePhotosToDevice(photos.map(displayUri), (done, total) =>
          showToast(t('album.uploading', { done, total }), true),
        );
        selection.done();
        return t('album.savedToPhone', { count: ok });
      } catch (e) {
        showToast(null);
        if (e instanceof DevicePermissionError) {
          Alert.alert(t('photos.savePermissionTitle'), t('photos.savePermissionMessage'));
          return null;
        }
        throw e;
      }
    });

  const edit = (photo: Photo) => {
    setViewerIndex(null);
    selection.done();
    router.push(`/editor?${editorQuery({ uri: displayUri(photo), photoId: photo.id })}` as Href);
  };

  const uploadFromGallery = async () => {
    if (!placement) return;
    const uris = await pickGalleryPhotos(30, {
      permissionTitle: t('visits.permissionTitle'),
      permissionMessage: t('visits.permissionMessage'),
    });
    if (uris.length === 0) return;
    showToast(t('album.uploading', { done: 0, total: uris.length }), true);
    const ok = await uploadPhotosTo(
      uris.map((uri) => ({ uri })),
      placement,
      (done, total) => showToast(t('album.uploading', { done, total }), true),
    );
    showToast(
      ok === uris.length ? t('album.uploadDone', { count: ok }) : t('album.uploadPartial', { ok, failed: uris.length - ok }),
    );
    onChanged?.();
    await reload();
  };

  const placementQuery = placement
    ? { regionCode: placement.regionCode ?? undefined, folderId: placement.folderId ?? undefined, back: '1' }
    : {};

  const uploadFromCamera = () => router.push(`/capture?${editorQuery(placementQuery)}` as Href);

  const uploadEdited = async () => {
    const uri = await pickGalleryPhoto({
      permissionTitle: t('visits.permissionTitle'),
      permissionMessage: t('visits.permissionMessage'),
    });
    if (!uri) return;
    router.push(`/editor?${editorQuery({ uri, ...placementQuery })}` as Href);
  };

  const selectionActions: SelectionAction[] = [
    { key: 'move', icon: 'arrow-redo-outline', label: t('album.action.move'), onPress: () => setSheet({ mode: 'move', ids: selectedIds }) },
    { key: 'copy', icon: 'copy-outline', label: t('album.action.copy'), onPress: () => setSheet({ mode: 'copy', ids: selectedIds }) },
    {
      key: 'edit',
      icon: 'color-wand-outline',
      label: t('album.action.edit'),
      disabled: selectedPhotos.length !== 1,
      onPress: () => (selectedPhotos.length === 1 ? edit(selectedPhotos[0]) : showToast(t('album.editOne'))),
    },
    { key: 'save', icon: 'download-outline', label: t('album.action.saveToPhone'), onPress: () => saveToPhone(selectedPhotos) },
    { key: 'delete', icon: 'trash-outline', label: t('album.action.delete'), danger: true, onPress: () => confirmDelete(selectedIds) },
  ];

  const viewerItems = useMemo(
    () =>
      (items ?? []).map((photo) => ({
        key: photo.id,
        uri: displayUri(photo),
        caption: [formatTimestamp(photo.takenAt), photo.placeName ?? (photo.regionCode ? getRegion(photo.regionCode)?.name : undefined)]
          .filter(Boolean)
          .join(' · '),
        photo,
      })),
    [items],
  );

  const viewerActions = (item: (typeof viewerItems)[number]): ViewerAction[] => [
    { key: 'edit', icon: 'color-wand', label: t('album.action.edit'), primary: true, onPress: () => edit(item.photo) },
    { key: 'save', icon: 'download-outline', label: t('album.action.saveToPhone'), onPress: () => saveToPhone([item.photo]) },
    {
      key: 'move',
      icon: 'arrow-redo-outline',
      label: t('album.action.move'),
      onPress: () => {
        setViewerIndex(null);
        setSheet({ mode: 'move', ids: [item.photo.id] });
      },
    },
    {
      key: 'copy',
      icon: 'copy-outline',
      label: t('album.action.copy'),
      onPress: () => {
        setViewerIndex(null);
        setSheet({ mode: 'copy', ids: [item.photo.id] });
      },
    },
    { key: 'delete', icon: 'trash-outline', label: t('album.action.delete'), danger: true, onPress: () => confirmDelete([item.photo.id]) },
    {
      key: 'detail',
      icon: 'information-circle-outline',
      label: t('album.action.detail'),
      onPress: () => {
        setViewerIndex(null);
        router.push(`/photo/${item.photo.id}` as Href);
      },
    },
  ];

  const bottomPad = getMainTabBarBottomInset(insets.bottom) + theme.spacing.xl + (selection.selecting ? SELECTION_BAR_HEIGHT : 0);
  const count = items?.length ?? 0;

  const listHeader = (
    <View>
      {header}
      <View style={styles.toolbar}>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {toolbarExtra}
        {count > 0 && !selection.selecting ? (
          <Pressable onPress={selection.enter} hitSlop={8} style={styles.selectBtn}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primaryDark} />
          </Pressable>
        ) : null}
      </View>
      {placement ? (
        <ActionButton icon="add-circle-outline" label={t('album.add')} onPress={() => setAddOpen(true)} style={styles.addBtn} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.flex}>
      <FlatList
        data={items ?? []}
        keyExtractor={(p) => p.id}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onChanged?.();
              void reload({ pull: true });
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        removeClippedSubviews
        windowSize={7}
        initialNumToRender={24}
        ListEmptyComponent={
          items === null ? (
            error ? (
              <EmptyState icon="cloud-offline-outline" title={t('album.loadFailed')} message={error}>
                <ActionButton icon="refresh" label={t('album.retry')} onPress={() => reload({ reset: true })} />
              </EmptyState>
            ) : (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            )
          ) : (
            <EmptyState icon="images-outline" title={emptyTitle} message={emptyMessage} />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={styles.more} /> : null}
        renderItem={({ item, index }) => (
          <PhotoTile
            uri={displayUri(item)}
            size={size}
            edited={Boolean(item.editedUri)}
            selecting={selection.selecting}
            selected={selection.selected.has(item.id)}
            onPress={() => (selection.selecting ? selection.toggle(item.id) : setViewerIndex(index))}
            onLongPress={() => (selection.selecting ? selection.toggle(item.id) : selection.start(item.id))}
          />
        )}
      />

      {toast}

      {selection.selecting ? (
        <SelectionBar
          count={selection.selected.size}
          allSelected={count > 0 && selection.selected.size === count}
          onToggleAll={() => (selection.selected.size === count ? selection.setAll([]) : selection.setAll((items ?? []).map((p) => p.id)))}
          onDone={selection.done}
          actions={selectionActions}
        />
      ) : null}

      <PhotoViewer
        items={viewerItems}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        actionsFor={viewerActions}
        onEndReached={loadMore}
        busy={busy}
      />

      <AlbumTargetSheet
        visible={sheet !== null}
        title={sheet?.mode === 'copy' ? t('album.target.copyTitle') : t('album.target.moveTitle')}
        current={sheet?.mode === 'move' ? current : undefined}
        allowUnsorted={sheet?.mode === 'move'}
        onClose={() => setSheet(null)}
        onPick={(target) => sheet && transfer(sheet.mode, sheet.ids, target)}
      />

      <ActionSheet
        visible={addOpen}
        title={t('album.addTitle')}
        onClose={() => setAddOpen(false)}
        options={[
          { key: 'gallery', icon: 'images-outline', label: t('album.addFromGallery'), onPress: uploadFromGallery },
          { key: 'camera', icon: 'camera-outline', label: t('album.addFromCamera'), onPress: uploadFromCamera },
          { key: 'edit', icon: 'color-wand-outline', label: t('album.addEdit'), onPress: uploadEdited },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg },
  row: { gap: GRID_GAP },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  selectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  addBtn: { marginBottom: theme.spacing.md },
  loader: { marginTop: theme.spacing.xl },
  more: { marginVertical: theme.spacing.md },
});
