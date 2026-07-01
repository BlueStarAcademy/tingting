import { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import type { Region } from '@tingting/shared';
import { KoreaSvgMap } from '@/components/KoreaSvgMap';
import { TravelProgressBar } from '@/components/TravelProgressBar';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

/** Visible zoom vs fitting all of Korea in the viewport (~5× larger regions) */
const MAP_ZOOM = 5;
const VIEWPORT_HEIGHT_RATIO = 0.52;

type Props = {
  visitedRegionCodes?: string[];
  selectedCode?: string | null;
  onRegionPress?: (region: Region) => void;
  showLabels?: boolean;
  interactive?: boolean;
  nationalProgress?: number;
  nationalVisited?: number;
  nationalTotal?: number;
};

export function ScrollableKoreaMap({
  visitedRegionCodes,
  selectedCode,
  onRegionPress,
  showLabels,
  interactive,
  nationalProgress = 0,
  nationalVisited = 0,
  nationalTotal = 0,
}: Props) {
  const { t } = useLocale();
  const { height: windowHeight } = useWindowDimensions();
  const contentWidth = useContentWidth();
  const horizontalPad = theme.spacing.lg * 2;
  const viewportW = contentWidth - horizontalPad;
  const viewportH = Math.round(Math.min(windowHeight * VIEWPORT_HEIGHT_RATIO, 560));
  const mapSize = Math.round(viewportW * MAP_ZOOM);

  const hRef = useRef<ScrollView>(null);
  const vRef = useRef<ScrollView>(null);

  useEffect(() => {
    const x = Math.max(0, (mapSize - viewportW) / 2);
    const y = Math.max(0, (mapSize - viewportH) / 2);
    requestAnimationFrame(() => {
      hRef.current?.scrollTo({ x, animated: false });
      vRef.current?.scrollTo({ y, animated: false });
    });
  }, [mapSize, viewportW, viewportH]);

  const OuterScroll = Platform.OS === 'web' ? ScrollView : GHScrollView;
  const InnerScroll = Platform.OS === 'web' ? ScrollView : GHScrollView;

  return (
    <View style={[styles.viewport, { width: viewportW, height: viewportH }]}>
      <OuterScroll
        ref={hRef}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={Platform.OS === 'web'}
        showsVerticalScrollIndicator={false}
        bounces
        style={{ width: viewportW, height: viewportH }}
        contentContainerStyle={{ width: mapSize, height: mapSize }}
      >
        <InnerScroll
          ref={vRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={Platform.OS === 'web'}
          showsHorizontalScrollIndicator={false}
          bounces
          style={{ width: mapSize, height: mapSize }}
          contentContainerStyle={{ width: mapSize, height: mapSize }}
        >
          <KoreaSvgMap
            visitedRegionCodes={visitedRegionCodes}
            selectedCode={selectedCode}
            onRegionPress={onRegionPress}
            showLabels={showLabels}
            interactive={interactive}
            width={mapSize}
            height={mapSize}
            frameless
          />
        </InnerScroll>
      </OuterScroll>
      <View style={styles.progressOverlay} pointerEvents="none">
        <TravelProgressBar
          compact
          title={t('map.nationalProgressTitle')}
          subtitle={t('map.nationalProgressSub', { visited: nationalVisited, total: nationalTotal })}
          progress={nationalProgress}
          accentColor={theme.colors.primary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    alignSelf: 'center',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.mapBackground,
    position: 'relative',
  },
  progressOverlay: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 2,
  },
});
