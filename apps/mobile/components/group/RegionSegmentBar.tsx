import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocale } from '@/hooks/useLocale';
import { tabPill } from '@/lib/ui';
import { theme } from '@/constants/theme';

export type RegionSegment = 'places' | 'gallery' | 'quest' | 'schedule';

interface Props {
  active: RegionSegment;
  onChange: (segment: RegionSegment) => void;
}

const SEGMENTS: RegionSegment[] = ['places', 'gallery', 'quest', 'schedule'];

export function RegionSegmentBar({ active, onChange }: Props) {
  const { t } = useLocale();

  const labels: Record<RegionSegment, string> = {
    places: t('group.segmentPlaces'),
    gallery: t('group.segmentGallery'),
    quest: t('group.segmentQuest'),
    schedule: t('group.segmentSchedule'),
  };

  return (
    <View style={styles.bar}>
      {SEGMENTS.map((segment) => {
        const isActive = segment === active;
        return (
          <Pressable
            key={segment}
            style={[tabPill(isActive), styles.item]}
            onPress={() => onChange(segment)}
          >
            <Text
              style={[styles.text, isActive && styles.textActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {labels[segment]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexGrow: 0,
    gap: 4,
    paddingVertical: 2,
  },
  item: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  text: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  textActive: { color: theme.colors.primaryDark, fontWeight: '800' },
});
