import { Platform, useWindowDimensions } from 'react-native';
import { MOBILE_MAX_WIDTH } from '@/constants/layout';

/** 현재 화면에서 콘텐츠가 차지해야 하는 실제 너비(px) */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  if (Platform.OS === 'web') {
    return Math.min(Math.round(width), MOBILE_MAX_WIDTH);
  }
  return Math.round(width);
}
