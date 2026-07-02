import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useLocale } from '@/hooks/useLocale';
import { tabPill } from '@/lib/ui';
import { theme } from '@/constants/theme';

export type GroupTab = 'home' | 'members' | 'map' | 'gallery' | 'quest';

interface Props {
  active: GroupTab;
  onChange: (tab: GroupTab) => void;
}

const TABS: GroupTab[] = ['home', 'members', 'map', 'gallery', 'quest'];

export function GroupTabBar({ active, onChange }: Props) {
  const { t } = useLocale();

  const labels: Record<GroupTab, string> = {
    home: t('group.tabHome'),
    members: t('group.tabMembers'),
    map: t('group.tabMap'),
    gallery: t('group.tabGallery'),
    quest: t('group.tabQuest'),
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.content}
    >
      {TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            style={tabPill(isActive)}
            onPress={() => onChange(tab)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{labels[tab]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.headerBg,
  },
  content: { paddingHorizontal: theme.spacing.sm, gap: 6, paddingVertical: 4 },
  tabText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary, fontWeight: '800' },
});
