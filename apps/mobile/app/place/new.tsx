import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getRegion,
  isPlaceCategory,
  PLACE_CATEGORIES,
  type KakaoPlaceResult,
  type PlaceCategory,
  type PlaceStatus,
} from '@tingting/shared';
import { Screen } from '@/components/Screen';
import { AppModal } from '@/components/AppModal';
import { SheetHeader } from '@/components/SheetHeader';
import { DateField } from '@/components/DateField';
import { RegionChips } from '@/components/RegionChips';
import { ActionButton, CategoryBadge, Chip, EmptyState, Field, Segment, SectionTitle, type IconName } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

type Mode = 'search' | 'manual';

const CATEGORY_OPTIONS = PLACE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon as IconName, color: c.color }));

export default function NewPlaceScreen() {
  const params = useLocalSearchParams<{ region?: string; category?: string }>();
  const router = useRouter();
  const initialRegion = params.region && getRegion(params.region) ? params.region : null;
  const initialCategory: PlaceCategory = isPlaceCategory(params.category) ? params.category : 'food';

  const [mode, setMode] = useState<Mode>('search');
  const [region, setRegion] = useState<string | null>(initialRegion);
  const [showRegions, setShowRegions] = useState(false);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<KakaoPlaceResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [picked, setPicked] = useState<KakaoPlaceResult | null>(null);

  const [category, setCategory] = useState<PlaceCategory>(initialCategory);
  const [status, setStatus] = useState<PlaceStatus>('wish');
  const [memo, setMemo] = useState('');
  const [eventStart, setEventStart] = useState<string | null>(null);
  const [eventEnd, setEventEnd] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [url, setUrl] = useState('');

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await api.searchKakao(q, region ?? undefined));
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setSearchError('카카오 검색이 아직 설정되지 않았어요. 직접 입력으로 추가해 주세요.');
      } else {
        setSearchError(e instanceof Error ? e.message : '검색에 실패했어요');
      }
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  const pick = (result: KakaoPlaceResult) => {
    if (result.savedPlaceId) {
      router.push(`/place/${result.savedPlaceId}` as Href);
      return;
    }
    setPicked(result);
    setCategory(result.category);
    setStatus('wish');
    setMemo('');
    setEventStart(null);
    setEventEnd(null);
  };

  const eventDates = () => {
    if (category !== 'event') return {};
    if (eventStart && eventEnd && eventEnd < eventStart) throw new Error('끝나는 날이 시작일보다 빨라요');
    return { eventStart: eventStart ?? undefined, eventEnd: eventEnd ?? eventStart ?? undefined };
  };

  const savePicked = async () => {
    if (!picked) return;
    setSaving(true);
    try {
      const place = await api.createPlace({
        name: picked.name,
        category,
        address: picked.address,
        lat: picked.lat,
        lng: picked.lng,
        phone: picked.phone,
        url: picked.url,
        kakaoPlaceId: picked.kakaoPlaceId,
        kakaoCategory: picked.kakaoCategory,
        regionCode: picked.regionCode,
        status,
        memo: memo.trim() || undefined,
        ...eventDates(),
      });
      setPicked(null);
      router.replace(`/place/${place.id}` as Href);
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '다시 시도해 주세요');
    } finally {
      setSaving(false);
    }
  };

  const saveManual = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '장소 이름을 입력해 주세요');
      return;
    }
    if (!region && !address.trim()) {
      Alert.alert('알림', '지역을 고르거나 주소를 입력해 주세요');
      return;
    }
    setSaving(true);
    try {
      const place = await api.createPlace({
        name: name.trim(),
        category,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        url: url.trim() || undefined,
        regionCode: region ?? undefined,
        status,
        memo: memo.trim() || undefined,
        ...eventDates(),
      });
      router.replace(`/place/${place.id}` as Href);
    } catch (e) {
      Alert.alert('저장 실패', e instanceof Error ? e.message : '다시 시도해 주세요');
    } finally {
      setSaving(false);
    }
  };

  const regionLabel = region ? getRegion(region)?.name ?? '전국' : '전국';

  const detailFields = (
    <>
      <Text style={styles.label}>분류</Text>
      <Segment<PlaceCategory> scroll options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      {category === 'event' ? (
        <View style={styles.dateRow}>
          <DateField label="시작일" value={eventStart} onChange={setEventStart} clearable />
          <DateField label="종료일" value={eventEnd} onChange={setEventEnd} clearable />
        </View>
      ) : null}
      <Text style={styles.label}>상태</Text>
      <View style={styles.chipRow}>
        <Chip label="가고 싶어요" active={status === 'wish'} onPress={() => setStatus('wish')} />
        <Chip label="다녀왔어요" active={status === 'visited'} onPress={() => setStatus('visited')} color={theme.colors.success} />
      </View>
      <Field label="메모" value={memo} onChangeText={setMemo} placeholder="추천 메뉴, 예약 정보, 꿀팁…" multiline />
    </>
  );

  return (
    <Screen title="장소 추가">
      <Segment<Mode>
        options={[
          { id: 'search', label: '카카오 검색', icon: 'search' },
          { id: 'manual', label: '직접 입력', icon: 'create-outline' },
        ]}
        value={mode}
        onChange={setMode}
      />

      <Pressable style={styles.regionToggle} onPress={() => setShowRegions((v) => !v)}>
        <Ionicons name="location" size={16} color={theme.colors.primary} />
        <Text style={styles.regionToggleText}>지역: {regionLabel}</Text>
        <Ionicons name={showRegions ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />
      </Pressable>
      {showRegions ? (
        <View style={styles.regionBox}>
          <RegionChips
            value={region}
            allowAll={mode === 'search'}
            onChange={(code) => {
              setRegion(code);
              setShowRegions(false);
            }}
          />
        </View>
      ) : null}

      {mode === 'search' ? (
        <>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`${regionLabel} 맛집, 카페, 축제, 호텔…`}
              placeholderTextColor={theme.colors.textSubtle}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
            <Pressable style={styles.searchBtn} onPress={runSearch} disabled={searching}>
              {searching ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={20} color="#fff" />}
            </Pressable>
          </View>

          {searchError ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{searchError}</Text>
              <ActionButton label="직접 입력하기" icon="create-outline" onPress={() => setMode('manual')} />
            </View>
          ) : null}

          {results && results.length === 0 ? (
            <EmptyState icon="search-outline" title="검색 결과가 없어요" message="다른 이름으로 찾거나 직접 입력해 주세요." />
          ) : null}

          {results?.map((r) => (
            <Pressable key={r.kakaoPlaceId} style={({ pressed }) => [styles.result, pressed && styles.pressed]} onPress={() => pick(r)}>
              <View style={styles.resultBody}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {r.name}
                </Text>
                <View style={styles.resultMeta}>
                  <CategoryBadge category={r.category} small />
                  <Text style={styles.resultKakao} numberOfLines={1}>
                    {getRegion(r.regionCode)?.name} · {r.kakaoCategory}
                  </Text>
                </View>
                <Text style={styles.resultAddr} numberOfLines={1}>
                  {r.address}
                </Text>
              </View>
              {r.savedPlaceId ? (
                <View style={styles.savedTag}>
                  <Text style={styles.savedText}>담음</Text>
                </View>
              ) : (
                <Ionicons name="add-circle" size={26} color={theme.colors.primary} />
              )}
            </Pressable>
          ))}
        </>
      ) : (
        <View style={styles.form}>
          <Field label="이름 *" value={name} onChangeText={setName} placeholder="예: 광안리 불꽃축제" />
          <Field label="주소" value={address} onChangeText={setAddress} placeholder="주소를 넣으면 지도 위치를 자동으로 찾아요" />
          {detailFields}
          <Field label="전화번호" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="링크" value={url} onChangeText={setUrl} autoCapitalize="none" placeholder="https://" />
          <ActionButton label="저장" icon="checkmark" tone="primary" onPress={saveManual} loading={saving} />
        </View>
      )}

      <AppModal visible={picked !== null} onRequestClose={() => setPicked(null)} sheetStyle={styles.sheet}>
        <SheetHeader title="장소 담기" onClose={() => setPicked(null)} />
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
          {picked ? (
            <View style={styles.pickedCard}>
              <Text style={styles.resultName}>{picked.name}</Text>
              <Text style={styles.resultAddr}>{picked.address}</Text>
              <Text style={styles.resultKakao}>
                {getRegion(picked.regionCode)?.name} · {picked.kakaoCategory}
              </Text>
            </View>
          ) : null}
          <SectionTitle title="정보" />
          <View style={styles.form}>{detailFields}</View>
          <ActionButton label="담기" icon="heart" tone="primary" onPress={savePicked} loading={saving} style={styles.saveBtn} />
        </ScrollView>
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  regionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.light,
  },
  regionToggleText: { color: theme.colors.primaryDark, fontSize: 14, fontWeight: '800' },
  regionBox: { ...cardSurface(), padding: 12, marginTop: 8 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
  searchInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
  },
  searchBtn: {
    width: 50,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  notice: { ...cardSurface(), padding: 14, gap: 10, marginBottom: theme.spacing.md },
  noticeText: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  result: { ...cardSurface(), flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 },
  pressed: { opacity: 0.85 },
  resultBody: { flex: 1, gap: 4 },
  resultName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultKakao: { flexShrink: 1, color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  resultAddr: { color: theme.colors.textSubtle, fontSize: 12 },
  savedTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.full, backgroundColor: theme.colors.successSoft },
  savedText: { color: theme.colors.success, fontSize: 11, fontWeight: '800' },
  form: { gap: 12, marginTop: theme.spacing.md },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 6 },
  dateRow: { flexDirection: 'row', gap: 10 },
  sheet: { maxHeight: '88%' },
  sheetBody: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  pickedCard: { padding: 14, gap: 4, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  saveBtn: { marginTop: theme.spacing.lg },
});
