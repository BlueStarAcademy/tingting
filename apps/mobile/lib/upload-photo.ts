import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { API_URL, getToken } from '@/lib/api';

function guessContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png') || lower.startsWith('data:image/png')) return 'image/png';
  if (lower.includes('.webp') || lower.startsWith('data:image/webp')) return 'image/webp';
  return 'image/jpeg';
}

async function uriToBase64Payload(uri: string): Promise<{ base64: string; contentType: string }> {
  if (uri.startsWith('data:')) {
    return { base64: uri, contentType: guessContentType(uri) };
  }

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const contentType = blob.type || guessContentType(uri);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });
    return { base64: dataUrl, contentType };
  }

  const contentType = guessContentType(uri);
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { base64: `data:${contentType};base64,${base64}`, contentType };
}

export function isRemotePhotoUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return /^https?:\/\//i.test(uri);
}

/** Upload a local image to the Railway volume and return its public URL. */
export async function uploadPhotoUri(uri: string, filename = `tingting_${Date.now()}.jpg`): Promise<string> {
  if (!uri) throw new Error('Photo URI required');
  if (isRemotePhotoUrl(uri)) return uri;

  const token = await getToken();
  if (!token) throw new Error('로그인이 필요해요');

  const { base64, contentType } = await uriToBase64Payload(uri);
  const res = await fetch(`${API_URL}/media/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ base64, contentType, filename }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? `업로드 실패 (${res.status})`);
  }
  return data.url;
}
