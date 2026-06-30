import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import type { Visit, Place } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function VisitsScreen() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);

  const load = async () => {
    setVisits(await api.getVisits());
    setPlaces(await api.getPlaces());
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const recordVisit = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const place = places[0];
    if (!place) return Alert.alert('No places', 'Seed data missing');
    const visit = await api.createVisit({ placeId: place.id, photoUri: result.assets[0].uri });
    router.push('/editor/' + visit.id);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>My Visits</Text>
        <PremiumButton title="Record New Visit" onPress={recordVisit} />
        {visits.map((v) => {
          const place = places.find((p) => p.id === v.placeId);
          return (
            <Pressable key={v.id} style={styles.card} onPress={() => router.push('/editor/' + v.id)}>
              <Image source={{ uri: v.editedPhotoUri ?? v.photoUri }} style={styles.img} />
              <View style={styles.info}>
                <Text style={styles.name}>{place?.name ?? v.placeId}</Text>
                <Text style={styles.date}>{new Date(v.visitedAt).toLocaleDateString()}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '800', marginBottom: theme.spacing.sm },
  card: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, overflow: 'hidden' },
  img: { width: 90, height: 90 },
  info: { flex: 1, padding: theme.spacing.md, justifyContent: 'center' },
  name: { color: theme.colors.text, fontWeight: '600', fontSize: 16 },
  date: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
});
