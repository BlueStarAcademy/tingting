import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRegion, REGIONS, type AlbumScope, type AlbumSummary } from '@tingting/shared';
import { ServerAlbumGrid } from '@/components/album/ServerAlbumGrid';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const UNSORTED = '__unsorted__';

export function RegionAlbumTab({ active, summary, onChanged }: { active: boolean; summary: AlbumSummary | null; onChanged: () => void }) {
  const { t } = useLocale();
  const [selected, setSelected] = useState<string | null>(null);

  const stats = useMemo(() => new Map((summary?.regions ?? []).map((r) => [r.regionCode, r])), [summary]);
  const ordered = useMemo(
    () => [...REGIONS].sort((a, b) => Number(stats.has(b.code)) - Number(stats.has(a.code))),
    [stats],
  );

  useEffect(() => {
    if (selected || !summary) return;
    setSelected(summary.regions.length ? ordered[0].code : REGIONS[0].code);
  }, [summary, selected, ordered]);

  const code = selected ?? REGIONS[0].code;
  const isUnsorted = code === UNSORTED;
  const region = isUnsorted ? null : getRegion(code);
  const scope: AlbumScope = isUnsorted ? { kind: 'unsorted' } : { kind: 'region', regionCode: code };
  const count = isUnsorted ? summary?.unsortedCount ?? 0 : stats.get(code)?.photoCount ?? 0;

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
                <Image source={{ uri: stat.coverPhotoUri }} style={styles.cover} />
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
      {isUnsorted ? <Text style={styles.unsortedHint}>{t('album.unsortedHint')}</Text> : null}
    </View>
  );

  return (
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
  );
}

const styles = StyleSheet.create({
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
});
