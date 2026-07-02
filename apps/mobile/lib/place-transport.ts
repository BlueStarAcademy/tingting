import type { Place } from '@tingting/shared';
import { getRegion } from '@tingting/shared';

export type TransportLine = {
  icon: 'train' | 'bus' | 'subway' | 'car' | 'plane';
  title: string;
  detail: string;
};

const METRO_CODES = new Set(['SEO', 'BUS', 'DAE', 'ICN', 'GWJ', 'DJN', 'ULS', 'SJG']);

export function getPlaceTransport(place: Place): TransportLine[] {
  const region = getRegion(place.regionCode);
  const name = region?.name ?? place.regionCode;
  const lines: TransportLine[] = [];

  if (METRO_CODES.has(place.regionCode)) {
    lines.push({
      icon: 'subway',
      title: `${name} 지하철`,
      detail: '가장 가까운 역에서 도보 10~15분 · 시내 접근에 편리합니다.',
    });
  }

  lines.push({
    icon: 'bus',
    title: '시내버스',
    detail: `${place.name} 인근 정류장 · 카카오맵/네이버지도에서 "버스" 검색`,
  });

  if (!METRO_CODES.has(place.regionCode) || place.regionCode === 'SEO' || place.regionCode === 'BUS') {
    lines.push({
      icon: 'train',
      title: 'KTX · ITX · 무궁화',
      detail: `${name}역 하차 후 택시/버스 환승 · 약 20~40분 소요`,
    });
  }

  if (place.regionCode === 'JEJ') {
    lines.push({
      icon: 'plane',
      title: '제주국제공항',
      detail: '공항에서 렌터카 또는 공항버스 이용 · 제주 일주에 차량 추천',
    });
  } else {
    lines.push({
      icon: 'car',
      title: '자가용 / 렌터카',
      detail: `내비게이션: ${place.name} · 주차장 여부는 현장 확인`,
    });
  }

  return lines;
}
