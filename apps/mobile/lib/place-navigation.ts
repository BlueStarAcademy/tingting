import { Linking, Platform } from 'react-native';
import type { Place } from '@tingting/shared';

export type PlaceNavigationProvider = 'naver' | 'kakaoMap' | 'kakaoNavi' | 'tmap';

const APP_NAME = 'com.bluestaracademy.tingting';

const encode = (value: string) => encodeURIComponent(value);

const webSearchUrl = (place: Place) =>
  `https://map.naver.com/p/search/${encode(place.name)}?c=${place.lng},${place.lat},15,0,0,0,dh`;

const kakaoWebRouteUrl = (place: Place) =>
  `https://map.kakao.com/link/to/${encode(place.name)},${place.lat},${place.lng}`;

function getPlaceNavigationUrls(place: Place, provider: PlaceNavigationProvider) {
  const name = encode(place.name);
  const lat = String(place.lat);
  const lng = String(place.lng);

  switch (provider) {
    case 'naver':
      return {
        appUrl: `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${name}&appname=${APP_NAME}`,
        fallbackUrl: webSearchUrl(place),
      };
    case 'kakaoMap':
      return {
        appUrl: `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`,
        fallbackUrl: kakaoWebRouteUrl(place),
      };
    case 'kakaoNavi':
      return {
        appUrl: `kakaonavi://navigate?name=${name}&x=${lng}&y=${lat}&coord_type=wgs84`,
        fallbackUrl: kakaoWebRouteUrl(place),
      };
    case 'tmap':
      return {
        appUrl: `tmap://route?goalname=${name}&goalx=${lng}&goaly=${lat}`,
        fallbackUrl: webSearchUrl(place),
      };
  }
}

async function openAppOrWeb(appUrl: string, fallbackUrl: string) {
  const url = Platform.OS === 'web' ? fallbackUrl : appUrl;

  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(fallbackUrl);
  }
}

export async function openPlaceNavigation(place: Place, provider: PlaceNavigationProvider) {
  const { appUrl, fallbackUrl } = getPlaceNavigationUrls(place, provider);
  await openAppOrWeb(appUrl, fallbackUrl);
}

type MapTarget = { name: string; lat: number; lng: number; kakaoPlaceId?: string };

/** Shows a place (not a route) in Kakao Map or Naver Map; Kakao results open their own place page. */
export async function openPlaceInMap(target: MapTarget, provider: 'kakao' | 'naver') {
  const name = encode(target.name);
  const { lat, lng } = target;
  if (provider === 'naver') {
    await openAppOrWeb(
      `nmap://place?lat=${lat}&lng=${lng}&name=${name}&appname=${APP_NAME}`,
      `https://map.naver.com/p/search/${name}?c=${lng},${lat},15,0,0,0,dh`,
    );
  } else if (target.kakaoPlaceId) {
    await openAppOrWeb(`kakaomap://place?id=${target.kakaoPlaceId}`, `https://place.map.kakao.com/${target.kakaoPlaceId}`);
  } else {
    await openAppOrWeb(`kakaomap://look?p=${lat},${lng}`, `https://map.kakao.com/link/map/${name},${lat},${lng}`);
  }
}
