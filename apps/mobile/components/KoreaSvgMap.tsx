import { Fragment } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { REGIONS, type Region } from '@tingting/shared';
import { KOREA_MAP_VIEWBOX, type KoreaMapRegionPath } from '@/constants/korea-map-paths';
import {
  getMapRegionsForHitTest,
  getMapRegionsForRender,
  METRO_CODES,
  METRO_HIT_STROKE,
} from '@/lib/korea-map-render';
import {
  labelFontSize,
  labelPillSize,
  labelText,
  regionFill,
  regionStroke,
  regionStrokeWidth,
} from '@/lib/korea-map-visual';
import { theme } from '@/constants/theme';
import type { MapPin } from '@/lib/korea-map-coords';

const REGION_BY_CODE = Object.fromEntries(REGIONS.map((r) => [r.code, r]));

export type { MapPin } from '@/lib/korea-map-coords';

function renderMapPin(pin: MapPin, key: string) {
  const { x, y } = pin;
  return (
    <G key={key} pointerEvents="none">
      <Path
        d={`M ${x} ${y - 16} C ${x - 11} ${y - 7} ${x - 11} ${y + 5} ${x} ${y + 12} C ${x + 11} ${y + 5} ${x + 11} ${y - 7} Z`}
        fill="#E11D48"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx={x} cy={y - 1} r={4} fill="#FFFFFF" />
    </G>
  );
}

function renderHitPath(code: string, d: string, onRegionPress: (region: Region) => void) {
  const region = REGION_BY_CODE[code];
  if (!region) return null;
  const isMetro = METRO_CODES.has(code);
  return (
    <Path
      key={`hit-${code}`}
      d={d}
      fill="rgba(0,0,0,0.001)"
      stroke="rgba(0,0,0,0.001)"
      strokeWidth={isMetro ? METRO_HIT_STROKE : 10}
      strokeLinejoin="round"
      strokeLinecap="round"
      onPress={() => onRegionPress(region)}
    />
  );
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
  const stroke = regionStroke(selectedCode, code);
  const strokeWidth = regionStrokeWidth(selectedCode, code);
  const isVisited = visited.has(code);
  const text = labelText(region);
  const fontSize = labelFontSize(code, selectedCode);
  const { w, h } = labelPillSize(text, fontSize);

  return (
    <G>
      <Path
        d={d}
        fill={fill}
        fillOpacity={isVisited || selectedCode === code ? 0.96 : 0.72}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {showLabels ? (
        <G pointerEvents="none">
          <Rect
            x={label.cx - w / 2}
            y={label.cy - h / 2 + 1}
            width={w}
            height={h}
            rx={h / 2}
            fill={theme.colors.mapLabelBg}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={0.6}
          />
          <SvgText
            x={label.cx}
            y={label.cy + fontSize * 0.34}
            fill={theme.colors.mapLabel}
            fontSize={fontSize}
            fontWeight="700"
            textAnchor="middle"
          >
            {text}
          </SvgText>
        </G>
      ) : null}
    </G>
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
  pins?: MapPin[];
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
  pins = [],
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const mapWidth = width ?? Math.min(windowWidth - 32, 360);
  const mapHeight = height ?? mapWidth;
  const visited = new Set(visitedRegionCodes);

  return (
    <View style={[frameless ? styles.frameless : styles.wrap, { width: mapWidth, height: mapHeight }]}>
      <Svg width={mapWidth} height={mapHeight} viewBox={KOREA_MAP_VIEWBOX}>
        <Defs>
          <LinearGradient id="mapSea" x1="0" y1="0" x2="1000" y2="1000" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={theme.colors.mapSeaStart} />
            <Stop offset="1" stopColor={theme.colors.mapSeaEnd} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={1000} height={1000} fill="url(#mapSea)" />
        {getMapRegionsForRender().map((entry) => (
          <Fragment key={`vis-${entry.code}`}>
            {renderVisualRegion(entry, visited, selectedCode, showLabels)}
          </Fragment>
        ))}
        {pins.map((pin, i) => renderMapPin(pin, `pin-${i}`))}
        {interactive && onRegionPress
          ? getMapRegionsForRender()
              .filter(({ code }) => !METRO_CODES.has(code))
              .map(({ code, d }) => renderHitPath(code, d, onRegionPress))
          : null}
        {interactive && onRegionPress
          ? getMapRegionsForHitTest().map(({ code, d }) => renderHitPath(code, d, onRegionPress))
          : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.mapBackground,
    borderWidth: 1,
    borderColor: theme.colors.mapFrameBorder,
  },
  frameless: {
    overflow: 'hidden',
    backgroundColor: theme.colors.mapBackground,
  },
});
