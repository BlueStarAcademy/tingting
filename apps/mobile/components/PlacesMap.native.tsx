import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Callout, Marker } from 'react-native-maps';
import { Text } from 'react-native';
import { getPlaceCategory, type Place } from '@tingting/shared';
import { KOREA_INITIAL_REGION } from '@/lib/korea-map-geo';
import { theme } from '@/constants/theme';

type Props = {
  places: Place[];
  height: number;
  onPlacePress: (place: Place) => void;
};

export function PlacesMap({ places, height, onPlacePress }: Props) {
  const initialRegion = useMemo(() => {
    if (places.length === 0) return KOREA_INITIAL_REGION;
    const lats = places.map((p) => p.lat);
    const lngs = places.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.4),
    };
    // Only frame on first render; later filter changes keep the user's viewport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showMe, setShowMe] = useState(false);
  useEffect(() => {
    let alive = true;
    Location.requestForegroundPermissionsAsync()
      .then((res) => alive && setShowMe(res.granted))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={showMe}
        showsMyLocationButton={showMe}
      >
        {places.map((place) => {
          const info = getPlaceCategory(place.category);
          return (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.lat, longitude: place.lng }}
              pinColor={place.status === 'visited' ? info.color : theme.colors.primary}
              title={place.name}
            >
              <Callout onPress={() => onPlacePress(place)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{place.name}</Text>
                  <Text style={styles.calloutSub}>
                    {info.label} · {place.status === 'visited' ? '다녀왔어요' : '가고 싶어요'} · 눌러서 보기
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.mapFrameBorder,
    backgroundColor: theme.colors.mapBackground,
  },
  callout: { maxWidth: 220, padding: 4, gap: 2 },
  calloutTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  calloutSub: { color: theme.colors.textMuted, fontSize: 11 },
});
