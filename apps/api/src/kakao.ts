import { categoryFromKakao, resolveRegionCode, type KakaoPlaceResult } from '@tingting/shared';
import { config } from './config';
import { HttpError } from './http';

interface KakaoKeywordDoc {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code?: string;
  phone?: string;
  x: string;
  y: string;
  address_name: string;
  road_address_name?: string;
  place_url?: string;
}

interface KakaoAddressDoc {
  x: string;
  y: string;
  address_name: string;
}

async function kakaoGet<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  if (!config.kakaoRestApiKey) {
    throw new HttpError(503, '서버에 KAKAO_REST_API_KEY가 설정되지 않았어요');
  }
  const url = new URL(`https://dapi.kakao.com${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${config.kakaoRestApiKey}` } });
  if (!res.ok) {
    throw new HttpError(502, `카카오 검색 오류 (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function searchKakaoPlaces(query: string): Promise<KakaoPlaceResult[]> {
  const data = await kakaoGet<{ documents: KakaoKeywordDoc[] }>('/v2/local/search/keyword.json', {
    query,
    size: '15',
  });
  return (data.documents ?? []).map((doc) => {
    const lat = parseFloat(doc.y);
    const lng = parseFloat(doc.x);
    const address = doc.road_address_name || doc.address_name;
    const kakaoCategory = doc.category_name.split('>').map((s) => s.trim()).filter(Boolean).pop() ?? doc.category_name;
    return {
      kakaoPlaceId: doc.id,
      name: doc.place_name,
      category: categoryFromKakao(doc.category_group_code, doc.category_name),
      kakaoCategory,
      address,
      lat,
      lng,
      phone: doc.phone || undefined,
      url: doc.place_url || undefined,
      regionCode: resolveRegionCode(doc.address_name || address, lat, lng),
    };
  });
}

/** Geocode a free-form Korean address. Returns null if Kakao has no match or no key is configured. */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; address: string } | null> {
  if (!config.kakaoRestApiKey) return null;
  const data = await kakaoGet<{ documents: KakaoAddressDoc[] }>('/v2/local/search/address.json', { query: address });
  const doc = data.documents?.[0];
  if (!doc) return null;
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x), address: doc.address_name };
}
