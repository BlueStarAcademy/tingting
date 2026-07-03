import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';
import { tabPill } from '@/lib/ui';
import { theme } from '@/constants/theme';

export type GroupTab = 'home' | 'travel';

interface Props {
  active: GroupTab;
  onChange: (tab: GroupTab) => void;
  /** 여행 탭 활성 시 우측 지역 드롭다운 */
  regionLabel?: string;
  onRegionPress?: () => void;
}

const TABS: GroupTab[] = ['home', 'travel'];

export function GroupTabBar({ active, onChange, regionLabel, onRegionPress }: Props) {
  const { t } = useLocale();

  const labels: Record<GroupTab, string> = {
    home: t('group.tabHome'),
    travel: t('group.tabTravel'),
  };

  const showRegionDropdown = active === 'travel' && regionLabel && onRegionPress;

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
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
      {showRegionDropdown ? (
        <View style={styles.regionSection}>
          <Text style={styles.regionPrefix}>{t('group.selectedRegion')}</Text>
          <Pressable style={styles.regionDropdown} onPress={onRegionPress}>
            <Text style={styles.regionDropdownText} numberOfLines={1}>
              {regionLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.headerBg,
    paddingRight: theme.spacing.sm,
  },
  tabsScroll: { flex: 1, flexGrow: 1, minWidth: 0 },
  content: { paddingHorizontal: theme.spacing.sm, gap: 6, paddingVertical: 4 },
  tabText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primary, fontWeight: '800' },
  regionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  regionPrefix: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  regionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 110,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  regionDropdownText: { color: theme.colors.text, fontSize: 12, fontWeight: '700', flexShrink: 1 },
});
