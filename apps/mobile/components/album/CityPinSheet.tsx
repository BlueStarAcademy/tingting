import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CITY_PIN_CATEGORIES,
  CITY_PIN_MEMO_MAX,
  CITY_PIN_NAME_MAX,
  getCity,
  type CityPin,
  type CityPinCategory,
  type CityPinInput,
  type GeoPlace,
  type GeoSource,
} from '@tingting/shared';
import { AppModal } from '@/components/AppModal';
import { PremiumButton } from '@/components/PremiumButton';
import { SheetHeader } from '@/components/SheetHeader';
import { Chip, Field } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

export type PinDraft = { lat: number; lng: number };

type Props = {
  visible: boolean;
  folderId: string;
  cityCode: string;
  /** Edit this pin */
  pin?: CityPin | null;
  /** New pin at a long-pressed spot */
  draft?: PinDraft | null;
  onClose: () => void;
  onSaved: (pin: CityPin) => void;
};

type FormState = Omit<CityPinInput, 'memo' | 'address' | 'kakaoPlaceId'> & { memo: string; address?: string; kakaoPlaceId?: string };

/** Add a place pin by search or from a long-pressed spot, or edit one. */
export function CityPinSheet({ visible, folderId, cityCode, pin, draft, onClose, onSaved }: Props) {
  const { t } = useLocale();
  const city = getCity(cityCode);
  const [form, setForm] = useState<FormState | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [source, setSource] = useState<GeoSource>('osm');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const searchSeq = useRef(0);
  const typed = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setBusy(false);
    setQuery('');
    setResults(null);
    setSearching(false);
    typed.current = false;
    if (pin) {
      setForm({
        name: pin.name,
        memo: pin.memo ?? '',
        category: pin.category,
        lat: pin.lat,
        lng: pin.lng,
        address: pin.address,
        kakaoPlaceId: pin.kakaoPlaceId,
      });
      return;
    }
    if (draft) {
      setForm({ name: '', memo: '', category: 'etc', lat: draft.lat, lng: draft.lng });
      setLocating(true);
      let alive = true;
      api
        .reverseGeo(draft.lat, draft.lng)
        .then((r) => {
          if (!alive) return;
          setForm((prev) =>
            prev
              ? { ...prev, name: typed.current ? prev.name : (r.name ?? '').slice(0, CITY_PIN_NAME_MAX), address: r.address ?? prev.address }
              : prev,
          );
        })
        .catch(() => undefined)
        .finally(() => alive && setLocating(false));
      return () => {
        alive = false;
      };
    }
    setForm(null);
  }, [visible, pin, draft]);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    const seq = ++searchSeq.current;
    setSearching(true);
    setError(null);
    try {
      const res = await api.searchGeo(q, { cityCode, regionCode: city?.regionCode });
      if (seq === searchSeq.current) {
        setResults(res.items);
        setSource(res.source);
      }
    } catch (e) {
      if (seq === searchSeq.current) setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  };

  const choose = (place: GeoPlace) => {
    setForm({
      name: place.name.slice(0, CITY_PIN_NAME_MAX),
      memo: '',
      category: place.category,
      lat: place.lat,
      lng: place.lng,
      address: place.address,
      kakaoPlaceId: place.kakaoPlaceId,
    });
  };

  const save = async () => {
    if (!form || !form.name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const input: CityPinInput = {
      name: form.name.trim(),
      memo: form.memo.trim() || null,
      category: form.category,
      lat: form.lat,
      lng: form.lng,
      address: form.address ?? null,
      kakaoPlaceId: form.kakaoPlaceId ?? null,
    };
    try {
      const saved = pin ? await api.updateCityPin(folderId, pin.id, input) : await api.addCityPin(folderId, input);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const title = pin ? t('city.pin.editTitle') : form ? t('city.pin.newTitle') : t('city.pin.searchTitle');

  return (
    <AppModal visible={visible} onRequestClose={onClose} sheetStyle={styles.sheet}>
      <SheetHeader title={title} onClose={onClose} />
      {form ? (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.where}>
            <Ionicons name="location" size={16} color={theme.colors.primary} />
            <Text style={styles.whereText} numberOfLines={2}>
              {form.address ?? (locating ? t('city.pin.locating') : `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}`)}
            </Text>
            {locating ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
          </View>
          <Field
            label={t('city.pin.name')}
            value={form.name}
            onChangeText={(name) => {
              typed.current = true;
              setForm({ ...form, name });
            }}
            placeholder={t('city.pin.namePlaceholder')}
            maxLength={CITY_PIN_NAME_MAX}
            autoFocus={!pin && !draft}
          />
          <Text style={styles.label}>{t('city.pin.category')}</Text>
          <View style={styles.chips}>
            {CITY_PIN_CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={`${c.emoji} ${c.label}`}
                active={form.category === c.id}
                color={c.color}
                onPress={() => setForm({ ...form, category: c.id as CityPinCategory })}
              />
            ))}
          </View>
          <View>
            <Field
              label={t('city.pin.memo')}
              value={form.memo}
              onChangeText={(memo) => setForm({ ...form, memo })}
              placeholder={t('city.pin.memoPlaceholder')}
              maxLength={CITY_PIN_MEMO_MAX}
            />
            <Text style={styles.counter}>
              {form.memo.length}/{CITY_PIN_MEMO_MAX}
            </Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttons}>
            {!pin && !draft ? (
              <PremiumButton title={t('city.pin.backToSearch')} variant="outline" onPress={() => setForm(null)} style={styles.button} fullWidth={false} />
            ) : (
              <PremiumButton title={t('common.cancel')} variant="outline" onPress={onClose} style={styles.button} fullWidth={false} />
            )}
            <PremiumButton
              title={pin ? t('city.pin.save') : t('city.pin.add')}
              onPress={save}
              loading={busy}
              disabled={!form.name.trim()}
              style={styles.button}
              fullWidth={false}
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={17} color={theme.colors.textSubtle} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('city.pin.searchPlaceholder', { city: city?.short ?? '' })}
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.searchInput}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={search}
              />
            </View>
            <Pressable onPress={search} style={styles.searchBtn} disabled={!query.trim() || searching}>
              {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>{t('city.pin.search')}</Text>}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled">
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {results === null ? <Text style={styles.searchHint}>{t('city.pin.searchHint')}</Text> : null}
            {results && results.length === 0 ? <Text style={styles.searchHint}>{t('city.pin.noResults')}</Text> : null}
            {(results ?? []).map((place) => {
              const cat = CITY_PIN_CATEGORIES.find((c) => c.id === place.category) ?? CITY_PIN_CATEGORIES[4];
              return (
                <Pressable key={place.id} onPress={() => choose(place)} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
                  <Text style={styles.resultEmoji}>{cat.emoji}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {place.name}
                    </Text>
                    <Text style={styles.resultSub} numberOfLines={1}>
                      {[place.categoryLabel, place.address].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                </Pressable>
              );
            })}
            {results && results.length > 0 ? (
              <Text style={styles.source}>{t(source === 'kakao' ? 'city.pin.sourceKakao' : 'city.pin.sourceOsm')}</Text>
            ) : null}
          </ScrollView>
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { maxHeight: '88%' },
  body: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: 12 },
  where: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.tint.soft,
  },
  whereText: { flex: 1, color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: -4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  counter: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 4 },
  error: { color: theme.colors.error, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: { flex: 1 },
  searchWrap: { flexShrink: 1, paddingHorizontal: theme.spacing.lg },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 15, paddingVertical: 11 },
  searchBtn: {
    paddingHorizontal: 16,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  results: { paddingVertical: theme.spacing.md, gap: 2 },
  searchHint: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', paddingVertical: theme.spacing.md },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 12 },
  pressed: { backgroundColor: theme.colors.tint.soft },
  resultEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  resultName: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  resultSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 1 },
  source: { color: theme.colors.textSubtle, fontSize: 10.5, textAlign: 'right', marginTop: 8 },
});
