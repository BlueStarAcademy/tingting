import { createElement } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { REGIONS, type Region } from '@tingting/shared';
import { KOREA_MAP_VIEWBOX, type KoreaMapRegionPath } from '@/constants/korea-map-paths';
import {
  getMapRegionsForHitTest,
  getMapRegionsForRender,
  METRO_CODES,
  METRO_HIT_STROKE,
} from '@/lib/korea-map-render';
import { theme } from '@/constants/theme';

const REGION_BY_CODE = Object.fromEntries(REGIONS.map((r) => [r.code, r]));

function renderHitPath(code: string, d: string, onRegionPress: (region: Region) => void) {
  const region = REGION_BY_CODE[code];
  if (!region) return null;
  const isMetro = METRO_CODES.has(code);
  return createElement('path', {
    key: `hit-${code}`,
    d,
    fill: 'rgba(0,0,0,0.001)',
    stroke: 'rgba(0,0,0,0.001)',
    strokeWidth: isMetro ? METRO_HIT_STROKE : 10,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onRegionPress(region);
    },
    style: { cursor: 'pointer' },
  });
}

function regionFill(
  code: string,
  visited: Set<string>,
  selectedCode: string | null | undefined,
  region: Region,
) {
  const isVisited = visited.has(code);
  const isSelected = selectedCode === code;
  return isSelected
    ? theme.colors.primary
    : isVisited
      ? region.color
      : theme.colors.mapUnvisited;
}

function renderVisualRegion(
  { code, d, label }: KoreaMapRegionPath,
  visited: Set<string>,
  selectedCode: string | null | undefined,
  showLabels: boolean,
) {
  const region = REGION_BY_CODE[code];
  if (!region) return null;

  const fill = regionFill(code, visited, selectedCode, region);
  const stroke = selectedCode === code ? theme.colors.onPrimary : theme.colors.mapStroke;
  const strokeWidth = selectedCode === code ? 2.5 : 0.8;

  return createElement(
    'g',
    { key: `vis-${code}` },
    createElement('path', {
      d,
      fill,
      stroke,
      strokeWidth,
      strokeLinejoin: 'round',
      strokeLinecap: 'round',
    }),
    showLabels
      ? createElement(
          'text',
          {
            x: label.cx,
            y: label.cy + 4,
            fill: theme.colors.mapLabel,
            fontSize: selectedCode === code ? 13 : code === 'SJG' || code === 'SEO' ? 9 : 11,
            fontWeight: 700,
            textAnchor: 'middle',
            pointerEvents: 'none',
          },
          region.name.length <= 3 ? region.name : region.name.slice(0, 2),
        )
      : null,
  );
}

interface Props {
  visitedRegionCodes?: string[];
  selectedCode?: string | null;
  onRegionPress?: (region: Region) => void;
  width?: number;
  height?: number;
  showLabels?: boolean;
  interactive?: boolean;
  frameless?: boolean;
}

export function KoreaSvgMap({
  visitedRegionCodes = [],
  selectedCode,
  onRegionPress,
  width,
  height,
  showLabels = true,
  interactive = true,
  frameless = false,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const mapWidth = width ?? Math.min(windowWidth - 32, 360);
  const mapHeight = height ?? mapWidth;
  const visited = new Set(visitedRegionCodes);

  return (
    <View style={[frameless ? styles.frameless : styles.wrap, { width: mapWidth, height: mapHeight }]}>
      {createElement(
        'svg',
        {
          width: mapWidth,
          height: mapHeight,
          viewBox: KOREA_MAP_VIEWBOX,
          style: { display: 'block' },
        },
        [
          ...getMapRegionsForRender().map((entry) =>
            renderVisualRegion(entry, visited, selectedCode, showLabels),
          ),
          ...(interactive && onRegionPress
            ? [
                ...getMapRegionsForRender()
                  .filter(({ code }) => !METRO_CODES.has(code))
                  .map(({ code, d }) => renderHitPath(code, d, onRegionPress)),
                ...getMapRegionsForHitTest().map(({ code, d }) => renderHitPath(code, d, onRegionPress)),
              ]
            : []),
        ],
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.mapBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  frameless: {
    overflow: 'hidden',
    backgroundColor: theme.colors.mapBackground,
  },
});
