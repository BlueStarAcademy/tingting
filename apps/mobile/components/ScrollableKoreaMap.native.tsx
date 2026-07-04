import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import MapView, { Marker, Polygon, type Region as MapRegion } from 'react-native-maps';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import type { Region } from '@tingting/shared';
import type { Place } from '@tingting/shared';
import {
  findRegionAtLatLng,
  KOREA_INITIAL_REGION,
  placeFocusRegion,
  REGION_POLYGONS,
} from '@/lib/korea-map-geo';
import { regionFill, regionStroke, type KoreaMapVisualVariant } from '@/lib/korea-map-visual';
import { TravelProgressBar } from '@/components/TravelProgressBar';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

const DEFAULT_ZOOM = 5;
const DEFAULT_MIN_ZOOM = 2;
const DEFAULT_MAX_ZOOM = 8;
const DEFAULT_ZOOM_STEP = 0.5;
const VIEWPORT_HEIGHT_RATIO = 0.52;
const NAVER_GREEN = '#03C75A';

type Props = {
  visitedRegionCodes?: string[];
  selectedCode?: string | null;
  onRegionPress?: (region: Region) => void;
  showLabels?: boolean;
  interactive?: boolean;
  nationalProgress?: number;
  nationalVisited?: number;
  nationalTotal?: number;
  showNationalProgress?: boolean;
  showZoomControls?: boolean;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  edgePadding?: number;
  viewportHeightRatio?: number;
  focusPlace?: Place | null;
  focusZoom?: number;
  onPinPress?: () => void;
  regionProgress?: Record<string, number>;
  visualVariant?: KoreaMapVisualVariant;
};

function zoomToRegion(zoom: number): MapRegion {
  const scale = DEFAULT_ZOOM / zoom;
  return {
    ...KOREA_INITIAL_REGION,
    latitudeDelta: KOREA_INITIAL_REGION.latitudeDelta * scale,
    longitudeDelta: KOREA_INITIAL_REGION.longitudeDelta * scale,
  };
}

export function ScrollableKoreaMap({
  visitedRegionCodes = [],
  selectedCode,
  onRegionPress,
  interactive = true,
  nationalProgress = 0,
  nationalVisited = 0,
  nationalTotal = 0,
  showNationalProgress = true,
  showZoomControls = false,
  initialZoom = DEFAULT_ZOOM,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  zoomStep = DEFAULT_ZOOM_STEP,
  edgePadding,
  viewportHeightRatio = VIEWPORT_HEIGHT_RATIO,
  focusPlace,
  focusZoom = 5.5,
  onPinPress,
  visualVariant = 'default',
}: Props) {
  const { t } = useLocale();
  const { height: windowHeight } = useWindowDimensions();
  const contentWidth = useContentWidth();
  const horizontalPad = edgePadding ?? theme.spacing.lg * 2;
  const viewportW = contentWidth - horizontalPad;
  const viewportH = Math.round(Math.min(windowHeight * viewportHeightRatio, 560));

  const mapRef = useRef<MapView>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const focusedPlaceIdRef = useRef<string | null>(null);
  const didInitialCenterRef = useRef(false);
  const visited = useMemo(() => new Set(visitedRegionCodes), [visitedRegionCodes]);

  const animateTo = useCallback((region: MapRegion) => {
    mapRef.current?.animateToRegion(region, 280);
  }, []);

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const clamped = Math.min(maxZoom, Math.max(minZoom, Math.round(nextZoom * 2) / 2));
      setZoom(clamped);
      animateTo(zoomToRegion(clamped));
    },
    [animateTo, maxZoom, minZoom],
  );

  useEffect(() => {
    if (viewportW <= 0 || viewportH <= 0) return;

    if (focusPlace) {
      if (focusedPlaceIdRef.current !== focusPlace.id) {
        focusedPlaceIdRef.current = focusPlace.id;
        animateTo(placeFocusRegion(focusPlace.lat, focusPlace.lng, focusZoom));
      }
      return;
    }

    if (focusedPlaceIdRef.current !== null) {
      focusedPlaceIdRef.current = null;
      setZoom(initialZoom);
      animateTo(zoomToRegion(initialZoom));
      return;
    }

    if (!didInitialCenterRef.current) {
      didInitialCenterRef.current = true;
      animateTo(zoomToRegion(initialZoom));
    }
  }, [focusPlace, focusZoom, initialZoom, animateTo, viewportW, viewportH]);

  const polygons = useMemo(
    () =>
      REGION_POLYGONS.map(({ code, region, coordinates }) => {
        const isVisited = visited.has(code);
        const isSelected = selectedCode === code;
        const fill = regionFill(code, visited, selectedCode, region, visualVariant);
        const stroke = regionStroke(selectedCode, code, visualVariant);
        return {
          code,
          region,
          coordinates,
          fillColor:
            visualVariant === 'naver'
              ? isSelected
                ? `${fill}50`
                : isVisited
                  ? `${fill}38`
                  : `${fill}24`
              : isVisited || isSelected
                ? `${fill}88`
                : `${fill}44`,
          strokeColor: stroke,
          strokeWidth: visualVariant === 'naver' ? (isSelected ? 3 : 1.2) : isSelected ? 2.5 : 1.5,
          zIndex: isSelected ? 3 : isVisited ? 2 : 1,
        };
      }),
    [visited, selectedCode, visualVariant],
  );

  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      if (!interactive || !onRegionPress) return;
      const { latitude, longitude } = e.nativeEvent.coordinate;
      const region = findRegionAtLatLng(latitude, longitude);
      if (region) onRegionPress(region);
    },
    [interactive, onRegionPress],
  );

  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <View style={[styles.viewport, { width: viewportW, height: viewportH }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={zoomToRegion(initialZoom)}
        mapType={visualVariant === 'naver' ? 'standard' : 'hybrid'}
        rotateEnabled={false}
        pitchEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        onPress={handleMapPress}
      >
        {polygons.map((polygon) => (
          <Polygon
            key={polygon.code}
            coordinates={polygon.coordinates}
            fillColor={polygon.fillColor}
            strokeColor={polygon.strokeColor}
            strokeWidth={polygon.strokeWidth}
            zIndex={polygon.zIndex}
            tappable={interactive}
            onPress={() => onRegionPress?.(polygon.region)}
          />
        ))}
        {focusPlace ? (
          <Marker
            coordinate={{ latitude: focusPlace.lat, longitude: focusPlace.lng }}
            title={focusPlace.name}
            pinColor={visualVariant === 'naver' ? NAVER_GREEN : '#E11D48'}
            onPress={() => onPinPress?.()}
          />
        ) : null}
      </MapView>

      {visualVariant === 'naver' ? (
        <View style={styles.naverBadge} pointerEvents="none">
          <View style={styles.naverDot} />
          <Text style={styles.naverBadgeText}>지도</Text>
        </View>
      ) : null}

      {showNationalProgress ? (
        <View style={styles.progressOverlay} pointerEvents="none">
          <TravelProgressBar
            compact
            title={t('map.nationalProgressTitle')}
            subtitle={t('map.nationalProgressSub', { visited: nationalVisited, total: nationalTotal })}
            progress={nationalProgress}
            accentColor={theme.colors.primary}
          />
        </View>
      ) : null}

      {showZoomControls ? (
        <View style={styles.zoomControls} pointerEvents="box-none">
          <PremiumIconButton
            icon="add"
            variant="soft"
            size="md"
            color={canZoomIn ? theme.colors.text : theme.colors.textMuted}
            onPress={() => applyZoom(zoom + zoomStep)}
            disabled={!canZoomIn}
            accessibilityLabel={t('map.zoomIn')}
          />
          <PremiumIconButton
            icon="remove"
            variant="soft"
            size="md"
            color={canZoomOut ? theme.colors.text : theme.colors.textMuted}
            onPress={() => applyZoom(zoom - zoomStep)}
            disabled={!canZoomOut}
            accessibilityLabel={t('map.zoomOut')}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    alignSelf: 'center',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.mapFrameBorder,
    backgroundColor: theme.colors.mapBackground,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  progressOverlay: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 2,
  },
  naverBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(3,199,90,0.22)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  naverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NAVER_GREEN,
  },
  naverBadgeText: {
    color: '#173B23',
    fontSize: 12,
    fontWeight: '800',
  },
  zoomControls: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 3,
    gap: theme.spacing.xs,
  },
});
