import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getRegion, REGIONS, type AlbumScope, type AlbumSummary, type CityFolder } from '@tingting/shared';
import { afterSheetClose } from '@/components/album/ActionSheet';
import { CityFolderFormModal } from '@/components/album/CityFolderFormModal';
import { CityFolderRow } from '@/components/album/CityFolderRow';
import { CityFoldersSheet } from '@/components/album/CityFoldersSheet';
import { ProvinceMap } from '@/components/album/ProvinceMap';
import { ServerAlbumGrid } from '@/components/album/ServerAlbumGrid';
import { EmptyState, Segment } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import type { CityStat } from '@/lib/city-map';
import { thumbUri } from '@/lib/media';
import { getMainTabBarBottomInset } from '@/constants/layout';
import { theme } from '@/constants/theme';

const UNSORTED = '__unsorted__';

type Mode = 'map' | 'photos';

export function RegionAlbumTab({ active, summary, onChanged }: { active: boolean; summary: AlbumSummary | null; onChanged: () => void }) {
  const { t } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapWidth = useContentWidth() - theme.spacing.lg * 2;
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('map');
  const [folders, setFolders] = useState<{ regionCode: string; items: CityFolder[] } | null>(null);
  const [sheetCity, setSheetCity] = useState<string | null>(null);
  const [formCity, setFormCity] = useState<string | null>(null);

  const stats = useMemo(() => new Map((summary?.regions ?? []).map((r) => [r.regionCode, r])), [summary]);
  const folderCounts = useMemo(() => {
    const byRegion = new Map<string, number>();
    for (const c of summary?.cities ?? []) byRegion.set(c.regionCode, (byRegion.get(c.regionCode) ?? 0) + c.folderCount);
    return byRegion;
  }, [summary]);
  const ordered = useMemo(
    () =>
      [...REGIONS].sort(
        (a, b) =>
          Number(stats.has(b.code) || folderCounts.has(b.code)) - Number(stats.has(a.code) || folderCounts.has(a.code)),
      ),
    [stats, folderCounts],
  );

  useEffect(() => {
    if (selected || !summary) return;
    setSelected(summary.regions.length || summary.cities.length ? ordered[0].code : REGIONS[0].code);
  }, [summary, selected, ordered]);

  const code = selected ?? REGIONS[0].code;
  const isUnsorted = code === UNSORTED;
  const region = isUnsorted ? null : getRegion(code);
  const scope: AlbumScope = isUnsorted ? { kind: 'unsorted' } : { kind: 'region', regionCode: code };
  const count = isUnsorted ? summary?.unsortedCount ?? 0 : stats.get(code)?.photoCount ?? 0;
  const showMap = !isUnsorted && mode === 'map';

  // Summary reloads on focus and after every change, so folder lists follow it.
  useEffect(() => {
    if (isUnsorted || !summary) return;
    let alive = true;
    api
      .listCityFolders({ regionCode: code })
      .then((items) => alive && setFolders({ regionCode: code, items }))
      .catch(() => alive && setFolders({ regionCode: code, items: [] }));
    return () => {
      alive = false;
    };
  }, [code, isUnsorted, summary]);

  const regionFolders = folders?.regionCode === code ? folders.items : null;
  const cityStats = useMemo(() => {
    const map = new Map<string, CityStat>();
    for (const c of summary?.cities ?? []) {
      if (c.regionCode === code) map.set(c.cityCode, { folders: c.folderCount, photos: c.photoCount });
    }
    return map;
  }, [summary, code]);

  const openFolder = (folder: CityFolder) => router.push(`/city-folder/${folder.id}` as Href);

  const picker = (
    <View>
      <Text style={styles.hint}>{t('album.pickRegion')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {ordered.map((r) => {
          const stat = stats.get(r.code);
          const on = r.code === code;
          return (
            <Pressable key={r.code} onPress={() => setSelected(r.code)} style={[styles.card, on && { borderColor: r.color }]}>
              {stat?.coverPhotoUri ? (
                <Image source={{ uri: thumbUri(stat.coverPhotoUri, 58) }} style={styles.cover} resizeMethod="resize" />
              ) : (
                <View style={[styles.cover, { backgroundColor: `${r.color}26` }]}>
                  <Ionicons name="image-outline" size={18} color={r.color} />
                </View>
              )}
              <Text style={[styles.name, on && { color: r.color }]} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={styles.count}>{stat?.photoCount ?? 0}</Text>
            </Pressable>
          );
        })}
        {summary && summary.unsortedCount > 0 ? (
          <Pressable onPress={() => setSelected(UNSORTED)} style={[styles.card, isUnsorted && styles.cardUnsortedOn]}>
            <View style={[styles.cover, styles.unsortedCover]}>
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.name}>{t('album.unsorted')}</Text>
            <Text style={styles.count}>{summary.unsortedCount}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      {isUnsorted ? (
        <Text style={styles.unsortedHint}>{t('album.unsortedHint')}</Text>
      ) : (
        <View style={styles.modeRow}>
          <Segment<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { id: 'map', label: t('city.mode.map'), icon: 'map-outline' },
              { id: 'photos', label: t('city.mode.photos'), icon: 'images-outline' },
            ]}
          />
        </View>
      )}
    </View>
  );

  const sheets = (
    <>
      <CityFoldersSheet
        cityCode={sheetCity}
        folders={sheetCity && regionFolders ? regionFolders.filter((f) => f.cityCode === sheetCity) : null}
        onClose={() => setSheetCity(null)}
        onOpen={(folder) => {
          setSheetCity(null);
          afterSheetClose(() => openFolder(folder));
        }}
        onCreate={() => {
          const city = sheetCity;
          setSheetCity(null);
          afterSheetClose(() => setFormCity(city));
        }}
      />
      <CityFolderFormModal
        visible={Boolean(formCity)}
        cityCode={formCity}
        onClose={() => setFormCity(null)}
        onSaved={(folder) => {
          setFormCity(null);
          onChanged();
          afterSheetClose(() => openFolder(folder));
        }}
      />
    </>
  );

  if (!showMap) {
    return (
      <>
        <ServerAlbumGrid
          scope={scope}
          active={active}
          header={picker}
          title={isUnsorted ? t('album.unsorted') : `${region?.name ?? ''} ${t('album.title')}`}
          subtitle={t('album.count', { count })}
          emptyTitle={isUnsorted ? t('album.unsortedEmptyTitle') : t('album.regionEmptyTitle', { region: region?.name ?? '' })}
          emptyMessage={isUnsorted ? t('album.unsortedEmptyMessage') : t('album.regionEmptyMessage', { region: region?.name ?? '' })}
          onChanged={onChanged}
        />
        {sheets}
      </>
    );
  }

  const folderTotal = regionFolders?.length ?? 0;
  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: getMainTabBarBottomInset(insets.bottom) + theme.spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {picker}
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <Text style={styles.title}>{t('city.mapTitle', { region: region?.name ?? '' })}</Text>
            <Text style={styles.subtitle}>
              {t('city.mapSubtitle', { folders: folderTotal, photos: count })}
            </Text>
          </View>
        </View>
        <ProvinceMap regionCode={code} width={mapWidth} stats={cityStats} selected={sheetCity ?? formCity} onCityPress={setSheetCity} />
        <View style={styles.tip}>
          <Ionicons name="hand-left-outline" size={14} color={theme.colors.primaryDark} />
          <Text style={styles.tipText}>{t('city.mapTip')}</Text>
        </View>

        <Text style={styles.section}>{t('city.listTitle', { region: region?.name ?? '' })}</Text>
        {regionFolders && regionFolders.length === 0 ? (
          <EmptyState icon="map-outline" title={t('city.emptyTitle', { region: region?.name ?? '' })} message={t('city.emptyMessage')} />
        ) : null}
        <View style={styles.list}>
          {(regionFolders ?? []).map((folder) => (
            <CityFolderRow key={folder.id} folder={folder} showCity onPress={() => openFolder(folder)} />
          ))}
        </View>
      </ScrollView>
      {sheets}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: theme.spacing.lg },
  hint: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: theme.spacing.sm, marginBottom: 8 },
  strip: { gap: 8, paddingBottom: 4 },
  card: {
    width: 72,
    alignItems: 'center',
    padding: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.surfaceElevated,
  },
  cardUnsortedOn: { borderColor: theme.colors.textMuted },
  cover: { width: 58, height: 58, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  unsortedCover: { backgroundColor: theme.colors.backgroundAlt },
  name: { color: theme.colors.text, fontSize: 12, fontWeight: '800', marginTop: 4 },
  count: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '700' },
  unsortedHint: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 8 },
  modeRow: { marginTop: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.tint.soft,
  },
  tipText: { flex: 1, color: theme.colors.primaryDark, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  section: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  list: { gap: 10 },
});
