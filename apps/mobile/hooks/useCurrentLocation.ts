import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'ready'; coords: { lat: number; lng: number } }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'outside' }
  | { status: 'error'; message: string };

const FIX_TIMEOUT_MS = 15_000;

const inKorea = (lat: number, lng: number) => lat >= 32 && lat <= 39.5 && lng >= 124 && lng <= 132;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('위치를 찾는 데 시간이 너무 오래 걸려요')), ms)),
  ]);
}

/** Foreground location on demand (expo-location; the browser geolocation API on web). */
export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({ status: 'idle' });

  const locate = useCallback(async () => {
    setState({ status: 'locating' });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setState({ status: 'denied', canAskAgain: permission.canAskAgain });
        return;
      }
      const recent = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 500 }).catch(() => null);
      const position =
        recent ?? (await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), FIX_TIMEOUT_MS));
      const { latitude: lat, longitude: lng } = position.coords;
      setState(inKorea(lat, lng) ? { status: 'ready', coords: { lat, lng } } : { status: 'outside' });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : '위치를 확인하지 못했어요' });
    }
  }, []);

  return { state, locate };
}
