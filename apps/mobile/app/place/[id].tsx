import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { pickPhoto } from '@/lib/pick-photo';
import { AppScreen } from '@/components/AppScreen';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import type { Place, PlaceRecommendation } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [place, setPlace] = useState<Place | null>(null);
  const [recs, setRecs] = useState<PlaceRecommendation[]>([]);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setPlace(await api.getPlace(id));
        setRecs(await api.getRecommendations(id));
      })();
    }, [id])
  );

  const recordVisit = async () => {
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

  return (
    <AppScreen title={place.name} showBack>
      <Text style={styles.region}>{region?.name} · {place.category}</Text>
      <Text style={styles.desc}>{place.description}</Text>
      <Text style={styles.coords}>{place.lat.toFixed(4)}, {place.lng.toFixed(4)}</Text>
      <PremiumButton title={t('place.recordVisit')} onPress={recordVisit} />

      <Text style={styles.section}>{t('place.recommendations')}</Text>
      {recs.map((r) => (
        <View key={r.id} style={styles.rec}>
          <Text style={styles.stars}>{'★'.repeat(r.rating)}</Text>
          <Text style={styles.recText}>{r.text}</Text>
        </View>
      ))}
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
          <PremiumButton key={n} title={String(n)} onPress={() => setRating(n)} variant={rating === n ? 'primary' : 'outline'} />
        ))}
      </View>
      <PremiumButton title={t('place.submit')} onPress={submitRec} variant="outline" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  region: { color: theme.colors.primaryLight, fontWeight: '600' },
  desc: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  coords: { color: theme.colors.textMuted, fontSize: 12 },
  section: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginTop: theme.spacing.lg },
  rec: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.sm, marginTop: theme.spacing.sm },
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
  },
  ratingRow: { flexDirection: 'row', gap: 4 },
});
