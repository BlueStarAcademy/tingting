declare module 'react-native-maps' {
  import type { Component, Ref } from 'react';
  import type { ViewProps } from 'react-native';

  export type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  export type LatLng = {
    latitude: number;
    longitude: number;
  };

  export type MapPressEvent = {
    nativeEvent: {
      coordinate: LatLng;
    };
  };

  export type MapViewProps = ViewProps & {
    ref?: Ref<MapView>;
    initialRegion?: Region;
    mapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain' | 'mutedStandard';
    rotateEnabled?: boolean;
    pitchEnabled?: boolean;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    onPress?: (event: MapPressEvent) => void;
  };

  export type PolygonProps = {
    coordinates: LatLng[];
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    zIndex?: number;
    tappable?: boolean;
    onPress?: () => void;
  };

  export type MarkerProps = {
    coordinate: LatLng;
    title?: string;
    pinColor?: string;
    onPress?: () => void;
  };

  export default class MapView extends Component<MapViewProps> {
    animateToRegion(region: Region, duration?: number): void;
  }

  export class Polygon extends Component<PolygonProps> {}
  export class Marker extends Component<MarkerProps> {}
}
