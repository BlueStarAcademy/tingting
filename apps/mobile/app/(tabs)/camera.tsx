import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getRegion, type Place } from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { PlacePickerModal } from '@/components/PlacePickerModal';
import { PhotoGrid } from '@/components/PhotoGrid';
import { SectionTitle, type IconName } from '@/components/ui';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { pickGalleryPhoto, pickGalleryPhotos } from '@/lib/pick-photo';
import { uploadManyPhotos } from '@/lib/photo-flow';
import { cardSurface, shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

const PERMISSION = { permissionTitle: '사진 권한 필요', permissionMessage: '갤러리 접근을 허용해 주세요' };

export default function CameraHubScreen() {
  const router = useRouter();
  const innerWidth = useContentWidth() - theme.spacing.lg * 2;
  const [place, setPlace] = useState<Place | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const { data: recent, reload } = useFocusLoad(async () => (await api.listPhotos()).slice(0, 9));

  const placeQuery = place ? `placeId=${place.id}` : '';

  const editFromGallery = async () => {
    const uri = await pickGalleryPhoto(PERMISSION);
    if (!uri) return;
    router.push(`/editor?uri=${encodeURIComponent(uri)}${place ? `&${placeQuery}` : ''}` as Href);
  };

  const uploadMany = async () => {
    const uris = await pickGalleryPhotos(30, PERMISSION);
    if (uris.length === 0) return;
    setUploading(`0 / ${uris.length}`);
    const ok = await uploadManyPhotos(uris, place?.id, (done, total) => setUploading(`${done} / ${total}`));
    setUploading(null);
    Alert.alert('업로드 완료', ok === uris.length ? `${ok}장을 앨범에 담았어요` : `${ok}장 성공, ${uris.length - ok}장 실패`);
    await reload();
  };

  return (
    <Screen tab title="카메라">
      <Pressable style={styles.placeCard} onPress={() => setPickerOpen(true)}>
        <View style={styles.placeIcon}>
          <Ionicons name="location" size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.placeLabel}>어디서 찍나요?</Text>
          <Text style={styles.placeName} numberOfLines={1}>
            {place ? `${place.name} · ${getRegion(place.regionCode)?.name ?? ''}` : '장소 선택 안 함 (나중에 연결 가능)'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} />
      </Pressable>

      <Pressable onPress={() => router.push(`/capture${place ? `?${placeQuery}` : ''}` as Href)}>
        <LinearGradient
          colors={[theme.colors.primaryLight, theme.colors.primary, theme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, shadow('lg')]}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="camera" size={34} color={theme.colors.primary} />
          </View>
          <Text style={styles.heroTitle}>뷰티 카메라</Text>
          <Text style={styles.heroSub}>필터를 보면서 찍고, 바로 얼굴 보정 · 메이크업 · 스티커로 꾸며요</Text>
        </LinearGradient>
      </Pressable>

      <View style={styles.tiles}>
        <Tile icon="color-wand" title="사진 편집" sub="갤러리 사진 뽀샵" onPress={editFromGallery} />
        <Tile
          icon="cloud-upload"
          title={uploading ? `올리는 중` : '여러 장 올리기'}
          sub={uploading ?? '편집 없이 바로 앨범에'}
          onPress={uploading ? () => {} : uploadMany}
        />
      </View>

      {recent && recent.length > 0 ? (
        <>
          <SectionTitle title="최근 사진" action="앨범" onAction={() => router.push('/album')} />
          <PhotoGrid photos={recent} width={innerWidth} onPress={(photo) => router.push(`/photo/${photo.id}` as Href)} />
        </>
      ) : null}

      <PlacePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={place?.id}
        onSelect={setPlace}
        title="사진을 연결할 장소"
      />
    </Screen>
  );
}

function Tile({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.tile, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  placeCard: { ...cardSurface(), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  placeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  placeLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  placeName: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 2 },
  hero: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.xl,
    paddingVertical: 34,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: theme.spacing.md },
  tile: { ...cardSurface(), flex: 1, padding: 16, gap: 6 },
  pressed: { opacity: 0.85 },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint.light,
  },
  tileTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  tileSub: { color: theme.colors.textMuted, fontSize: 12 },
});
