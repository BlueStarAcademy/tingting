import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { pickPhoto } from '@/lib/pick-photo';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import type { Place, PlaceRecommendation } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { getPlaceImageUrl } from '@/lib/place-images';
import { getPlaceTransport, type TransportLine } from '@/lib/place-transport';
import { distanceMeters, getCurrentCoords } from '@/lib/location';
import { theme } from '@/constants/theme';

type PlaceTab = 'transport' | 'reviews' | 'verify';

const VERIFY_RADIUS_M = 500;

const TRANSPORT_ICONS: Record<TransportLine['icon'], keyof typeof Ionicons.glyphMap> = {
  train: 'train-outline',
  bus: 'bus-outline',
  subway: 'git-network-outline',
  car: 'car-outline',
  plane: 'airplane-outline',
};

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [place, setPlace] = useState<Place | null>(null);
  const [recs, setRecs] = useState<PlaceRecommendation[]>([]);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [tab, setTab] = useState<PlaceTab>('transport');
  const [distance, setDistance] = useState<number | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setPlace(await api.getPlace(id));
        setRecs(await api.getRecommendations(id));
      })();
    }, [id]),
  );

  const tabs: { id: PlaceTab; label: string }[] = [
    { id: 'transport', label: t('place.tabTransport') },
    { id: 'reviews', label: t('place.tabReviews') },
    { id: 'verify', label: t('place.tabVerify') },
  ];

  const checkLocation = async () => {
    if (!place) return;
    setCheckingLocation(true);
    try {
      const coords = await getCurrentCoords();
      const meters = Math.round(distanceMeters(coords.lat, coords.lng, place.lat, place.lng));
      setDistance(meters);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setCheckingLocation(false);
    }
  };

  const recordVisit = async () => {
    if (!place) return;
    if (distance === null || distance > VERIFY_RADIUS_M) {
      Alert.alert(t('place.verifyRequired'), t('place.verifyRequiredMessage'));
      return;
    }
    const photoUri = await pickPhoto({
      upload: t('visits.upload'),
      fromLibrary: t('visits.fromLibrary'),
      fromCamera: t('visits.fromCamera'),
      cancel: t('header.cancel'),
      libraryPermissionTitle: t('visits.permissionTitle'),
      libraryPermissionMessage: t('visits.permissionMessage'),
      cameraPermissionTitle: t('visits.cameraPermissionTitle'),
      cameraPermissionMessage: t('visits.cameraPermissionMessage'),
    });
    if (!photoUri) return;
    const visit = await api.createVisit({ placeId: id, photoUri });
    router.push(`/editor/${visit.id}` as Href);
  };

  const submitRec = async () => {
    if (!text.trim()) return;
    await api.addRecommendation(id, text.trim(), rating);
    setText('');
    setRecs(await api.getRecommendations(id));
    Alert.alert(t('common.thanks'), t('place.submitted'));
  };

  if (!place) return null;
  const region = getRegion(place.regionCode);
  const imageUri = getPlaceImageUrl(place);
  const transportLines = getPlaceTransport(place);
  const verified = distance !== null && distance <= VERIFY_RADIUS_M;

  return (
    <AppScreen title={place.name} showBack>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.hero} resizeMode="cover" />
      ) : null}
      <Text style={styles.region}>
        {region?.name} · {place.category}
      </Text>
      <Text style={styles.desc}>{place.description}</Text>
      <Text style={styles.coords}>
        {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
      </Text>

      <View style={styles.tabRow}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.tab, tab === item.id && styles.tabActive]}
            onPress={() => setTab(item.id)}
          >
            <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'transport' ? (
        <View style={styles.section}>
          {transportLines.map((line, i) => (
            <View key={`${line.icon}-${i}`} style={styles.transportCard}>
              <View style={styles.transportIcon}>
                <Ionicons name={TRANSPORT_ICONS[line.icon]} size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.transportBody}>
                <Text style={styles.transportTitle}>{line.title}</Text>
                <Text style={styles.transportDetail}>{line.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {tab === 'reviews' ? (
        <ScrollView style={styles.section} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t('place.recommendations')}</Text>
          {recs.length === 0 ? (
            <Text style={styles.empty}>{t('place.noReviews')}</Text>
          ) : (
            recs.map((r) => (
              <View key={r.id} style={styles.rec}>
                <Text style={styles.stars}>{'★'.repeat(r.rating)}</Text>
                <Text style={styles.recText}>{r.text}</Text>
              </View>
            ))
          )}
          <TextInput
            style={styles.input}
            placeholder={t('place.shareTip')}
            placeholderTextColor={theme.colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <PremiumButton
                key={n}
                title={String(n)}
                onPress={() => setRating(n)}
                variant={rating === n ? 'primary' : 'outline'}
              />
            ))}
          </View>
          <PremiumButton title={t('place.submit')} onPress={submitRec} variant="outline" />
        </ScrollView>
      ) : null}

      {tab === 'verify' ? (
        <View style={styles.section}>
          <Text style={styles.verifyIntro}>{t('place.verifyIntro')}</Text>
          <View style={styles.verifyCard}>
            <Ionicons name="location-outline" size={28} color={theme.colors.primary} />
            <Text style={styles.verifyRadius}>
              {t('place.verifyRadius', { meters: VERIFY_RADIUS_M })}
            </Text>
          </View>

          {distance !== null ? (
            <View style={[styles.distanceBadge, verified && styles.distanceBadgeOk]}>
              <Ionicons
                name={verified ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={verified ? theme.colors.success : theme.colors.star}
              />
              <Text style={styles.distanceText}>
                {verified
                  ? t('place.verifySuccess', { meters: distance })
                  : t('place.verifyTooFar', { meters: distance })}
              </Text>
            </View>
          ) : null}

          <PremiumButton
            title={t('place.checkLocation')}
            onPress={checkLocation}
            variant="outline"
            loading={checkingLocation}
          />
          <PremiumButton title={t('place.recordVisit')} onPress={recordVisit} />
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 180,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.sm,
  },
  region: { color: theme.colors.primaryLight, fontWeight: '600' },
  desc: { color: theme.colors.text, fontSize: 15, lineHeight: 22, marginTop: theme.spacing.xs },
  coords: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: theme.spacing.md },
  tabRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.tint.soft,
    borderColor: theme.colors.primaryLight,
  },
  tabText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: theme.colors.primaryDark, fontWeight: '800' },
  section: { gap: theme.spacing.sm },
  sectionTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  transportCard: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  transportIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.tint.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportBody: { flex: 1, gap: 4 },
  transportTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  transportDetail: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.md },
  rec: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.sm,
  },
  stars: { color: theme.colors.star },
  recText: { color: theme.colors.text, marginTop: 4 },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
    marginTop: theme.spacing.sm,
  },
  ratingRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  verifyIntro: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  verifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  verifyRadius: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  distanceBadgeOk: { backgroundColor: 'rgba(52,211,153,0.15)' },
  distanceText: { flex: 1, color: theme.colors.text, fontSize: 14, fontWeight: '600' },
});
