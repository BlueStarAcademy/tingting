import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
  accuracy?: number | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

export async function getCurrentCoords(): Promise<Coords> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) throw new Error('기기의 위치 서비스를 켜 주세요');
  const granted = await requestLocationPermission();
  if (!granted) throw new Error('위치 권한이 거부되었습니다');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
  if (pos.mocked) throw new Error('모의 위치가 감지되어 GPS 인증을 진행할 수 없습니다');
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
