import { useLocalSearchParams, useRouter, type ErrorBoundaryProps, type Href } from 'expo-router';
import { BeautyCameraScreen } from '@/components/beauty/BeautyCameraScreen';
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary';
import { saveCameraSafeMode } from '@/lib/camera-safe-mode';
import { encodeLook } from '@/lib/editor/look';
import { safeBack } from '@/lib/navigation';

/** Album placement params passed straight through to the editor. */
const FORWARDED = ['placeId', 'regionCode', 'folderId', 'back'] as const;

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <ScreenErrorBoundary
      {...props}
      screen="capture"
      canGoBack
      alternate={{ label: '안전 모드로 다시 열기', onPress: () => saveCameraSafeMode({ on: true, reason: 'error' }) }}
    />
  );
}

export default function CaptureRoute() {
  const query = useLocalSearchParams<{ placeId?: string; regionCode?: string; folderId?: string; back?: string }>();
  const router = useRouter();

  return (
    <BeautyCameraScreen
      onClose={() => safeBack(router)}
      onCapture={(uri, look) => {
        const params = new URLSearchParams({ uri, look: encodeLook(look) });
        for (const key of FORWARDED) {
          if (query[key]) params.set(key, String(query[key]));
        }
        router.replace(`/editor?${params.toString()}` as Href);
      }}
    />
  );
}
