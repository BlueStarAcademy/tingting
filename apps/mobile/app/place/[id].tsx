import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import type { Place, PlaceRecommendation } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const visit = await api.createVisit({ placeId: id, photoUri: result.assets[0].uri });
    router.push('/editor/' + visit.id);
  };

  const submitRec = async () => {
    if (!text.trim()) return;
    await api.addRecommendation(id, text.trim(), rating);
    setText('');
    setRecs(await api.getRecommendations(id));
    Alert.alert('Thanks!', 'Recommendation submitted');
  };

  if (!place) return null;
  const region = getRegion(place.regionCode);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={place.name} showBack />
        <Text style={styles.region}>{region?.name} · {place.category}</Text>
        <Text style={styles.desc}>{place.description}</Text>
        <Text style={styles.coords}>{place.lat.toFixed(4)}, {place.lng.toFixed(4)}</Text>
        <PremiumButton title="Record Visit" onPress={recordVisit} />

        <Text style={styles.section}>UGC Recommendations</Text>
        {recs.map((r) => (
          <View key={r.id} style={styles.rec}>
            <Text style={styles.stars}>{'★'.repeat(r.rating)}</Text>
            <Text style={styles.recText}>{r.text}</Text>
          </View>
        ))}
        <TextInput style={styles.input} placeholder="Share your tip..." placeholderTextColor={theme.colors.textMuted} value={text} onChangeText={setText} multiline />
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <PremiumButton key={n} title={String(n)} onPress={() => setRating(n)} variant={rating === n ? 'primary' : 'outline'} />
          ))}
        </View>
        <PremiumButton title="Submit Recommendation" onPress={submitRec} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  region: { color: theme.colors.primaryLight, fontWeight: '600' },
  desc: { color: theme.colors.text, fontSize: 15, lineHeight: 22 },
  coords: { color: theme.colors.textMuted, fontSize: 12 },
  section: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginTop: theme.spacing.lg },
  rec: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.radius.sm, marginTop: theme.spacing.sm },
  stars: { color: theme.colors.star },
  recText: { color: theme.colors.text, marginTop: 4 },
  input: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.colors.surfaceLight },
  ratingRow: { flexDirection: 'row', gap: 4 },
});
