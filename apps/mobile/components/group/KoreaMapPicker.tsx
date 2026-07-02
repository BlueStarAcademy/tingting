import { View, Text, StyleSheet } from 'react-native';
import { REGIONS } from '@tingting/shared';
import type { Place, Region } from '@tingting/shared';
import { ScrollableKoreaMap } from '@/components/ScrollableKoreaMap';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const GROUP_MAP_ZOOM = 3;

interface Props {
  visitedRegionCodes?: string[];
  selectedCode?: string | null;
  onRegionPress: (region: Region) => void;
  focusPlace?: Place | null;
}

export function KoreaMapPicker({
  visitedRegionCodes = [],
  selectedCode,
  onRegionPress,
  focusPlace,
}: Props) {
  const { t } = useLocale();
  const visitedCount = visitedRegionCodes.length;

  return (
    <View style={styles.wrap}>
      <ScrollableKoreaMap
        visitedRegionCodes={visitedRegionCodes}
        selectedCode={selectedCode}
        onRegionPress={onRegionPress}
        showLabels
        interactive
        showNationalProgress={false}
        showZoomControls
        initialZoom={GROUP_MAP_ZOOM}
        minZoom={2}
        maxZoom={6}
        edgePadding={0}
        viewportHeightRatio={0.5}
        focusPlace={focusPlace}
        focusZoom={5.5}
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: theme.colors.primaryLight }]} />
          <Text style={styles.legendText}>
            {t('map.visitedLegend')} {visitedCount}/{REGIONS.length}
          </Text>
        </View>
        <Text style={styles.hint}>{t('map.panHint')}</Text>
        <Text style={styles.hint}>{t('map.tapRegion')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: theme.spacing.sm, alignSelf: 'stretch', minHeight: 0 },
  legend: { gap: 4, paddingHorizontal: theme.spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: 12 },
});
