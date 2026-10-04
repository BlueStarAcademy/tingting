import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FolderAlbumTab } from '@/components/album/FolderAlbumTab';
import { PhoneAlbumTab } from '@/components/album/PhoneAlbumTab';
import { RegionAlbumTab } from '@/components/album/RegionAlbumTab';
import { Screen } from '@/components/Screen';
import type { IconName } from '@/components/ui';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

type AlbumTab = 'region' | 'folder' | 'phone';

const TABS: { id: AlbumTab; icon: IconName }[] = [
  { id: 'region', icon: 'map-outline' },
  { id: 'folder', icon: 'folder-outline' },
  { id: 'phone', icon: 'phone-portrait-outline' },
];

export default function AlbumScreen() {
  const { t } = useLocale();
  const [tab, setTab] = useState<AlbumTab>('region');
  /** Tabs stay mounted once opened so switching back keeps their place. */
  const [visited, setVisited] = useState<Set<AlbumTab>>(() => new Set(['region']));
  const { data: summary, refreshing, refresh, reload } = useFocusLoad(() => api.getAlbumSummary());

  const select = useCallback((next: AlbumTab) => {
    setTab(next);
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
  }, []);

  return (
    <Screen tab title={t('album.title')} scroll={false}>
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const on = item.id === tab;
          return (
            <Pressable
              key={item.id}
              onPress={() => select(item.id)}
              style={[styles.tab, on && styles.tabOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Ionicons name={item.icon} size={15} color={on ? '#fff' : theme.colors.primaryDark} />
              <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                {t(`album.tab.${item.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>
        {visited.has('region') ? (
          <View style={[styles.pane, tab !== 'region' && styles.hidden]}>
            <RegionAlbumTab active={tab === 'region'} summary={summary} onChanged={reload} />
          </View>
        ) : null}
        {visited.has('folder') ? (
          <View style={[styles.pane, tab !== 'folder' && styles.hidden]}>
            <FolderAlbumTab active={tab === 'folder'} summary={summary} refreshing={refreshing} onRefresh={refresh} onChanged={reload} />
          </View>
        ) : null}
        {visited.has('phone') ? (
          <View style={[styles.pane, tab !== 'phone' && styles.hidden]}>
            <PhoneAlbumTab active={tab === 'phone'} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    padding: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.light,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: theme.radius.full,
  },
  tabOn: { backgroundColor: theme.colors.primary },
  tabText: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '800' },
  tabTextOn: { color: '#fff' },
  body: { flex: 1, minHeight: 0 },
  pane: { flex: 1 },
  hidden: { display: 'none' },
});
