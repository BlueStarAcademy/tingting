import { Platform, useWindowDimensions } from 'react-native';
import { MOBILE_MAX_WIDTH } from '@/constants/layout';

/** SSR/정적 export 시 useWindowDimensions()가 0 — 배포 Web에서 빈 화면 방지 */
function webContentWidth(width: number): number {
  const w = Math.round(width);
  const effective = w > 0 ? w : MOBILE_MAX_WIDTH;
  return Math.min(effective, MOBILE_MAX_WIDTH);
}

/** 현재 화면에서 콘텐츠가 차지해야 하는 실제 너비(px) */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  if (Platform.OS === 'web') {
    return webContentWidth(width);
  }
  return Math.round(width);
}
