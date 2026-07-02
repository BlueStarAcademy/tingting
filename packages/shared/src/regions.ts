import type { Region } from './types';

/** Refined palette for visited regions on the map */
export const REGIONS: Region[] = [
  { code: 'SEO', name: '서울', nameEn: 'Seoul', color: '#4A6FA5' },
  { code: 'BUS', name: '부산', nameEn: 'Busan', color: '#3D8BCE' },
  { code: 'DAE', name: '대구', nameEn: 'Daegu', color: '#6B7FD7' },
  { code: 'ICN', name: '인천', nameEn: 'Incheon', color: '#5B7C99' },
  { code: 'GWJ', name: '광주', nameEn: 'Gwangju', color: '#5E8F8B' },
  { code: 'DJN', name: '대전', nameEn: 'Daejeon', color: '#6A7F9B' },
  { code: 'ULS', name: '울산', nameEn: 'Ulsan', color: '#4E7A9C' },
  { code: 'SJG', name: '세종', nameEn: 'Sejong', color: '#7A8FA6' },
  { code: 'GGD', name: '경기', nameEn: 'Gyeonggi', color: '#567BA8' },
  { code: 'GWN', name: '강원', nameEn: 'Gangwon', color: '#3E6F8F' },
  { code: 'NCB', name: '충북', nameEn: 'North Chungcheong', color: '#6289A0' },
  { code: 'SCB', name: '충남', nameEn: 'South Chungcheong', color: '#5C85A8' },
  { code: 'NJB', name: '전북', nameEn: 'North Jeolla', color: '#6B8F7A' },
  { code: 'SJB', name: '전남', nameEn: 'South Jeolla', color: '#4F8F9A' },
  { code: 'NGB', name: '경북', nameEn: 'North Gyeongsang', color: '#7A6B9A' },
  { code: 'SGB', name: '경남', nameEn: 'South Gyeongsang', color: '#5A82B0' },
  { code: 'JEJ', name: '제주', nameEn: 'Jeju', color: '#4A9B8E' },
];

export function getRegion(code: string): Region | undefined {
  return REGIONS.find((r) => r.code === code);
}
