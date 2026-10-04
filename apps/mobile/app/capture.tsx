import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { BeautyCameraScreen } from '@/components/beauty/BeautyCameraScreen';
import { encodeLook } from '@/lib/editor/look';
import { safeBack } from '@/lib/navigation';

export default function CaptureRoute() {
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const router = useRouter();

  return (
    <BeautyCameraScreen
      onClose={() => safeBack(router)}
      onCapture={(uri, look) => {
        const params = new URLSearchParams({ uri, look: encodeLook(look) });
        if (placeId) params.set('placeId', String(placeId));
        router.replace(`/editor?${params.toString()}` as Href);
      }}
    />
  );
}
