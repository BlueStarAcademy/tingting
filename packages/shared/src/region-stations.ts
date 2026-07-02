/** 17개 행정구역별 대표 기차역(제주는 철도 미운영 → 공항) */
export interface RegionMainStation {
  regionCode: string;
  placeId: string;
  stationName: string;
  lat: number;
  lng: number;
}

export const REGION_MAIN_STATIONS: RegionMainStation[] = [
  { regionCode: 'SEO', placeId: 'p-seo-station', stationName: '서울역', lat: 37.5547, lng: 126.9707 },
  { regionCode: 'BUS', placeId: 'p-bus-station', stationName: '부산역', lat: 35.1156, lng: 129.0423 },
  { regionCode: 'DAE', placeId: 'p-dae-station', stationName: '동대구역', lat: 35.8796, lng: 128.6283 },
  { regionCode: 'ICN', placeId: 'p-icn-station', stationName: '인천역', lat: 37.4767, lng: 126.6167 },
  { regionCode: 'GWJ', placeId: 'p-gwj-station', stationName: '광주송정역', lat: 35.1393, lng: 126.7936 },
  { regionCode: 'DJN', placeId: 'p-djn-station', stationName: '대전역', lat: 36.3325, lng: 127.4343 },
  { regionCode: 'ULS', placeId: 'p-uls-station', stationName: '울산역', lat: 35.5514, lng: 129.1385 },
  { regionCode: 'SJG', placeId: 'p-sjg-station', stationName: '오송역', lat: 36.6207, lng: 127.3278 },
  { regionCode: 'GGD', placeId: 'p-ggd-station', stationName: '수원역', lat: 37.2659, lng: 127.0000 },
  { regionCode: 'GWN', placeId: 'p-gwn-station', stationName: '강릉역', lat: 37.7644, lng: 128.8978 },
  { regionCode: 'NCB', placeId: 'p-ncb-station', stationName: '청주역', lat: 36.7166, lng: 127.4992 },
  { regionCode: 'SCB', placeId: 'p-scb-station', stationName: '천안아산역', lat: 36.7947, lng: 127.1047 },
  { regionCode: 'NJB', placeId: 'p-njb-station', stationName: '전주역', lat: 35.8494, lng: 127.1297 },
  { regionCode: 'SJB', placeId: 'p-sjb-station', stationName: '여수엑스포역', lat: 34.7344, lng: 127.7389 },
  { regionCode: 'NGB', placeId: 'p-ngb-station', stationName: '경주역', lat: 35.7983, lng: 129.1378 },
  { regionCode: 'SGB', placeId: 'p-sgb-station', stationName: '창원중앙역', lat: 35.2289, lng: 128.6817 },
  { regionCode: 'JEJ', placeId: 'p-jej-station', stationName: '제주공항', lat: 33.5067, lng: 126.4922 },
];

export function getRegionMainStation(regionCode: string): RegionMainStation | undefined {
  return REGION_MAIN_STATIONS.find((s) => s.regionCode === regionCode);
}

export function buildGroupStationQuestId(regionCode: string): string {
  return `group-station-${regionCode}`;
}
