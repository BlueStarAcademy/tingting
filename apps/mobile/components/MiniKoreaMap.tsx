import { View, Text, StyleSheet } from 'react-native';
import { REGIONS } from '@tingting/shared';
import { theme } from '@/constants/theme';

/** Approximate geographic layout for 17 시·도 mini map */
const REGION_LAYOUT: Record<string, { left: number; top: number; w: number; h: number }> = {
  GWN: { left: 38, top: 2, w: 28, h: 22 },
  GGD: { left: 28, top: 18, w: 22, h: 18 },
  ICN: { left: 18, top: 28, w: 14, h: 12 },
  SEO: { left: 32, top: 28, w: 16, h: 12 },
  NCB: { left: 48, top: 28, w: 16, h: 14 },
  SCB: { left: 42, top: 42, w: 16, h: 14 },
  DJN: { left: 38, top: 42, w: 12, h: 10 },
  SJG: { left: 34, top: 48, w: 10, h: 8 },
  GWJ: { left: 18, top: 48, w: 14, h: 12 },
  NJB: { left: 24, top: 58, w: 16, h: 12 },
  ULS: { left: 58, top: 48, w: 12, h: 10 },
  BUS: { left: 62, top: 56, w: 14, h: 12 },
  DAE: { left: 52, top: 52, w: 12, h: 10 },
  NGB: { left: 58, top: 36, w: 18, h: 14 },
  SGB: { left: 52, top: 62, w: 16, h: 12 },
  SJB: { left: 22, top: 68, w: 18, h: 12 },
  JEJ: { left: 28, top: 82, w: 14, h: 10 },
};

interface Props {
  visitedRegionCodes: string[];
  width?: number;
  height?: number;
}

export function MiniKoreaMap({ visitedRegionCodes, width = 160, height = 100 }: Props) {
  const visited = new Set(visitedRegionCodes);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.outline} />
      {REGIONS.map((region) => {
        const layout = REGION_LAYOUT[region.code];
        if (!layout) return null;
        const isVisited = visited.has(region.code);
        return (
          <View
            key={region.code}
            style={[
              styles.region,
              {
                left: (layout.left / 100) * width,
                top: (layout.top / 100) * height,
                width: (layout.w / 100) * width,
                height: (layout.h / 100) * height,
                backgroundColor: isVisited ? region.color : 'rgba(148,163,184,0.25)',
                opacity: isVisited ? 1 : 0.5,
                borderColor: isVisited ? region.color : 'rgba(148,163,184,0.4)',
              },
            ]}
          >
            {isVisited ? <Text style={styles.check}>✓</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  outline: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
    borderRadius: theme.radius.sm,
  },
  region: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 8, fontWeight: '800' },
});
