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

export async function openPlaceNavigation(place: Place, provider: PlaceNavigationProvider) {
  const { appUrl, fallbackUrl } = getPlaceNavigationUrls(place, provider);
  const url = Platform.OS === 'web' ? fallbackUrl : appUrl;

  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(fallbackUrl);
  }
}
