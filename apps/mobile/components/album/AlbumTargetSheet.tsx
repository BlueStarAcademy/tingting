import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cityFolderTitle, formatTripDates, getRegion, REGIONS, type AlbumFolder, type AlbumTarget, type CityFolder } from '@tingting/shared';
import { afterSheetClose } from '@/components/album/ActionSheet';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { SheetHeader } from '@/components/SheetHeader';
import { Field } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

export function sameTarget(a: AlbumTarget | undefined, b: AlbumTarget): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === 'region' && b.kind === 'region') return a.regionCode === b.regionCode;
  if (a.kind === 'folder' && b.kind === 'folder') return a.folderId === b.folderId;
  if (a.kind === 'city' && b.kind === 'city') return a.cityFolderId === b.cityFolderId;
  return true;
}

const CITY_PREVIEW = 6;

/** Pick a region album, a city trip folder or a general folder (and create a folder inline). */
export function AlbumTargetSheet({
  visible,
  title,
  current,
  allowUnsorted,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  /** Shown as the current album and not selectable */
  current?: AlbumTarget;
  allowUnsorted?: boolean;
  onClose: () => void;
  onPick: (target: AlbumTarget) => void;
}) {
  const { t } = useLocale();
  const [folders, setFolders] = useState<AlbumFolder[] | null>(null);
  const [cityFolders, setCityFolders] = useState<CityFolder[] | null>(null);
  const [allCities, setAllCities] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCreating(false);
    setName('');
    setError(null);
    setFolders(null);
    setCityFolders(null);
    setAllCities(false);
    api.listFolders().then(setFolders).catch(() => setFolders([]));
    api.listCityFolders().then(setCityFolders).catch(() => setCityFolders([]));
  }, [visible]);

  const cityRows = cityFolders ? (allCities ? cityFolders : cityFolders.slice(0, CITY_PREVIEW)) : [];

  const pick = (target: AlbumTarget) => {
    onClose();
    afterSheetClose(() => onPick(target));
  };

  const createFolder = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const folder = await api.createFolder(trimmed);
      pick({ kind: 'folder', folderId: folder.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal visible={visible} onRequestClose={onClose} sheetStyle={styles.sheet}>
      <SheetHeader title={title} onClose={onClose} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>{t('album.target.regions')}</Text>
        <View style={styles.regions}>
          {REGIONS.map((region) => {
            const target: AlbumTarget = { kind: 'region', regionCode: region.code };
            const isCurrent = sameTarget(current, target);
            return (
              <Pressable
                key={region.code}
                disabled={isCurrent}
                onPress={() => pick(target)}
                style={[styles.region, { borderColor: `${region.color}66` }, isCurrent && styles.currentChip]}
              >
                <View style={[styles.dot, { backgroundColor: region.color }]} />
                <Text style={styles.regionText}>{region.name}</Text>
              </Pressable>
            );
          })}
        </View>

        {cityFolders === null || cityFolders.length > 0 ? <Text style={styles.section}>{t('album.target.cities')}</Text> : null}
        {cityFolders === null ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        ) : (
          cityRows.map((folder) => {
            const target: AlbumTarget = { kind: 'city', cityFolderId: folder.id };
            const isCurrent = sameTarget(current, target);
            const region = getRegion(folder.regionCode);
            return (
              <Pressable key={folder.id} disabled={isCurrent} onPress={() => pick(target)} style={[styles.row, isCurrent && styles.currentRow]}>
                <Ionicons name="location" size={20} color={region?.color ?? theme.colors.primary} />
                <View style={styles.cityText}>
                  <Text style={styles.rowText} numberOfLines={1}>
                    {cityFolderTitle(folder)}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {region?.name} {folder.cityName} · {formatTripDates(folder.startDate, folder.endDate)}
                  </Text>
                </View>
                <Text style={styles.rowMeta}>{isCurrent ? t('album.target.current') : t('album.count', { count: folder.photoCount })}</Text>
              </Pressable>
            );
          })
        )}
        {cityFolders && cityFolders.length > CITY_PREVIEW && !allCities ? (
          <Pressable style={styles.more} onPress={() => setAllCities(true)} hitSlop={6}>
            <Text style={styles.moreText}>{t('album.target.moreCities', { count: cityFolders.length - CITY_PREVIEW })}</Text>
          </Pressable>
        ) : null}

        <Text style={[styles.section, styles.sectionGap]}>{t('album.target.folders')}</Text>
        {folders === null ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        ) : (
          folders.map((folder) => {
            const target: AlbumTarget = { kind: 'folder', folderId: folder.id };
            const isCurrent = sameTarget(current, target);
            return (
              <Pressable key={folder.id} disabled={isCurrent} onPress={() => pick(target)} style={[styles.row, isCurrent && styles.currentRow]}>
                <Ionicons name="folder" size={20} color={theme.colors.accent} />
                <Text style={styles.rowText} numberOfLines={1}>
                  {folder.name}
                </Text>
                <Text style={styles.rowMeta}>{isCurrent ? t('album.target.current') : t('album.count', { count: folder.photoCount })}</Text>
              </Pressable>
            );
          })
        )}

        {creating ? (
          <View style={styles.create}>
            <Field value={name} onChangeText={setName} placeholder={t('album.folder.namePlaceholder')} autoFocus maxLength={40} onSubmitEditing={createFolder} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PremiumButton title={t('album.folder.create')} onPress={createFolder} loading={busy} disabled={!name.trim()} />
          </View>
        ) : (
          <Pressable style={styles.row} onPress={() => setCreating(true)}>
            <Ionicons name="add-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.rowText, styles.createText]}>{t('album.target.newFolder')}</Text>
          </Pressable>
        )}

        {allowUnsorted && current?.kind !== 'none' ? (
          <Pressable style={[styles.row, styles.unsorted]} onPress={() => pick({ kind: 'none' })}>
            <Ionicons name="remove-circle-outline" size={20} color={theme.colors.textMuted} />
            <Text style={[styles.rowText, styles.muted]}>{t('album.target.unsorted')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheet: { maxHeight: '85%' },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  section: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  regions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: theme.spacing.md },
  region: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceElevated,
  },
  currentChip: { opacity: 0.35 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  regionText: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
  loader: { marginVertical: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  currentRow: { opacity: 0.45 },
  rowText: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  cityText: { flex: 1, gap: 1 },
  rowSub: { color: theme.colors.textMuted, fontSize: 12 },
  more: { paddingVertical: 10, alignSelf: 'flex-start' },
  moreText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  sectionGap: { marginTop: theme.spacing.md },
  createText: { color: theme.colors.primary },
  create: { gap: 8, paddingVertical: 12 },
  error: { color: theme.colors.error, fontSize: 13 },
  unsorted: { borderBottomWidth: 0, marginTop: 4 },
  muted: { color: theme.colors.textMuted },
});
