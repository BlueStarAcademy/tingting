import { View, Text, StyleSheet } from 'react-native';
import { REGIONS } from '@tingting/shared';
import type { Place, Region } from '@tingting/shared';
import { ScrollableKoreaMap } from '@/components/ScrollableKoreaMap';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const GROUP_MAP_ZOOM = 3;
const COMPACT_VIEWPORT_RATIO = 0.34;
const DEFAULT_VIEWPORT_RATIO = 0.5;

interface Props {
  visitedRegionCodes?: string[];
  selectedCode?: string | null;
  onRegionPress: (region: Region) => void;
  focusPlace?: Place | null;
  onPinPress?: () => void;
  /** 여행 탭 등 공간이 제한된 화면 */
  compact?: boolean;
  regionProgress?: Record<string, number>;
}

export function KoreaMapPicker({
  visitedRegionCodes = [],
  selectedCode,
  onRegionPress,
  focusPlace,
  onPinPress,
  compact = false,
  regionProgress,
}: Props) {
  const { t } = useLocale();
  const visitedCount = visitedRegionCodes.length;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
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
        viewportHeightRatio={compact ? COMPACT_VIEWPORT_RATIO : DEFAULT_VIEWPORT_RATIO}
        focusPlace={focusPlace}
        focusZoom={6}
        onPinPress={onPinPress}
        regionProgress={regionProgress}
      />
      {!compact ? (
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: theme.spacing.sm, alignSelf: 'stretch', minHeight: 0 },
  wrapCompact: { flexGrow: 0, flexShrink: 0 },
  legend: { gap: 4, paddingHorizontal: theme.spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: 12 },
});
