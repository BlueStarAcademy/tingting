import { View, Text, StyleSheet } from 'react-native';
import { REGIONS, type Region } from '@tingting/shared';
import { KoreaSvgMap } from '@/components/KoreaSvgMap';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  visitedRegionCodes?: string[];
  selectedCode?: string | null;
  onRegionPress: (region: Region) => void;
  width?: number;
  height?: number;
}

export function KoreaMapPicker({
  visitedRegionCodes = [],
  selectedCode,
  onRegionPress,
  width,
  height,
}: Props) {
  const { t } = useLocale();
  const visitedCount = visitedRegionCodes.length;

  return (
    <View style={styles.wrap}>
      <KoreaSvgMap
        visitedRegionCodes={visitedRegionCodes}
        selectedCode={selectedCode}
        onRegionPress={onRegionPress}
        width={width}
        height={height}
        showLabels
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: theme.colors.primaryLight }]} />
          <Text style={styles.legendText}>
            {t('map.visitedLegend')} {visitedCount}/{REGIONS.length}
          </Text>
        </View>
        <Text style={styles.hint}>{t('map.tapRegion')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm, alignSelf: 'stretch' },
  legend: { gap: 4, paddingHorizontal: theme.spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  hint: { color: theme.colors.textMuted, fontSize: 12 },
});
