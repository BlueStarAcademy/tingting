import type { Region } from './types';

export const REGIONS: Region[] = [
  { code: 'SEO', name: '서울', nameEn: 'Seoul', color: '#6366F1' },
  { code: 'BUS', name: '부산', nameEn: 'Busan', color: '#818CF8' },
  { code: 'DAE', name: '대구', nameEn: 'Daegu', color: '#A78BFA' },
  { code: 'ICN', name: '인천', nameEn: 'Incheon', color: '#4F46E5' },
  { code: 'GWJ', name: '광주', nameEn: 'Gwangju', color: '#7C3AED' },
  { code: 'DJN', name: '대전', nameEn: 'Daejeon', color: '#5B21B6' },
  { code: 'ULS', name: '울산', nameEn: 'Ulsan', color: '#4338CA' },
  { code: 'SJG', name: '세종', nameEn: 'Sejong', color: '#8B5CF6' },
  { code: 'GGD', name: '경기', nameEn: 'Gyeonggi', color: '#6366F1' },
  { code: 'GWN', name: '강원', nameEn: 'Gangwon', color: '#312E81' },
  { code: 'NCB', name: '충북', nameEn: 'North Chungcheong', color: '#3730A3' },
  { code: 'SCB', name: '충남', nameEn: 'South Chungcheong', color: '#4C1D95' },
  { code: 'NJB', name: '전북', nameEn: 'North Jeolla', color: '#6D28D9' },
  { code: 'SJB', name: '전남', nameEn: 'South Jeolla', color: '#7E22CE' },
  { code: 'NGB', name: '경북', nameEn: 'North Gyeongsang', color: '#581C87' },
  { code: 'SGB', name: '경남', nameEn: 'South Gyeongsang', color: '#9333EA' },
  { code: 'JEJ', name: '제주', nameEn: 'Jeju', color: '#C026D3' },
];

export function getRegion(code: string): Region | undefined {
  return REGIONS.find((r) => r.code === code);
}
