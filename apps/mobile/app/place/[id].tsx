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
import type { Place, PlaceRecommendation, Visit } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { VISIT_AD_BONUS_STARS, REVIEW_AD_BONUS_STARS } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { useAdFree } from '@/hooks/useAdFree';
import { getPlaceImageUrl } from '@/lib/place-images';
import { openPlaceNavigation, type PlaceNavigationProvider } from '@/lib/place-navigation';
import { distanceMeters, getCurrentCoords } from '@/lib/location';
import { theme } from '@/constants/theme';

type PlaceTab = 'transport' | 'reviews' | 'verify';

const VERIFY_RADIUS_M = 500;

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const { refresh } = useAuth();
  const { watchAd } = useAdFree();
  const [place, setPlace] = useState<Place | null>(null);
  const [recs, setRecs] = useState<PlaceRecommendation[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<PlaceTab>('transport');
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setImageLoadFailed(false);
        setPlace(await api.getPlace(id));
        setRecs(await api.getRecommendations(id));
        setVisits(await api.getVisits());
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
      setGpsAccuracy(coords.accuracy ? Math.round(coords.accuracy) : null);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
    } finally {
      setCheckingLocation(false);
    }
  };

  const offerVisitAdBonus = () => {
    Alert.alert(t('place.visitBonusTitle'), t('ads.watchForBonus', { amount: VISIT_AD_BONUS_STARS }), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('ads.watch'),
        onPress: async () => {
          const watched = await watchAd('visit_bonus');
          if (!watched) return;
          try {
            const result = await api.grantVisitAdBonus();
            await refresh();
            Alert.alert(t('common.alert'), t('place.visitBonusClaimed', { amount: result.bonus }));
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
          }
        },
      },
    ]);
  };

  const offerReviewAdBonus = () => {
    Alert.alert(t('place.reviewBonusTitle'), t('ads.watchForBonus', { amount: REVIEW_AD_BONUS_STARS }), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('ads.watch'),
        onPress: async () => {
          const watched = await watchAd('review_bonus');
          if (!watched) return;
          try {
            const result = await api.grantReviewAdBonus();
            await refresh();
            Alert.alert(t('common.alert'), t('place.reviewBonusClaimed', { amount: result.bonus }));
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('auth.unknownError'));
          }
        },
      },
    ]);
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
    offerVisitAdBonus();
    router.push(`/editor/${visit.id}` as Href);
  };

  const submitRec = async () => {
    if (!text.trim()) return;
    if (!canSubmitReview) {
      Alert.alert(t('common.alert'), t('place.reviewGpsRequired'));
      return;
    }
    await api.addRecommendation(id, text.trim(), 5);
    setText('');
    setRecs(await api.getRecommendations(id));
    Alert.alert(t('common.thanks'), t('place.submitted'));
    offerReviewAdBonus();
  };

  if (!place) return null;
  const region = getRegion(place.regionCode);
  const imageUri = getPlaceImageUrl(place);
  const verified = distance !== null && distance <= VERIFY_RADIUS_M;
  const hasVerifiedVisit = visits.some((visit) => visit.placeId === place.id);
  const canSubmitReview = verified || hasVerifiedVisit;
  const navButtons: { provider: PlaceNavigationProvider; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { provider: 'naver', label: t('place.openNaverMap'), icon: 'map-outline' },
    { provider: 'kakaoMap', label: t('place.openKakaoMap'), icon: 'navigate-outline' },
    { provider: 'kakaoNavi', label: t('place.openKakaoNavi'), icon: 'car-outline' },
    { provider: 'tmap', label: t('place.openTmap'), icon: 'trail-sign-outline' },
  ];

  return (
    <AppScreen title={place.name} showBack>
      {imageUri && !imageLoadFailed ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.hero}
          resizeMode="cover"
          onError={() => setImageLoadFailed(true)}
        />
      ) : (
        <View style={[styles.hero, styles.heroFallback]}>
          <Ionicons name="image-outline" size={34} color={theme.colors.primary} />
          <Text style={styles.heroFallbackText}>{place.name}</Text>
        </View>
      )}
      <Text style={styles.region}>
        {region?.name} · {place.category}
      </Text>
      <Text style={styles.desc}>{place.description}</Text>

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
          {navButtons.map((button) => (
            <Pressable
              key={button.provider}
              style={styles.transportCard}
              onPress={() => openPlaceNavigation(place, button.provider)}
            >
              <View style={styles.transportIcon}>
                <Ionicons name={button.icon} size={22} color={theme.colors.primary} />
              </View>
              <View style={styles.transportBody}>
                <Text style={styles.transportTitle}>{button.label}</Text>
                <Text style={styles.transportDetail}>{t('place.openDirectionsDetail')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {tab === 'reviews' ? (
        <View style={styles.section}>
          <View style={styles.reviewPanel}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {recs.length === 0 ? (
                <Text style={styles.empty}>{t('place.noReviews')}</Text>
              ) : (
                recs.map((r) => (
                  <View key={r.id} style={styles.rec}>
                    <View style={styles.recHeader}>
                      <Ionicons name="person-circle-outline" size={24} color={theme.colors.primaryLight} />
                      <Text style={styles.recMeta}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.recText}>{r.text}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
          <View style={styles.reviewInputRow}>
            <TextInput
              style={styles.input}
              placeholder={t('place.shareTip')}
              placeholderTextColor={theme.colors.textMuted}
              value={text}
              onChangeText={setText}
              returnKeyType="send"
              onSubmitEditing={submitRec}
            />
            <PremiumButton
              title={t('place.submit')}
              onPress={submitRec}
              variant="outline"
              fullWidth={false}
              style={styles.submitButton}
            />
          </View>
        </View>
      ) : null}

      {tab === 'verify' ? (
        <View style={styles.section}>
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
          {gpsAccuracy !== null ? (
            <Text style={styles.accuracyText}>{t('place.gpsAccuracy', { meters: gpsAccuracy })}</Text>
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
  heroFallback: {
    backgroundColor: theme.colors.tint.soft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroFallbackText: { color: theme.colors.primaryDark, fontSize: 16, fontWeight: '800' },
  region: { color: theme.colors.primaryLight, fontWeight: '600' },
  desc: { color: theme.colors.text, fontSize: 15, lineHeight: 22, marginTop: theme.spacing.xs, marginBottom: theme.spacing.md },
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
    alignItems: 'center',
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
  reviewPanel: {
    height: 220,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
  },
  rec: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.sm,
    gap: 8,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  recMeta: { color: theme.colors.textMuted, fontSize: 12 },
  recText: { color: theme.colors.text, lineHeight: 20 },
  reviewInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  submitButton: { width: 96 },
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
  accuracyText: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center' },
});
