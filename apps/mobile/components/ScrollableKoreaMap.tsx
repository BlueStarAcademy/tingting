import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Region } from '@tingting/shared';
import type { Place } from '@tingting/shared';
import { KoreaSvgMap } from '@/components/KoreaSvgMap';
import type { MapPin } from '@/lib/korea-map-coords';
import { latLngToSvg } from '@/lib/korea-map-coords';
import { TravelProgressBar } from '@/components/TravelProgressBar';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { findRegionAtPoint } from '@/lib/korea-map-hit';
import { theme } from '@/constants/theme';

const DEFAULT_ZOOM = 5;
const DEFAULT_MIN_ZOOM = 2;
const DEFAULT_MAX_ZOOM = 8;
const DEFAULT_ZOOM_STEP = 0.5;
const VIEWPORT_HEIGHT_RATIO = 0.52;
const TAP_SLOP = 8;

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
  /** Zoom map and show pin at this place */
  focusPlace?: Place | null;
  focusZoom?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ScrollableKoreaMap({
  visitedRegionCodes,
  selectedCode,
  onRegionPress,
  showLabels,
  interactive,
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
}: Props) {
  const { t } = useLocale();
  const { height: windowHeight } = useWindowDimensions();
  const contentWidth = useContentWidth();
  const horizontalPad = edgePadding ?? theme.spacing.lg * 2;
  const viewportW = contentWidth - horizontalPad;
  const viewportH = Math.round(Math.min(windowHeight * viewportHeightRatio, 560));

  const [zoom, setZoom] = useState(initialZoom);
  const mapSize = Math.round(viewportW * zoom);

  const bounds = useMemo(
    () => ({
      minX: Math.min(0, viewportW - mapSize),
      minY: Math.min(0, viewportH - mapSize),
      maxX: 0,
      maxY: 0,
    }),
    [viewportW, viewportH, mapSize],
  );

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const didPan = useRef(false);

  const centerOffset = useCallback(() => {
    const x = clamp((viewportW - mapSize) / 2, bounds.minX, bounds.maxX);
    const y = clamp((viewportH - mapSize) / 2, bounds.minY, bounds.maxY);
    const next = { x, y };
    offsetRef.current = next;
    setOffset(next);
  }, [viewportW, viewportH, mapSize, bounds]);

  useEffect(() => {
    if (focusPlace) {
      const targetZoom = Math.min(maxZoom, Math.max(minZoom, focusZoom));
      const nextMapSize = Math.round(viewportW * targetZoom);
      const { x, y } = latLngToSvg(focusPlace.lat, focusPlace.lng);
      const pinX = (x / 1000) * nextMapSize;
      const pinY = (y / 1000) * nextMapSize;
      const nextBounds = {
        minX: Math.min(0, viewportW - nextMapSize),
        minY: Math.min(0, viewportH - nextMapSize),
        maxX: 0,
        maxY: 0,
      };
      const nextOffset = {
        x: clamp(viewportW / 2 - pinX, nextBounds.minX, nextBounds.maxX),
        y: clamp(viewportH / 2 - pinY, nextBounds.minY, nextBounds.maxY),
      };
      setZoom(targetZoom);
      offsetRef.current = nextOffset;
      setOffset(nextOffset);
      return;
    }
    centerOffset();
  }, [focusPlace?.id, viewportW, viewportH, focusZoom, minZoom, maxZoom]);

  const pins: MapPin[] = focusPlace
    ? [{ ...latLngToSvg(focusPlace.lat, focusPlace.lng), label: focusPlace.name }]
    : [];

  const changeZoom = (delta: number) => {
    const next = Math.min(maxZoom, Math.max(minZoom, Math.round((zoom + delta) * 2) / 2));
    if (next === zoom) return;

    const ratio = next / zoom;
    const cx = offsetRef.current.x + viewportW / 2;
    const cy = offsetRef.current.y + viewportH / 2;
    const nextMapSize = Math.round(viewportW * next);
    const nextBounds = {
      minX: Math.min(0, viewportW - nextMapSize),
      minY: Math.min(0, viewportH - nextMapSize),
      maxX: 0,
      maxY: 0,
    };
    const nextOffset = {
      x: clamp(cx * ratio - viewportW / 2, nextBounds.minX, nextBounds.maxX),
      y: clamp(cy * ratio - viewportH / 2, nextBounds.minY, nextBounds.maxY),
    };

    setZoom(next);
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: () => {
          didPan.current = false;
          panStart.current = {
            x: 0,
            y: 0,
            ox: offsetRef.current.x,
            oy: offsetRef.current.y,
          };
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP) {
            didPan.current = true;
          }
          const next = {
            x: clamp(panStart.current.ox + g.dx, bounds.minX, bounds.maxX),
            y: clamp(panStart.current.oy + g.dy, bounds.minY, bounds.maxY),
          };
          offsetRef.current = next;
          setOffset(next);
        },
        onPanResponderRelease: (evt) => {
          if (didPan.current || !interactive || !onRegionPress) return;
          const { locationX, locationY } = evt.nativeEvent;
          const mapX = locationX - offsetRef.current.x;
          const mapY = locationY - offsetRef.current.y;
          const region = findRegionAtPoint(mapX, mapY, mapSize);
          if (region) onRegionPress(region);
        },
        onPanResponderTerminate: () => {
          didPan.current = false;
        },
      }),
    [bounds, interactive, mapSize, onRegionPress],
  );

  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <View style={[styles.viewport, { width: viewportW, height: viewportH }]}>
      <View style={styles.mapFrame} {...panResponder.panHandlers}>
        <View
          style={{
            width: mapSize,
            height: mapSize,
            transform: [{ translateX: offset.x }, { translateY: offset.y }],
          }}
        >
          <KoreaSvgMap
            visitedRegionCodes={visitedRegionCodes}
            selectedCode={selectedCode}
            showLabels={showLabels}
            interactive={false}
            width={mapSize}
            height={mapSize}
            frameless
            pins={pins}
          />
        </View>
      </View>

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
          <Pressable
            style={[styles.zoomBtn, !canZoomIn && styles.zoomBtnDisabled]}
            onPress={() => changeZoom(zoomStep)}
            disabled={!canZoomIn}
            accessibilityRole="button"
            accessibilityLabel={t('map.zoomIn')}
          >
            <Ionicons
              name="add"
              size={22}
              color={canZoomIn ? theme.colors.text : theme.colors.textMuted}
            />
          </Pressable>
          <Pressable
            style={[styles.zoomBtn, !canZoomOut && styles.zoomBtnDisabled]}
            onPress={() => changeZoom(-zoomStep)}
            disabled={!canZoomOut}
            accessibilityRole="button"
            accessibilityLabel={t('map.zoomOut')}
          >
            <Ionicons
              name="remove"
              size={22}
              color={canZoomOut ? theme.colors.text : theme.colors.textMuted}
            />
          </Pressable>
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
      default: {
        boxShadow: '0 8px 28px rgba(15,23,42,0.10)',
      } as object,
    }),
  },
  mapFrame: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: theme.colors.mapBackground,
    ...(Platform.OS === 'web'
      ? ({ touchAction: 'none', cursor: 'grab' } as object)
      : null),
  },
  progressOverlay: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 2,
  },
  zoomControls: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 3,
    gap: theme.spacing.xs,
  },
  zoomBtn: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.mapControlBg,
    borderWidth: 1,
    borderColor: theme.colors.mapFrameBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  zoomBtnDisabled: {
    opacity: 0.45,
  },
});
