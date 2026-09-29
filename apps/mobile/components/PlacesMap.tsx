import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Place } from '@tingting/shared';
import { KoreaSvgMap } from '@/components/KoreaSvgMap';
import { latLngToSvg } from '@/lib/korea-map-coords';
import { useContentWidth } from '@/hooks/useContentWidth';
import { theme } from '@/constants/theme';

type Props = {
  places: Place[];
  height: number;
  onPlacePress: (place: Place) => void;
};

/** Web / non-native fallback: SVG map with pins (tap the list below to open a place). */
export function PlacesMap({ places, height }: Props) {
  const width = useContentWidth() - theme.spacing.lg * 2;
  const pins = useMemo(() => places.map((p) => latLngToSvg(p.lat, p.lng)), [places]);
  const size = Math.min(width, height);
  return (
    <View style={[styles.wrap, { height }]}>
      <KoreaSvgMap width={size} height={size} pins={pins} interactive={false} frameless />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.mapBackground,
  },
});
