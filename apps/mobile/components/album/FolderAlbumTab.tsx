import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AlbumFolder, AlbumSummary, AlbumTarget } from '@tingting/shared';
import { ActionSheet, type SheetOption } from '@/components/album/ActionSheet';
import { AlbumTargetSheet } from '@/components/album/AlbumTargetSheet';
import { NamePromptModal } from '@/components/album/NamePromptModal';
import { ServerAlbumGrid } from '@/components/album/ServerAlbumGrid';
import { useToast } from '@/components/album/Toast';
import { ActionButton, EmptyState, Loading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { cardSurface } from '@/lib/ui';
import { getMainTabBarBottomInset } from '@/constants/layout';
import { theme } from '@/constants/theme';

const CARD_GAP = 12;

type Props = {
  active: boolean;
  summary: AlbumSummary | null;
  refreshing: boolean;
  onRefresh: () => void;
  onChanged: () => void;
};

export function FolderAlbumTab({ active, summary, refreshing, onRefresh, onChanged }: Props) {
  const { t } = useLocale();
  const { user, partner } = useAuth();
  const insets = useSafeAreaInsets();
  const width = useContentWidth() - theme.spacing.lg * 2;
  const cardWidth = Math.floor((width - CARD_GAP) / 2);
  const [openId, setOpenId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<{ mode: 'create' } | { mode: 'rename'; folder: AlbumFolder } | null>(null);
  const [menuFor, setMenuFor] = useState<AlbumFolder | null>(null);
  const [deleteFor, setDeleteFor] = useState<AlbumFolder | null>(null);
  const [moveBeforeDelete, setMoveBeforeDelete] = useState<AlbumFolder | null>(null);
  const [toast, showToast] = useToast();

  const folders = summary?.folders ?? null;
  const open = folders?.find((f) => f.id === openId) ?? null;

  useEffect(() => {
    if (openId && folders && !open) setOpenId(null);
  }, [openId, folders, open]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    if (user) map.set(user.id, user.displayName);
    if (partner) map.set(partner.id, partner.displayName);
    return map;
  }, [user, partner]);

  const run = async (fn: () => Promise<string | void>) => {
    try {
      const message = await fn();
      if (message) showToast(message);
      onChanged();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.error'));
    }
  };

  const reorder = (folder: AlbumFolder, delta: -1 | 1) =>
    run(async () => {
      const ids = (folders ?? []).map((f) => f.id);
      const from = ids.indexOf(folder.id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= ids.length) return;
      [ids[from], ids[to]] = [ids[to], ids[from]];
      await api.reorderFolders(ids);
    });

  const removeFolder = (folder: AlbumFolder, photos?: { mode: 'delete' } | { mode: 'move'; target: AlbumTarget }) =>
    run(async () => {
      await api.deleteFolder(folder.id, photos);
      if (openId === folder.id) setOpenId(null);
    });

  const askDelete = (folder: AlbumFolder) => {
    if (folder.photoCount === 0) {
      Alert.alert(t('album.folder.deleteTitle', { name: folder.name }), t('album.folder.deleteEmpty'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('album.action.delete'), style: 'destructive', onPress: () => removeFolder(folder) },
      ]);
      return;
    }
    setDeleteFor(folder);
  };

  const menuOptions = (folder: AlbumFolder): SheetOption[] => {
    const index = (folders ?? []).findIndex((f) => f.id === folder.id);
    const options: SheetOption[] = [
      { key: 'rename', icon: 'create-outline', label: t('album.folder.rename'), onPress: () => setPrompt({ mode: 'rename', folder }) },
    ];
    if (index > 0) options.push({ key: 'up', icon: 'arrow-up', label: t('album.folder.moveUp'), onPress: () => reorder(folder, -1) });
    if (index >= 0 && index < (folders?.length ?? 0) - 1) {
      options.push({ key: 'down', icon: 'arrow-down', label: t('album.folder.moveDown'), onPress: () => reorder(folder, 1) });
    }
    options.push({ key: 'delete', icon: 'trash-outline', label: t('album.folder.delete'), danger: true, onPress: () => askDelete(folder) });
    return options;
  };

  const sheets = (
    <>
      <NamePromptModal
        visible={prompt !== null}
        title={prompt?.mode === 'rename' ? t('album.folder.renameTitle') : t('album.folder.newTitle')}
        initialValue={prompt?.mode === 'rename' ? prompt.folder.name : ''}
        placeholder={t('album.folder.namePlaceholder')}
        confirmLabel={prompt?.mode === 'rename' ? t('album.folder.save') : t('album.folder.create')}
        onCancel={() => setPrompt(null)}
        onSubmit={async (name) => {
          if (prompt?.mode === 'rename') await api.renameFolder(prompt.folder.id, name);
          else await api.createFolder(name);
          setPrompt(null);
          onChanged();
        }}
      />
      <ActionSheet
        visible={menuFor !== null}
        title={menuFor?.name ?? t('album.folder.menuTitle')}
        options={menuFor ? menuOptions(menuFor) : []}
        onClose={() => setMenuFor(null)}
      />
      <ActionSheet
        visible={deleteFor !== null}
        title={deleteFor ? t('album.folder.deleteTitle', { name: deleteFor.name }) : ''}
        message={deleteFor ? t('album.folder.deleteWithPhotos', { count: deleteFor.photoCount }) : undefined}
        onClose={() => setDeleteFor(null)}
        options={
          deleteFor
            ? [
                {
                  key: 'move',
                  icon: 'arrow-redo-outline',
                  label: t('album.folder.movePhotos'),
                  onPress: () => setMoveBeforeDelete(deleteFor),
                },
                {
                  key: 'delete',
                  icon: 'trash-outline',
                  danger: true,
                  label: t('album.folder.deletePhotosToo'),
                  hint: t('album.deleteMessage', { count: deleteFor.photoCount }),
                  onPress: () => {
                    const folder = deleteFor;
                    Alert.alert(t('album.folder.deleteTitle', { name: folder.name }), t('album.deleteMessage', { count: folder.photoCount }), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('album.action.delete'), style: 'destructive', onPress: () => removeFolder(folder, { mode: 'delete' }) },
                    ]);
                  },
                },
              ]
            : []
        }
      />
      <AlbumTargetSheet
        visible={moveBeforeDelete !== null}
        title={t('album.folder.moveBeforeDelete')}
        current={moveBeforeDelete ? { kind: 'folder', folderId: moveBeforeDelete.id } : undefined}
        allowUnsorted
        onClose={() => setMoveBeforeDelete(null)}
        onPick={(target) => moveBeforeDelete && removeFolder(moveBeforeDelete, { mode: 'move', target })}
      />
    </>
  );

  if (open) {
    const creator = names.get(open.createdBy);
    return (
      <View style={styles.flex}>
        <ServerAlbumGrid
          scope={{ kind: 'folder', folderId: open.id }}
          active={active}
          header={
            <Pressable onPress={() => setOpenId(null)} style={styles.back} hitSlop={6}>
              <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
              <Text style={styles.backText}>{t('album.folder.back')}</Text>
            </Pressable>
          }
          title={open.name}
          subtitle={`${t('album.count', { count: open.photoCount })}${creator ? ` · ${t('album.folder.shared', { name: creator })}` : ''}`}
          emptyTitle={t('album.folder.emptyTitle')}
          emptyMessage={t('album.folder.emptyMessage')}
          onChanged={onChanged}
          toolbarExtra={
            <Pressable onPress={() => setMenuFor(open)} hitSlop={8} style={styles.menuBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.primaryDark} />
            </Pressable>
          }
        />
        {toast}
        {sheets}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={folders ?? []}
        keyExtractor={(f) => f.id}
        numColumns={2}
        columnWrapperStyle={{ gap: CARD_GAP }}
        contentContainerStyle={[styles.content, { paddingBottom: getMainTabBarBottomInset(insets.bottom) + theme.spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />
        }
        ListHeaderComponent={
          <ActionButton icon="folder-open-outline" label={t('album.folder.new')} onPress={() => setPrompt({ mode: 'create' })} style={styles.newBtn} />
        }
        ListEmptyComponent={
          folders === null ? (
            <Loading />
          ) : (
            <EmptyState icon="folder-open-outline" title={t('album.folder.emptyListTitle')} message={t('album.folder.emptyListMessage')} />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
            onPress={() => setOpenId(item.id)}
            onLongPress={() => setMenuFor(item)}
          >
            {item.coverPhotoUri ? (
              <Image source={{ uri: item.coverPhotoUri }} style={[styles.cover, { height: cardWidth - 16 }]} />
            ) : (
              <View style={[styles.cover, styles.coverEmpty, { height: cardWidth - 16 }]}>
                <Ionicons name="folder-outline" size={34} color={theme.colors.accent} />
              </View>
            )}
            <View style={styles.cardRow}>
              <View style={styles.flex}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {t('album.count', { count: item.photoCount })}
                  {names.get(item.createdBy) ? ` · ${names.get(item.createdBy)}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setMenuFor(item)} hitSlop={10}>
                <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.textMuted} />
              </Pressable>
            </View>
          </Pressable>
        )}
      />
      {toast}
      {sheets}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  newBtn: { marginBottom: theme.spacing.md },
  card: { ...cardSurface(), padding: 8, marginBottom: CARD_GAP },
  pressed: { opacity: 0.85 },
  cover: { width: '100%', borderRadius: 12, backgroundColor: theme.colors.backgroundAlt },
  coverEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentSoft },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 2 },
  cardName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  cardMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginTop: theme.spacing.sm },
  backText: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '800' },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
});
