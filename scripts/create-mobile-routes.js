const fs = require('fs');
const path = require('path');
const mobile = path.resolve(__dirname, '../apps/mobile');
const root = path.resolve(__dirname, '..');

function write(rel, content, base = mobile) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Wrote', rel);
}

write('app/group/create.tsx', `import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PremiumButton } from '@/components/PremiumButton';
import { ADDITIONAL_GROUP_COST } from '@tingting/shared';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

export default function CreateGroupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Enter group name');
    setLoading(true);
    try {
      const groups = await api.getGroups();
      const owned = groups.length;
      const cost = owned >= 1 ? ADDITIONAL_GROUP_COST : 0;
      if (cost > 0) {
        Alert.alert('Star Cost', 'Creating another group costs ' + cost + ' stars. Continue?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => doCreate() },
        ]);
        setLoading(false);
        return;
      }
      await doCreate();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
      setLoading(false);
    }
  };

  const doCreate = async () => {
    setLoading(true);
    try {
      const { group, cost } = await api.createGroup(name.trim(), description.trim() || undefined);
      Alert.alert('Created', cost > 0 ? 'Group created (-' + cost + ' stars)' : 'First group is free!');
      router.replace('/group/' + group.id);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScreenHeader title="New Group" showBack />
        <Text style={styles.hint}>First group is free. Additional groups cost {ADDITIONAL_GROUP_COST} stars.</Text>
        <TextInput style={styles.input} placeholder="Group name" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={[styles.input, styles.multiline]} placeholder="Description (optional)" placeholderTextColor={theme.colors.textMuted} value={description} onChangeText={setDescription} multiline />
        <PremiumButton title="Create Group" onPress={submit} loading={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg },
  hint: { color: theme.colors.textMuted, marginBottom: theme.spacing.md, fontSize: 14 },
  input: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.surfaceLight },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
`);

write('app/group/[id].tsx', `import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/lib/api';
import type { Group, Visit } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setGroup(await api.getGroup(id));
        const all = await api.getVisits();
        setVisits(all.filter((v) => v.groupId === id));
      })();
    }, [id])
  );

  if (!group) return <SafeAreaView style={styles.safe}><Text style={styles.text}>Loading...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={group.name} showBack />
        {group.description ? <Text style={styles.desc}>{group.description}</Text> : null}
        <Text style={styles.meta}>{group.memberIds.length} members</Text>
        <Text style={styles.section}>Group Visits ({visits.length})</Text>
        {visits.length === 0 ? (
          <Text style={styles.empty}>No group visits yet</Text>
        ) : (
          visits.map((v) => <Text key={v.id} style={styles.visit}>{new Date(v.visitedAt).toLocaleDateString()}</Text>)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg },
  text: { color: theme.colors.text },
  desc: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  meta: { color: theme.colors.primaryLight, marginBottom: theme.spacing.lg },
  section: { color: theme.colors.text, fontSize: 18, fontWeight: '700', marginBottom: theme.spacing.sm },
  empty: { color: theme.colors.textMuted },
  visit: { color: theme.colors.text, paddingVertical: 4 },
});
`);

write('app/place/[id].tsx', `import { useCallback, useState } from 'react';
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
`);

write('app/region/[code].tsx', `import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { getRegion } from '@tingting/shared';
import { PlaceCard } from '@/components/PlaceCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { api } from '@/lib/api';
import type { Place } from '@tingting/shared';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function RegionScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const region = getRegion(code);

  useFocusEffect(
    useCallback(() => {
      api.getPlaces(code).then(setPlaces);
    }, [code])
  );

  const visited = profile?.visitedRegions.includes(code);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title={region?.name ?? code} showBack />
        <Text style={styles.sub}>{region?.nameEn}</Text>
        <View style={[styles.badge, visited && styles.badgeVisited]}>
          <Text style={styles.badgeText}>{visited ? 'Visited' : 'Not visited yet'}</Text>
        </View>
        <Text style={styles.count}>{places.length} places</Text>
        {places.map((p) => (
          <PlaceCard key={p.id} place={p} onPress={() => router.push('/place/' + p.id)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  badge: { alignSelf: 'flex-start', backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.full, marginBottom: theme.spacing.md },
  badgeVisited: { backgroundColor: 'rgba(52,211,153,0.2)' },
  badgeText: { color: theme.colors.text, fontWeight: '600' },
  count: { color: theme.colors.primaryLight, marginBottom: theme.spacing.md },
});
`);

write('app/editor/[visitId].tsx', `import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, Switch } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import type { Visit } from '@tingting/shared';
import { AI_EFFECTS } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function EditorScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.getVisit(visitId).then((v) => {
        setVisit(v);
        setPreviewUri(v?.editedPhotoUri ?? v?.photoUri ?? null);
      });
    }, [visitId])
  );

  const applyBrightness = async (label: string, featureKey: string) => {
    if (!visit) return;
    setLoading(true);
    try {
      await api.useAiFeature(featureKey);
      const result = await ImageManipulator.manipulateAsync(
        visit.photoUri,
        [{ resize: { width: 800 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      const bright = await ImageManipulator.manipulateAsync(result.uri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      setPreviewUri(bright.uri);
      setActiveFilter(label);
      Alert.alert(label, 'AI effect applied (client-side brightness boost)');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const applySkyTint = async () => {
    if (!visit) return;
    setLoading(true);
    try {
      await api.useAiFeature('sky');
      const result = await ImageManipulator.manipulateAsync(visit.photoUri, [{ resize: { width: 800 } }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      setPreviewUri(result.uri);
      setActiveFilter(AI_EFFECTS.sky.label);
      Alert.alert('하늘리터치', 'Sky tint effect applied (client-side stub)');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!visit || !previewUri) return;
    await api.updateVisit(visit.id, { editedPhotoUri: previewUri, filter: activeFilter ?? undefined });
    Alert.alert('Saved', 'Photo updated');
    router.back();
  };

  if (!visit || !previewUri) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="Photo Editor" showBack />
        <Image source={{ uri: previewUri }} style={styles.preview} />
        {watermark ? <Text style={styles.watermark}>TingTing</Text> : null}
        <View style={styles.row}>
          <Text style={styles.label}>Watermark</Text>
          <Switch value={watermark} onValueChange={setWatermark} />
        </View>
        <Text style={styles.section}>Filters</Text>
        <PremiumButton title={AI_EFFECTS.bbosyap.label + ' (AI)'} onPress={() => applyBrightness(AI_EFFECTS.bbosyap.label, 'bbosyap')} loading={loading} />
        <PremiumButton title={AI_EFFECTS.sky.label + ' (AI)'} onPress={applySkyTint} loading={loading} variant="outline" />
        <PremiumButton title="Save" onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  preview: { width: '100%', height: 280, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
  watermark: { position: 'absolute', top: 60, right: 28, color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: theme.colors.text },
  section: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: theme.spacing.sm },
});
`);

write('app/shop/index.tsx', `import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PremiumButton } from '@/components/PremiumButton';
import { StarChip } from '@/components/StarChip';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function ShopScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const items = api.getShopItems();

  const buy = async (id: string, name: string, cost: number) => {
    try {
      await api.spendStars(cost, 'shop_' + id);
      await refresh();
      Alert.alert('Purchased', name + ' unlocked!');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Insufficient stars');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="Star Shop" showBack />
        {profile ? <StarChip stars={profile.stars} /> : null}
        <Text style={styles.sub}>Spend stars on AI effects and boosts</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.desc}>{item.description}</Text>
            <PremiumButton title={'Buy · ' + item.cost + ' stars'} onPress={() => buy(item.id, item.name, item.cost)} />
          </View>
        ))}
        <PremiumButton title="Back" onPress={() => router.back()} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.surfaceLight },
  name: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14 },
});
`);

write('expo-env.d.ts', `/// <reference types="expo/types" />
`);

write('README.md', `# TingTing Travel App

Korean travel MVP — explore 17 regions, record visits with photos, complete GPS quests, and spend stars on AI photo effects.

## Structure

- \`apps/mobile\` — Expo React Native app (expo-router)
- \`packages/shared\` — shared types, regions, constants
- \`supabase/migrations\` — Postgres schema + RLS + RPCs
- \`seed/places.json\` — sample places per region

## Quick Start (local mode — no Supabase required)

\`\`\`bash
cd apps/mobile
npm install
npx expo start
\`\`\`

Use **Demo Mode** on the login screen. Data persists in AsyncStorage via \`lib/local-store.ts\`.

## Supabase (optional)

1. Create a Supabase project
2. Run \`supabase/migrations/001_initial.sql\`
3. Seed \`places\` from \`seed/places.json\`
4. Copy \`.env.example\` to \`.env\` and set:

\`\`\`
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

When env vars are set, \`lib/api.ts\` uses Supabase; otherwise local-store is primary.

## Features

- Email login/signup + demo mode
- Premium indigo home dashboard with nation progress ring
- Map with 17 regions and places
- Visit recording with photo picker
- Photo editor (brightness, AI stubs: 뽀샵 / 하늘리터치, watermark)
- GPS quest verification
- Star shop
- Groups (1st free, 2nd+ costs 50 stars)
- UGC recommendations on place screens

## Scripts

\`\`\`bash
npm run mobile          # from repo root
npm run typecheck       # TypeScript check
\`\`\`
`, root);

console.log('Detail screens + README done');
