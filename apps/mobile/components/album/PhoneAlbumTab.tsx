import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { PermissionResponse } from 'expo-media-library';
import type { AlbumTarget } from '@tingting/shared';
import { AlbumTargetSheet } from '@/components/album/AlbumTargetSheet';
import { afterSheetClose } from '@/components/album/ActionSheet';
import { NamePromptModal } from '@/components/album/NamePromptModal';
import { GRID_COLUMNS, GRID_GAP, PhotoTile, tileSize } from '@/components/album/PhotoTile';
import { PhotoViewer, type ViewerAction } from '@/components/album/PhotoViewer';
import { SELECTION_BAR_HEIGHT, SelectionBar, type SelectionAction } from '@/components/album/SelectionBar';
import { useToast } from '@/components/album/Toast';
import { AppModal } from '@/components/AppModal';
import { SheetHeader } from '@/components/SheetHeader';
import { ActionButton, EmptyState } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { useSelection } from '@/hooks/useSelection';
import {
  allPhotosCover,
  copyToDeviceAlbum,
  createDeviceAlbum,
  deleteDevicePhotos,
  getPhotoPermission,
  listDeviceAlbums,
  listDevicePhotos,
  moveToDeviceAlbum,
  onLibraryChange,
  openAppSettings,
  photoDisplayUri,
  pickMoreLimitedPhotos,
  PHOTO_PAGE,
  readableUri,
  requestPhotoPermission,
  systemConfirmsDelete,
  takenAtIso,
  type DeviceAlbum,
  type DeviceAlbumRef,
  type DevicePhoto,
} from '@/lib/device-gallery';
import { formatTimestamp } from '@/lib/dates';
import { breadcrumb, logError, logEvent } from '@/lib/diagnostics';
import { placementFromTarget, uploadPhotosTo } from '@/lib/photo-flow';
import { getMainTabBarBottomInset } from '@/constants/layout';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

const CARD_GAP = 12;

type Transfer = { mode: 'move' | 'copy'; ids: string[] };

let lastPermission = '';

/** Reports permission results to diagnostics; repeated identical checks are reported once. */
function reportPermission(event: string, p: PermissionResponse) {
  const key = `${p.status}/${p.accessPrivileges ?? ''}`;
  if (event === 'media_permission_check' && key === lastPermission) return;
  lastPermission = key;
  logEvent(event, { status: p.status, granted: p.granted, canAskAgain: p.canAskAgain, access: p.accessPrivileges });
}

export function PhoneAlbumTab({ active }: { active: boolean }) {
  const { t } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const width = useContentWidth() - theme.spacing.lg * 2;
  const size = tileSize(width);
  const cardWidth = Math.floor((width - CARD_GAP) / 2);

  const [perm, setPerm] = useState<PermissionResponse | null>(null);
  const [albums, setAlbums] = useState<DeviceAlbum[] | null>(null);
  const [allCover, setAllCover] = useState<string | undefined>();
  const [view, setView] = useState<DeviceAlbumRef | null>(null);
  const [photos, setPhotos] = useState<DevicePhoto[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [deviceSheet, setDeviceSheet] = useState<Transfer | null>(null);
  const [uploadIds, setUploadIds] = useState<string[] | null>(null);
  const [namePrompt, setNamePrompt] = useState<{ transfer?: Transfer } | null>(null);
  /** Picking photos for a new album started from the album list */
  const [newAlbumName, setNewAlbumName] = useState<string | null>(null);
  const selection = useSelection();
  const [toast, showToast] = useToast();
  const requestId = useRef(0);
  const viewRef = useRef(view);
  viewRef.current = view;
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const granted = Boolean(perm?.granted);

  const checkPermission = useCallback(async () => {
    try {
      const next = await getPhotoPermission();
      setPerm(next);
      reportPermission('media_permission_check', next);
      return next;
    } catch (e) {
      logError('media_permission_check', e);
      setPerm(null);
      return null;
    }
  }, []);

  const loadAlbums = useCallback(async () => {
    const started = Date.now();
    try {
      const [list, cover] = await Promise.all([listDeviceAlbums(), allPhotosCover()]);
      setAlbums(list);
      setAllCover(cover);
      setError(null);
      breadcrumb('device_albums', { count: list.length, ms: Date.now() - started });
    } catch (e) {
      logError('device_albums', e, { ms: Date.now() - started });
      setError(e instanceof Error ? e.message : t('album.phone.failed'));
      setAlbums((prev) => prev ?? []);
    }
  }, [t]);

  /** Reload the open album, keeping as many photos as are loaded. */
  const loadPhotos = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      const target = viewRef.current;
      if (!target) return;
      const id = ++requestId.current;
      if (opts.reset) setPhotos(null);
      const keep = opts.reset ? PHOTO_PAGE : Math.max(PHOTO_PAGE, photosRef.current?.length ?? 0);
      const started = Date.now();
      try {
        const rows = await listDevicePhotos(target.id, 0, keep);
        breadcrumb('device_photos', { count: rows.length, ms: Date.now() - started });
        if (id !== requestId.current) return;
        setPhotos(rows);
        setHasMore(rows.length === keep);
        setError(null);
      } catch (e) {
        logError('device_photos', e, { ms: Date.now() - started });
        if (id !== requestId.current) return;
        setError(e instanceof Error ? e.message : t('album.phone.failed'));
        setPhotos((prev) => prev ?? []);
      }
    },
    [t],
  );

  const loadMore = useCallback(async () => {
    const target = viewRef.current;
    if (!target || !hasMore || loadingMore || !photosRef.current) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const rows = await listDevicePhotos(target.id, photosRef.current.length);
      if (id !== requestId.current) return;
      setPhotos((prev) => {
        const seen = new Set((prev ?? []).map((p) => p.id));
        return [...(prev ?? []), ...rows.filter((p) => !seen.has(p.id))];
      });
      setHasMore(rows.length === PHOTO_PAGE);
    } catch {
      // the next scroll retries
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  /** One refresh at a time; triggers that arrive meanwhile collapse into a single follow-up run. */
  const refreshState = useRef<{ running: boolean; again: boolean }>({ running: false, again: false });
  const refreshAll = useCallback(async () => {
    const state = refreshState.current;
    if (state.running) {
      state.again = true;
      return;
    }
    state.running = true;
    try {
      do {
        state.again = false;
        const p = await checkPermission();
        if (!p?.granted) break;
        await Promise.all([loadAlbums(), viewRef.current ? loadPhotos() : Promise.resolve()]);
      } while (state.again);
    } finally {
      state.running = false;
    }
  }, [checkPermission, loadAlbums, loadPhotos]);

  // First activation, focus returns (editor, settings) and app resume.
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    logEvent('phone_album_mount');
  }, []);
  useEffect(() => {
    if (active) void refreshAll();
  }, [active, refreshAll]);
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (activeRef.current) void refreshAll();
    }, [refreshAll]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && activeRef.current) void refreshAll();
    });
    return () => sub.remove();
  }, [refreshAll]);
  useEffect(() => {
    if (!granted) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const remove = onLibraryChange(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (activeRef.current) void refreshAll();
      }, 600);
    });
    return () => {
      if (timer) clearTimeout(timer);
      remove();
    };
  }, [granted, refreshAll]);

  useEffect(() => {
    if (photos) selection.retain(photos.map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const openAlbum = (ref: DeviceAlbumRef) => {
    selection.done();
    setViewerIndex(null);
    viewRef.current = ref;
    setView(ref);
    void loadPhotos({ reset: true });
  };

  const closeAlbum = () => {
    selection.done();
    setNewAlbumName(null);
    requestId.current += 1;
    setView(null);
    setPhotos(null);
    void loadAlbums();
  };

  const run = async (fn: () => Promise<string | null | void>) => {
    setBusy(true);
    try {
      const message = await fn();
      showToast(message || null);
    } catch (e) {
      showToast(null);
      Alert.alert(t('album.phone.failed'), e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const afterDeviceChange = async () => {
    selection.done();
    setNewAlbumName(null);
    await Promise.all([loadAlbums(), loadPhotos()]);
  };

  const requestAccess = async () => {
    const next = await requestPhotoPermission().catch((e) => {
      logError('media_permission_request', e);
      return null;
    });
    if (next) reportPermission('media_permission_request', next);
    setPerm(next);
    if (next?.granted) void refreshAll();
  };

  const remove = (ids: string[]) => {
    const go = () =>
      run(async () => {
        await deleteDevicePhotos(ids);
        setViewerIndex(null);
        await afterDeviceChange();
        return t('album.deleted', { count: ids.length });
      });
    if (systemConfirmsDelete()) {
      void go();
      return;
    }
    Alert.alert(t('album.phone.deleteTitle'), t('album.phone.deleteMessage', { count: ids.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('album.action.delete'), style: 'destructive', onPress: () => void go() },
    ]);
  };

  const transferTo = (transfer: Transfer, albumId: string) =>
    run(async () => {
      showToast(t('album.working'), true);
      if (transfer.mode === 'move') {
        await moveToDeviceAlbum(transfer.ids, albumId);
        await afterDeviceChange();
        return t('album.moved', { count: transfer.ids.length });
      }
      const ok = await copyToDeviceAlbum(transfer.ids, albumId);
      await afterDeviceChange();
      return t('album.copied', { count: ok });
    });

  const createAlbumWith = (name: string, transfer: Transfer) =>
    run(async () => {
      showToast(t('album.working'), true);
      await createDeviceAlbum(name, transfer.ids, transfer.mode === 'move');
      await afterDeviceChange();
      return t('album.phone.albumCreated', { name });
    });

  const edit = async (id: string) => {
    setViewerIndex(null);
    selection.done();
    const uri = await readableUri(id);
    router.push(`/editor?${new URLSearchParams({ uri, target: 'device', back: '1' }).toString()}` as Href);
  };

  const uploadTo = (ids: string[], target: AlbumTarget) =>
    run(async () => {
      const byId = new Map((photos ?? []).map((p) => [p.id, p]));
      showToast(t('album.uploading', { done: 0, total: ids.length }), true);
      const items = await Promise.all(
        ids.map(async (id) => {
          const p = byId.get(id);
          return { uri: await readableUri(id), takenAt: p ? takenAtIso(p) : undefined };
        }),
      );
      const ok = await uploadPhotosTo(items, placementFromTarget(target), (done, total) =>
        showToast(t('album.uploading', { done, total }), true),
      );
      selection.done();
      return ok === ids.length ? t('album.uploadDone', { count: ok }) : t('album.uploadPartial', { ok, failed: ids.length - ok });
    });

  const selectedIds = useMemo(() => [...selection.selected], [selection.selected]);
  const viewerItems = useMemo(
    () =>
      (photos ?? []).map((p) => ({
        key: p.id,
        uri: photoDisplayUri(p.id),
        caption: [p.creationTime ? formatTimestamp(new Date(p.creationTime).toISOString()) : null, p.filename]
          .filter(Boolean)
          .join(' · '),
      })),
    [photos],
  );
  const count = photos?.length ?? 0;
  const bottomPad = getMainTabBarBottomInset(insets.bottom) + theme.spacing.xl + (selection.selecting ? SELECTION_BAR_HEIGHT : 0);

  // ---- permission gate --------------------------------------------------
  if (!granted) {
    const blocked = perm !== null && !perm.canAskAgain;
    return (
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}>
        <EmptyState
          icon="phone-portrait-outline"
          title={t('album.phone.permissionTitle')}
          message={blocked ? t('album.phone.deniedMessage') : t('album.phone.permissionMessage')}
        >
          <ActionButton
            tone="primary"
            icon={blocked ? 'settings-outline' : 'lock-open-outline'}
            label={blocked ? t('album.phone.openSettings') : t('album.phone.allow')}
            onPress={blocked ? () => void openAppSettings() : requestAccess}
          />
        </EmptyState>
      </ScrollView>
    );
  }

  const limitedBanner =
    perm?.accessPrivileges === 'limited' ? (
      <Pressable style={styles.limited} onPress={() => pickMoreLimitedPhotos().then(refreshAll).catch(() => openAppSettings())}>
        <Ionicons name="eye-outline" size={16} color={theme.colors.accentDark} />
        <Text style={styles.limitedText}>{t('album.phone.limited')}</Text>
        <Text style={styles.limitedLink}>{t('album.phone.limitedMore')}</Text>
      </Pressable>
    ) : null;

  const sheets = (
    <>
      <DeviceAlbumSheet
        visible={deviceSheet !== null}
        title={deviceSheet?.mode === 'copy' ? t('album.phone.copyTitle') : t('album.phone.moveTitle')}
        albums={albums ?? []}
        currentId={view?.id ?? null}
        onClose={() => setDeviceSheet(null)}
        onPick={(albumId) => deviceSheet && transferTo(deviceSheet, albumId)}
        onNew={() => {
          const transfer = deviceSheet ?? undefined;
          setDeviceSheet(null);
          afterSheetClose(() => setNamePrompt({ transfer }));
        }}
      />
      <AlbumTargetSheet
        visible={uploadIds !== null}
        title={t('album.target.uploadTitle')}
        onClose={() => setUploadIds(null)}
        onPick={(target) => uploadIds && uploadTo(uploadIds, target)}
      />
      <NamePromptModal
        visible={namePrompt !== null}
        title={t('album.phone.newAlbumTitle')}
        placeholder={t('album.phone.newAlbumPlaceholder')}
        confirmLabel={t('album.folder.create')}
        onCancel={() => setNamePrompt(null)}
        onSubmit={async (name) => {
          const transfer = namePrompt?.transfer;
          setNamePrompt(null);
          if (transfer) {
            void createAlbumWith(name, transfer);
            return;
          }
          setNewAlbumName(name);
          openAlbum({ id: null, title: t('album.phone.allPhotos') });
          selection.enter();
        }}
      />
    </>
  );

  // ---- album list -------------------------------------------------------
  if (!view) {
    const cards: DeviceAlbum[] = albums ? [{ id: '', title: t('album.phone.allPhotos'), coverUri: allCover }, ...albums] : [];
    return (
      <View style={styles.flex}>
        <FlatList
          data={cards}
          keyExtractor={(a) => a.id || 'all'}
          numColumns={2}
          columnWrapperStyle={{ gap: CARD_GAP }}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await refreshAll();
                setRefreshing(false);
              }}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              {limitedBanner}
              <View style={styles.listHeader}>
                <Text style={styles.title}>{t('album.phone.albums')}</Text>
                <Pressable style={styles.newAlbum} onPress={() => setNamePrompt({})}>
                  <Ionicons name="add" size={16} color={theme.colors.primaryDark} />
                  <Text style={styles.newAlbumText}>{t('album.phone.newAlbum')}</Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            albums === null ? (
              <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
            ) : (
              <EmptyState icon="images-outline" title={error ?? t('album.phone.emptyAlbums')} />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
              onPress={() => openAlbum({ id: item.id || null, title: item.title })}
            >
              {item.coverUri ? (
                <Image source={{ uri: item.coverUri }} style={[styles.cover, { height: cardWidth - 16 }]} resizeMethod="resize" />
              ) : (
                <View style={[styles.cover, styles.coverEmpty, { height: cardWidth - 16 }]}>
                  <Ionicons name="images-outline" size={30} color={theme.colors.primaryLight} />
                </View>
              )}
              <Text style={styles.cardName} numberOfLines={1}>
                {item.title}
              </Text>
            </Pressable>
          )}
        />
        {toast}
        {sheets}
      </View>
    );
  }

  // ---- album photos -----------------------------------------------------
  const creating = newAlbumName !== null;
  const selectionActions: SelectionAction[] = creating
    ? [
        {
          key: 'create-move',
          icon: 'arrow-redo-outline',
          label: t('album.phone.newAlbumMove'),
          onPress: () => void createAlbumWith(newAlbumName!, { mode: 'move', ids: selectedIds }),
        },
        {
          key: 'create-copy',
          icon: 'copy-outline',
          label: t('album.phone.newAlbumCopy'),
          onPress: () => void createAlbumWith(newAlbumName!, { mode: 'copy', ids: selectedIds }),
        },
      ]
    : [
        { key: 'upload', icon: 'cloud-upload-outline', label: t('album.action.upload'), onPress: () => setUploadIds(selectedIds) },
        {
          key: 'edit',
          icon: 'color-wand-outline',
          label: t('album.action.edit'),
          disabled: selectedIds.length !== 1,
          onPress: () => (selectedIds.length === 1 ? void edit(selectedIds[0]) : showToast(t('album.editOne'))),
        },
        { key: 'move', icon: 'arrow-redo-outline', label: t('album.action.move'), onPress: () => setDeviceSheet({ mode: 'move', ids: selectedIds }) },
        { key: 'copy', icon: 'copy-outline', label: t('album.action.copy'), onPress: () => setDeviceSheet({ mode: 'copy', ids: selectedIds }) },
        { key: 'delete', icon: 'trash-outline', label: t('album.action.delete'), danger: true, onPress: () => remove(selectedIds) },
      ];

  const viewerActions = (item: { key: string }): ViewerAction[] => [
    { key: 'edit', icon: 'color-wand', label: t('album.action.edit'), primary: true, onPress: () => void edit(item.key) },
    {
      key: 'upload',
      icon: 'cloud-upload-outline',
      label: t('album.action.upload'),
      onPress: () => {
        setViewerIndex(null);
        setUploadIds([item.key]);
      },
    },
    {
      key: 'move',
      icon: 'arrow-redo-outline',
      label: t('album.action.move'),
      onPress: () => {
        setViewerIndex(null);
        setDeviceSheet({ mode: 'move', ids: [item.key] });
      },
    },
    {
      key: 'copy',
      icon: 'copy-outline',
      label: t('album.action.copy'),
      onPress: () => {
        setViewerIndex(null);
        setDeviceSheet({ mode: 'copy', ids: [item.key] });
      },
    },
    { key: 'delete', icon: 'trash-outline', label: t('album.action.delete'), danger: true, onPress: () => remove([item.key]) },
  ];

  return (
    <View style={styles.flex}>
      <FlatList
        data={photos ?? []}
        keyExtractor={(p) => p.id}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshAll();
              setRefreshing(false);
            }}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        removeClippedSubviews
        windowSize={7}
        initialNumToRender={15}
        maxToRenderPerBatch={9}
        ListHeaderComponent={
          <View>
            <Pressable onPress={closeAlbum} style={styles.back} hitSlop={6}>
              <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
              <Text style={styles.backText}>{t('album.phone.albums')}</Text>
            </Pressable>
            {limitedBanner}
            <View style={styles.listHeader}>
              <Text style={[styles.title, styles.flex]} numberOfLines={1}>
                {view.title}
              </Text>
              {count > 0 && !selection.selecting ? (
                <Pressable onPress={selection.enter} hitSlop={8} style={styles.selectBtn}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primaryDark} />
                </Pressable>
              ) : null}
            </View>
            {creating ? <Text style={styles.creating}>{t('album.phone.newAlbumPick', { name: newAlbumName })}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          photos === null ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : (
            <EmptyState icon="images-outline" title={error ?? t('album.phone.emptyPhotos')} />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={styles.loader} /> : null}
        renderItem={({ item, index }) => (
          <PhotoTile
            uri={photoDisplayUri(item.id)}
            size={size}
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
          title={creating ? `${newAlbumName} · ${t('album.select.count', { count: selection.selected.size })}` : undefined}
          allSelected={count > 0 && selection.selected.size === count}
          onToggleAll={() => (selection.selected.size === count ? selection.setAll([]) : selection.setAll((photos ?? []).map((p) => p.id)))}
          onDone={() => {
            selection.done();
            setNewAlbumName(null);
          }}
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
      {sheets}
    </View>
  );
}

function DeviceAlbumSheet({
  visible,
  title,
  albums,
  currentId,
  onClose,
  onPick,
  onNew,
}: {
  visible: boolean;
  title: string;
  albums: DeviceAlbum[];
  currentId: string | null;
  onClose: () => void;
  onPick: (albumId: string) => void;
  onNew: () => void;
}) {
  const { t } = useLocale();
  return (
    <AppModal visible={visible} onRequestClose={onClose} sheetStyle={styles.sheet}>
      <SheetHeader title={title} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.sheetList}>
        <Pressable style={styles.sheetRow} onPress={onNew}>
          <Ionicons name="add-circle" size={22} color={theme.colors.primary} />
          <Text style={[styles.sheetText, styles.sheetCreate]}>{t('album.phone.newAlbum')}</Text>
        </Pressable>
        {albums.map((album) => {
          const isCurrent = album.id === currentId;
          return (
            <Pressable
              key={album.id}
              disabled={isCurrent}
              style={[styles.sheetRow, isCurrent && styles.sheetCurrent]}
              onPress={() => {
                onClose();
                afterSheetClose(() => onPick(album.id));
              }}
            >
              {album.coverUri ? (
                <Image source={{ uri: album.coverUri }} style={styles.sheetThumb} resizeMethod="resize" />
              ) : (
                <View style={styles.sheetThumb} />
              )}
              <Text style={styles.sheetText} numberOfLines={1}>
                {album.title}
              </Text>
              {isCurrent ? <Text style={styles.sheetMeta}>{t('album.target.current')}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  loader: { marginVertical: theme.spacing.lg },
  limited: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentSoft,
  },
  limitedText: { flex: 1, color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  limitedLink: { color: theme.colors.accentDark, fontSize: 13, fontWeight: '800' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginVertical: theme.spacing.sm },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  newAlbum: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.light,
  },
  newAlbumText: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '800' },
  card: { ...cardSurface(), padding: 8, marginBottom: CARD_GAP },
  pressed: { opacity: 0.85 },
  cover: { width: '100%', borderRadius: 12, backgroundColor: theme.colors.backgroundAlt },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  cardName: { color: theme.colors.text, fontSize: 14, fontWeight: '800', marginTop: 8, paddingHorizontal: 2 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginBottom: 4 },
  backText: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '800' },
  selectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  creating: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '700', marginBottom: theme.spacing.sm },
  sheet: { maxHeight: '80%' },
  sheetList: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  sheetCurrent: { opacity: 0.45 },
  sheetThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: theme.colors.backgroundAlt },
  sheetText: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  sheetCreate: { color: theme.colors.primary },
  sheetMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
});
