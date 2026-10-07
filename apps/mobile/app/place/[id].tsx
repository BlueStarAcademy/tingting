import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getPlaceCategory,
  getRegion,
  PLACE_CATEGORIES,
  type CoupleUser,
  type PlaceCategory,
  type PlaceDetail,
  type PlaceReview,
} from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { AppModal } from '@/components/AppModal';
import { SheetHeader } from '@/components/SheetHeader';
import { DateField } from '@/components/DateField';
import { PhotoGrid } from '@/components/PhotoGrid';
import { PremiumIconButton } from '@/components/PremiumIconButton';
import {
  ActionButton,
  Card,
  CategoryBadge,
  EmptyState,
  Field,
  Loading,
  Segment,
  SectionTitle,
  StarRating,
  StatusBadge,
  type IconName,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useFocusLoad } from '@/hooks/useFocusLoad';
import { api } from '@/lib/api';
import { formatDateKey, formatDateRange, todayKey } from '@/lib/dates';
import { thumbUri } from '@/lib/media';
import { openPlaceNavigation, type PlaceNavigationProvider } from '@/lib/place-navigation';
import { pickGalleryPhotos } from '@/lib/pick-photo';
import { uploadManyPhotos } from '@/lib/photo-flow';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

const NAV_APPS: { id: PlaceNavigationProvider; label: string; color: string }[] = [
  { id: 'naver', label: '네이버지도', color: '#03C75A' },
  { id: 'kakaoMap', label: '카카오맵', color: '#F7B500' },
  { id: 'kakaoNavi', label: '카카오내비', color: '#1E88E5' },
  { id: 'tmap', label: '티맵', color: '#E6002D' },
];

type Sheet = null | 'visit' | 'review' | 'memo' | 'edit' | 'plan';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = String(id);
  const router = useRouter();
  const { user, partner } = useAuth();
  const innerWidth = useContentWidth() - theme.spacing.lg * 2;
  const { data, setData, error, refreshing, refresh, reload } = useFocusLoad(() => api.getPlace(placeId));
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  if (!data) {
    return (
      <Screen title="장소">
        {error ? <EmptyState icon="alert-circle-outline" title="장소를 불러오지 못했어요" message={error} /> : <Loading />}
      </Screen>
    );
  }

  const { place, reviews, visits, photos } = data;
  const info = getPlaceCategory(place.category);
  const region = getRegion(place.regionCode);
  const myReview = reviews.find((r) => r.userId === user?.id);
  const partnerReview = partner ? reviews.find((r) => r.userId === partner.id) : undefined;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '다시 시도해 주세요');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = () =>
    run(async () => {
      const updated = await api.updatePlace(placeId, { status: place.status === 'visited' ? 'wish' : 'visited' });
      setData({ ...data, place: updated });
    });

  const rate = (rating: number) =>
    run(async () => {
      const review = await api.saveReview(placeId, rating, myReview?.comment);
      setData({ ...data, reviews: [...reviews.filter((r) => r.userId !== review.userId), review] });
    });

  const addPhotosFromGallery = async () => {
    const uris = await pickGalleryPhotos(30, {
      permissionTitle: '사진 권한 필요',
      permissionMessage: '갤러리 접근을 허용해 주세요',
    });
    if (uris.length === 0) return;
    setUploading(`0 / ${uris.length}`);
    const ok = await uploadManyPhotos(uris, placeId, (done, total) => setUploading(`${done} / ${total}`));
    setUploading(null);
    if (ok < uris.length) Alert.alert('일부 실패', `${uris.length - ok}장을 올리지 못했어요`);
    await reload();
  };

  const confirmDelete = () => {
    Alert.alert('장소 삭제', `"${place.name}"을(를) 삭제할까요?\n사진은 앨범에 그대로 남아요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await api.deletePlace(placeId);
            setSheet(null);
            router.back();
          }),
      },
    ]);
  };

  const deleteVisit = (visitId: string) => {
    Alert.alert('방문 기록 삭제', '이 방문 기록을 지울까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await api.deleteVisit(visitId);
            setData({ ...data, visits: visits.filter((v) => v.id !== visitId) });
          }),
      },
    ]);
  };

  const eventRange = place.category === 'event' ? formatDateRange(place.eventStart, place.eventEnd) : null;

  return (
    <Screen
      title={place.name}
      refreshing={refreshing}
      onRefresh={refresh}
      right={<PremiumIconButton icon="create-outline" onPress={() => setSheet('edit')} accessibilityLabel="장소 수정" />}
    >
      {place.coverPhotoUri ? (
        <Image source={{ uri: thumbUri(place.coverPhotoUri, innerWidth) }} style={styles.cover} resizeMethod="resize" />
      ) : (
        <View style={[styles.cover, styles.coverFallback, { backgroundColor: `${info.color}22` }]}>
          <Ionicons name={info.icon as IconName} size={56} color={info.color} />
        </View>
      )}

      <View style={styles.titleBlock}>
        <Text style={styles.name}>{place.name}</Text>
        <View style={styles.badges}>
          <CategoryBadge category={place.category} />
          <StatusBadge status={place.status} />
          {region ? (
            <Pressable onPress={() => router.push(`/region/${region.code}` as Href)}>
              <Text style={styles.regionLink}>{region.name} ›</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <ActionButton
          icon={place.status === 'visited' ? 'heart-outline' : 'checkmark-circle'}
          label={place.status === 'visited' ? '가고 싶어요로 변경' : '다녀왔어요'}
          tone={place.status === 'visited' ? 'soft' : 'primary'}
          onPress={toggleStatus}
          disabled={busy}
          style={styles.flex}
        />
        <ActionButton icon="calendar-outline" label="일정에 추가" onPress={() => setSheet('plan')} style={styles.flex} />
      </View>

      <Card style={styles.infoCard}>
        {eventRange ? <InfoRow icon="calendar" text={eventRange} /> : null}
        {place.address ? <InfoRow icon="location-outline" text={place.address} /> : null}
        {place.phone ? <InfoRow icon="call-outline" text={place.phone} onPress={() => Linking.openURL(`tel:${place.phone}`)} /> : null}
        {place.url ? <InfoRow icon="link-outline" text={place.kakaoPlaceId ? '카카오 장소 정보 보기' : place.url} onPress={() => Linking.openURL(place.url!)} /> : null}
        {place.kakaoCategory ? <InfoRow icon="pricetag-outline" text={place.kakaoCategory} /> : null}
      </Card>

      <SectionTitle title="길찾기" />
      <View style={styles.navRow}>
        {NAV_APPS.map((app) => (
          <Pressable key={app.id} style={styles.navBtn} onPress={() => openPlaceNavigation(place, app.id)}>
            <View style={[styles.navDot, { backgroundColor: app.color }]}>
              <Ionicons name="navigate" size={14} color="#fff" />
            </View>
            <Text style={styles.navText}>{app.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="우리의 별점" />
      <ReviewCard person={user} review={myReview} mine onRate={rate} onEdit={() => setSheet('review')} />
      {partner ? <ReviewCard person={partner} review={partnerReview} /> : null}

      <SectionTitle title="메모" action="수정" onAction={() => setSheet('memo')} />
      <Card>
        <Text style={place.memo ? styles.memo : styles.muted}>{place.memo ?? '함께 남길 메모를 적어 보세요.'}</Text>
      </Card>

      <SectionTitle title={`방문 기록 ${visits.length}`} action="+ 기록" onAction={() => setSheet('visit')} />
      {visits.length === 0 ? (
        <Card>
          <Text style={styles.muted}>다녀온 날을 기록해 두면 추억 타임라인이 돼요.</Text>
        </Card>
      ) : (
        visits.map((visit) => (
          <Pressable key={visit.id} style={styles.visitRow} onLongPress={() => deleteVisit(visit.id)}>
            <Ionicons name="footsteps" size={16} color={theme.colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.visitDate}>{formatDateKey(visit.visitedOn, true)}</Text>
              {visit.note ? <Text style={styles.visitNote}>{visit.note}</Text> : null}
            </View>
            <Pressable onPress={() => deleteVisit(visit.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.textSubtle} />
            </Pressable>
          </Pressable>
        ))
      )}

      <SectionTitle title={`사진 ${photos.length}`} />
      <View style={styles.actions}>
        <ActionButton
          icon="camera"
          label="촬영하기"
          tone="primary"
          onPress={() => router.push(`/capture?placeId=${placeId}` as Href)}
          style={styles.flex}
        />
        <ActionButton
          icon="images-outline"
          label={uploading ? `올리는 중 ${uploading}` : '갤러리에서'}
          onPress={addPhotosFromGallery}
          loading={uploading !== null}
          style={styles.flex}
        />
      </View>
      {photos.length > 0 ? (
        <View style={styles.photos}>
          <PhotoGrid photos={photos} width={innerWidth} onPress={(photo) => router.push(`/photo/${photo.id}` as Href)} />
        </View>
      ) : null}

      <VisitSheet
        visible={sheet === 'visit'}
        onClose={() => setSheet(null)}
        onSave={(visitedOn, note) =>
          run(async () => {
            const visit = await api.addVisit(placeId, { visitedOn, note });
            setData({ ...data, place: { ...place, status: 'visited' }, visits: [visit, ...visits] });
            setSheet(null);
          })
        }
        busy={busy}
      />
      <TextSheet
        visible={sheet === 'review'}
        title="내 한줄평"
        initial={myReview?.comment ?? ''}
        placeholder="맛, 분위기, 다음에 또 올지…"
        onClose={() => setSheet(null)}
        busy={busy}
        onSave={(comment) =>
          run(async () => {
            const review = await api.saveReview(placeId, myReview?.rating ?? 5, comment);
            setData({ ...data, reviews: [...reviews.filter((r) => r.userId !== review.userId), review] });
            setSheet(null);
          })
        }
      />
      <TextSheet
        visible={sheet === 'memo'}
        title="메모"
        initial={place.memo ?? ''}
        placeholder="추천 메뉴, 예약 정보, 꿀팁…"
        onClose={() => setSheet(null)}
        busy={busy}
        onSave={(memo) =>
          run(async () => {
            const updated = await api.updatePlace(placeId, { memo });
            setData({ ...data, place: updated });
            setSheet(null);
          })
        }
      />
      <PlanSheet
        visible={sheet === 'plan'}
        defaultTitle={place.name}
        defaultDate={place.eventStart && place.eventStart >= todayKey() ? place.eventStart : todayKey()}
        onClose={() => setSheet(null)}
        busy={busy}
        onSave={(date, title) =>
          run(async () => {
            await api.createPlan({ date, title, placeId });
            setSheet(null);
            Alert.alert('일정 추가', `${formatDateKey(date)} 일정에 담았어요`);
          })
        }
      />
      <EditSheet
        visible={sheet === 'edit'}
        detail={data}
        onClose={() => setSheet(null)}
        busy={busy}
        onDelete={confirmDelete}
        onSave={(patch) =>
          run(async () => {
            const updated = await api.updatePlace(placeId, patch);
            setData({ ...data, place: updated });
            setSheet(null);
          })
        }
      />
    </Screen>
  );
}

function InfoRow({ icon, text, onPress }: { icon: IconName; text: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.infoRow} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={16} color={theme.colors.primary} />
      <Text style={[styles.infoText, onPress && styles.infoLink]}>{text}</Text>
    </Pressable>
  );
}

function ReviewCard({
  person,
  review,
  mine,
  onRate,
  onEdit,
}: {
  person: CoupleUser | null;
  review?: PlaceReview;
  mine?: boolean;
  onRate?: (rating: number) => void;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.review}>
      <View style={styles.reviewHead}>
        <View style={[styles.avatar, mine ? styles.avatarMine : styles.avatarPartner]}>
          <Text style={styles.avatarText}>{(person?.displayName ?? '?').slice(0, 1)}</Text>
        </View>
        <Text style={styles.reviewName}>{person?.displayName ?? ''}</Text>
        <StarRating value={review?.rating ?? 0} onChange={mine ? onRate : undefined} size={mine ? 24 : 18} />
      </View>
      <Pressable onPress={onEdit} disabled={!mine}>
        <Text style={review?.comment ? styles.reviewComment : styles.muted}>
          {review?.comment ?? (mine ? '눌러서 한줄평 남기기' : '아직 평가 전이에요')}
        </Text>
      </Pressable>
    </View>
  );
}

function VisitSheet({ visible, onClose, onSave, busy }: { visible: boolean; onClose: () => void; onSave: (date: string, note?: string) => void; busy: boolean }) {
  const [date, setDate] = useState<string | null>(todayKey());
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!visible) return;
    setDate(todayKey());
    setNote('');
  }, [visible]);
  return (
    <AppModal visible={visible} onRequestClose={onClose}>
      <SheetHeader title="방문 기록" onClose={onClose} />
      <View style={styles.sheetBody}>
        <DateField label="다녀온 날" value={date} onChange={setDate} />
        <Field label="한 줄 기록" value={note} onChangeText={setNote} placeholder="오늘의 한 장면" />
        <ActionButton label="기록하기" icon="checkmark" tone="primary" loading={busy} onPress={() => date && onSave(date, note.trim() || undefined)} />
      </View>
    </AppModal>
  );
}

function TextSheet({
  visible,
  title,
  initial,
  placeholder,
  onClose,
  onSave,
  busy,
}: {
  visible: boolean;
  title: string;
  initial: string;
  placeholder: string;
  onClose: () => void;
  onSave: (text: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (visible) setText(initial);
  }, [visible, initial]);
  return (
    <AppModal visible={visible} onRequestClose={onClose}>
      <SheetHeader title={title} onClose={onClose} />
      <View style={styles.sheetBody}>
        <Field value={text} onChangeText={setText} placeholder={placeholder} multiline autoFocus />
        <ActionButton label="저장" icon="checkmark" tone="primary" loading={busy} onPress={() => onSave(text.trim())} />
      </View>
    </AppModal>
  );
}

function PlanSheet({
  visible,
  defaultTitle,
  defaultDate,
  onClose,
  onSave,
  busy,
}: {
  visible: boolean;
  defaultTitle: string;
  defaultDate: string;
  onClose: () => void;
  onSave: (date: string, title: string) => void;
  busy: boolean;
}) {
  const [date, setDate] = useState<string | null>(defaultDate);
  const [title, setTitle] = useState(defaultTitle);
  useEffect(() => {
    if (!visible) return;
    setDate(defaultDate);
    setTitle(defaultTitle);
  }, [visible, defaultDate, defaultTitle]);
  return (
    <AppModal visible={visible} onRequestClose={onClose}>
      <SheetHeader title="일정에 추가" onClose={onClose} />
      <View style={styles.sheetBody}>
        <DateField label="날짜" value={date} onChange={setDate} />
        <Field label="제목" value={title} onChangeText={setTitle} />
        <ActionButton label="추가" icon="add" tone="primary" loading={busy} onPress={() => date && title.trim() && onSave(date, title.trim())} />
      </View>
    </AppModal>
  );
}

function EditSheet({
  visible,
  detail,
  onClose,
  onSave,
  onDelete,
  busy,
}: {
  visible: boolean;
  detail: PlaceDetail;
  onClose: () => void;
  onSave: (patch: Parameters<typeof api.updatePlace>[1]) => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const p = detail.place;
  const [name, setName] = useState(p.name);
  const [category, setCategory] = useState<PlaceCategory>(p.category);
  const [address, setAddress] = useState(p.address ?? '');
  const [phone, setPhone] = useState(p.phone ?? '');
  const [url, setUrl] = useState(p.url ?? '');
  const [eventStart, setEventStart] = useState<string | null>(p.eventStart ?? null);
  const [eventEnd, setEventEnd] = useState<string | null>(p.eventEnd ?? null);

  useEffect(() => {
    if (!visible) return;
    setName(p.name);
    setCategory(p.category);
    setAddress(p.address ?? '');
    setPhone(p.phone ?? '');
    setUrl(p.url ?? '');
    setEventStart(p.eventStart ?? null);
    setEventEnd(p.eventEnd ?? null);
  }, [visible, p]);

  const save = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      category,
      ...(address.trim() !== (p.address ?? '') ? { address: address.trim() } : {}),
      phone: phone.trim(),
      url: url.trim(),
      eventStart: category === 'event' ? eventStart ?? '' : '',
      eventEnd: category === 'event' ? eventEnd ?? eventStart ?? '' : '',
    });
  };

  return (
    <AppModal visible={visible} onRequestClose={onClose} sheetStyle={styles.editSheet}>
      <SheetHeader title="장소 수정" onClose={onClose} />
      <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
        <Field label="이름" value={name} onChangeText={setName} />
        <Text style={styles.label}>분류</Text>
        <Segment<PlaceCategory>
          scroll
          options={PLACE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon as IconName, color: c.color }))}
          value={category}
          onChange={setCategory}
        />
        {category === 'event' ? (
          <View style={styles.actions}>
            <DateField label="시작일" value={eventStart} onChange={setEventStart} clearable />
            <DateField label="종료일" value={eventEnd} onChange={setEventEnd} clearable />
          </View>
        ) : null}
        <Field label="주소" value={address} onChangeText={setAddress} placeholder="바꾸면 지도 위치도 다시 찾아요" />
        <Field label="전화번호" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="링크" value={url} onChangeText={setUrl} autoCapitalize="none" />
        <ActionButton label="저장" icon="checkmark" tone="primary" loading={busy} onPress={save} />
        <ActionButton label="장소 삭제" icon="trash-outline" tone="danger" onPress={onDelete} />
      </ScrollView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cover: { width: '100%', height: 220, borderRadius: theme.radius.lg },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  titleBlock: { marginTop: theme.spacing.md, gap: 8 },
  name: { color: theme.colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  regionLink: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, marginTop: theme.spacing.md },
  infoCard: { marginTop: theme.spacing.md, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, color: theme.colors.text, fontSize: 14, lineHeight: 20 },
  infoLink: { color: theme.colors.primaryDark, textDecorationLine: 'underline' },
  navRow: { flexDirection: 'row', gap: 8 },
  navBtn: { ...cardSurface(), flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12 },
  navDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navText: { color: theme.colors.text, fontSize: 11, fontWeight: '700' },
  review: { ...cardSurface(), padding: 14, gap: 8, marginBottom: 8 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarMine: { backgroundColor: theme.colors.primary },
  avatarPartner: { backgroundColor: theme.colors.accent },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  reviewName: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  reviewComment: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
  memo: { color: theme.colors.text, fontSize: 14, lineHeight: 21 },
  muted: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  visitRow: { ...cardSurface(), flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 },
  visitDate: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  visitNote: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
  photos: { marginTop: theme.spacing.md },
  sheetBody: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md, gap: 12 },
  editSheet: { maxHeight: '90%' },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
});
