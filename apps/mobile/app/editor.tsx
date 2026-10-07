import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type ErrorBoundaryProps, type Href } from 'expo-router';
import { getRegion } from '@tingting/shared';
import { PhotoEditor } from '@/components/editor/PhotoEditor';
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary';
import { api } from '@/lib/api';
import { saveEditorEffectsOff } from '@/lib/editor/effect-guard';
import { translate } from '@/lib/i18n/translations';
import { decodeLook } from '@/lib/editor/look';
import { safeBack } from '@/lib/navigation';
import { saveEditedPhoto, saveNewPhoto } from '@/lib/photo-flow';
import { DevicePermissionError, saveToDeviceAlbum } from '@/lib/save-photo';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <ScreenErrorBoundary
      {...props}
      screen="editor"
      canGoBack
      alternate={{ label: '효과 없이 다시 열기', onPress: () => saveEditorEffectsOff({ off: true, reason: 'error' }) }}
    />
  );
}

export default function EditorRoute() {
  const params = useLocalSearchParams<{
    uri: string;
    photoId?: string;
    placeId?: string;
    regionCode?: string;
    folderId?: string;
    /** 'device': save the result back into the phone gallery instead of TingTing */
    target?: string;
    /** '1': return to the previous screen after saving instead of opening the photo */
    back?: string;
    beauty?: string;
    filter?: string;
    look?: string;
  }>();
  const router = useRouter();
  const sourceUri = String(params.uri ?? '');
  const photoId = params.photoId ? String(params.photoId) : null;
  const regionCode = params.regionCode ? String(params.regionCode) : null;
  const folderId = params.folderId ? String(params.folderId) : null;
  const toDevice = params.target === 'device';
  const returnBack = params.back === '1';
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
      if (toDevice) {
        if (editedUri) {
          await saveToDeviceAlbum(editedUri);
          Alert.alert(translate('photos.savedTitle'), translate('album.phone.editSaved'));
        }
        safeBack(router);
        return;
      }
      if (photoId) {
        if (editedUri) await saveEditedPhoto(photoId, editedUri);
        safeBack(router);
        return;
      }
      const photo = await saveNewPhoto({ originalUri: sourceUri, editedUri, placeId, regionCode, folderId });
      if (returnBack) safeBack(router);
      else router.replace(`/photo/${photo.id}` as Href);
    } catch (e) {
      if (e instanceof DevicePermissionError) {
        Alert.alert(translate('photos.savePermissionTitle'), translate('photos.savePermissionMessage'));
      } else {
        Alert.alert('저장 실패', e instanceof Error ? e.message : '다시 시도해 주세요');
      }
      throw e;
    }
  };

  return (
    <PhotoEditor
      sourceUri={sourceUri}
      doneLabel={toDevice ? translate('album.phone.saveToPhone') : photoId ? '저장' : '앨범에 저장'}
      initialBeauty={params.beauty ? String(params.beauty) : null}
      initialFilter={params.filter ? String(params.filter) : null}
      initialLook={decodeLook(params.look ? String(params.look) : null)}
      caption={placeName ?? (regionCode ? getRegion(regionCode)?.name : undefined)}
      onCancel={() => safeBack(router)}
      onDone={done}
    />
  );
}
