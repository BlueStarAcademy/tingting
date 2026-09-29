import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { BeautyCameraScreen } from '@/components/beauty/BeautyCameraScreen';
import { safeBack } from '@/lib/navigation';

export default function CaptureRoute() {
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const router = useRouter();

  return (
    <BeautyCameraScreen
      onClose={() => safeBack(router)}
      onCapture={(uri, look) => {
        const params = new URLSearchParams({ uri, beauty: look.beauty });
        if (look.filter) params.set('filter', look.filter);
        if (placeId) params.set('placeId', String(placeId));
        router.replace(`/editor?${params.toString()}` as Href);
      }}
    />
  );
}
