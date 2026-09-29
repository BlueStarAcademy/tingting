import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { PhotoEditor } from '@/components/editor/PhotoEditor';
import { api } from '@/lib/api';
import { safeBack } from '@/lib/navigation';
import { saveEditedPhoto, saveNewPhoto } from '@/lib/photo-flow';

export default function EditorRoute() {
  const params = useLocalSearchParams<{
    uri: string;
    photoId?: string;
    placeId?: string;
    beauty?: string;
    filter?: string;
  }>();
  const router = useRouter();
  const sourceUri = String(params.uri ?? '');
  const photoId = params.photoId ? String(params.photoId) : null;
  const [placeId, setPlaceId] = useState<string | null>(params.placeId ? String(params.placeId) : null);
  const [placeName, setPlaceName] = useState<string | undefined>();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let id = placeId;
        if (!id && photoId) {
          id = (await api.getPhoto(photoId)).placeId ?? null;
          if (alive && id) setPlaceId(id);
        }
        if (!id) return;
        const detail = await api.getPlace(id);
        if (alive) setPlaceName(detail.place.name);
      } catch {
        // the caption simply falls back to the default text
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

  const done = async (editedUri: string | null) => {
    try {
      if (photoId) {
        if (editedUri) await saveEditedPhoto(photoId, editedUri);
        safeBack(router);
        return;
      }
      const photo = await saveNewPhoto({ originalUri: sourceUri, editedUri, placeId });
      router.replace(`/photo/${photo.id}` as Href);
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '다시 시도해 주세요');
      throw e;
    }
  };

  return (
    <PhotoEditor
      sourceUri={sourceUri}
      doneLabel={photoId ? '저장' : '앨범에 저장'}
      initialBeauty={params.beauty ? String(params.beauty) : null}
      initialFilter={params.filter ? String(params.filter) : null}
      caption={placeName}
      onCancel={() => safeBack(router)}
      onDone={done}
    />
  );
}
