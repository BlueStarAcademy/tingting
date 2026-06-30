const fs = require('fs');
const path = require('path');
const mobile = path.resolve(__dirname, '../apps/mobile');

function write(rel, content) {
  const full = path.join(mobile, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Wrote apps/mobile/' + rel);
}

write('app/_layout.tsx', `import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </AuthProvider>
  );
}
`);

write('app/index.tsx', `import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function Index() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/(auth)/login');
    } else if (!profile?.onboardingComplete) {
      router.replace('/(auth)/onboarding');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [loading, session, profile]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={theme.colors.primaryLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
});
`);

write('app/(auth)/_layout.tsx', `import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
`);

write('app/(auth)/login.tsx', `import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Enter email');
    setLoading(true);
    try {
      await api.signIn(email.trim(), password);
      await refresh();
      router.replace('/');
    } catch (e: unknown) {
      Alert.alert('Login failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      await api.signInDemo();
      await refresh();
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.logo}>TingTing</Text>
        <Text style={styles.sub}>Travel Korea, collect stars</Text>
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
          <PremiumButton title="Sign In" onPress={handleLogin} loading={loading} />
          <View style={styles.gap} />
          <PremiumButton title="Demo Mode" onPress={handleDemo} loading={loading} variant="outline" />
          <PremiumButton title="Create Account" onPress={() => router.push('/(auth)/signup')} variant="outline" />
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
  logo: { fontSize: 42, fontWeight: '800', color: '#fff', textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: theme.spacing.xl, fontSize: 16 },
  form: { gap: theme.spacing.sm },
  input: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  gap: { height: theme.spacing.sm },
});
`);

write('app/(auth)/signup.tsx', `import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !displayName.trim()) return Alert.alert('Error', 'Fill all fields');
    setLoading(true);
    try {
      await api.signUp(email.trim(), password, displayName.trim());
      await refresh();
      router.replace('/(auth)/onboarding');
    } catch (e: unknown) {
      Alert.alert('Signup failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.title}>Join TingTing</Text>
        <TextInput style={styles.input} placeholder="Display name" placeholderTextColor={theme.colors.textMuted} value={displayName} onChangeText={setDisplayName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={theme.colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={theme.colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
        <PremiumButton title="Sign Up" onPress={handleSignup} loading={loading} />
        <PremiumButton title="Back to Login" onPress={() => router.back()} variant="outline" />
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.sm },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: theme.spacing.lg },
  input: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
`);

write('app/(auth)/onboarding.tsx', `import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { PremiumButton } from '@/components/PremiumButton';
import { ProgressRing } from '@/components/ProgressRing';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Enter your name');
    setLoading(true);
    try {
      await api.completeOnboarding(name.trim());
      await refresh();
      router.replace('/(tabs)/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.sub}>Explore 17 regions across Korea and earn stars</Text>
        <ProgressRing progress={0} label="Nation" />
        <TextInput style={styles.input} placeholder="Your display name" placeholderTextColor={theme.colors.textMuted} value={name} onChangeText={setName} />
        <PremiumButton title="Start Exploring" onPress={finish} loading={loading} />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.lg },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  sub: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 15 },
  input: { width: '100%', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
`);

write('app/(tabs)/_layout.tsx', `import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.surfaceLight },
        tabBarActiveTintColor: theme.colors.primaryLight,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} /> }} />
      <Tabs.Screen name="visits" options={{ title: 'Visits', tabBarIcon: ({ color, size }) => <Ionicons name="camera" size={size} color={color} /> }} />
      <Tabs.Screen name="quest" options={{ title: 'Quest', tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} /> }} />
      <Tabs.Screen name="my" options={{ title: 'My', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
`);

write('app/(tabs)/home.tsx', `import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/GradientBackground';
import { ProgressRing } from '@/components/ProgressRing';
import { StarChip } from '@/components/StarChip';
import { GroupCard } from '@/components/GroupCard';
import { PhotoThumb } from '@/components/PhotoThumb';
import { api } from '@/lib/api';
import type { HomeDashboard } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const [dash, setDash] = useState<HomeDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await api.getHomeDashboard();
    setDash(data);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!dash) return <GradientBackground />;

  const progress = dash.visitedCount / dash.totalRegions;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />} contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greet}>Hello, {dash.profile.displayName}</Text>
              <Text style={styles.sub}>Nation Explorer</Text>
            </View>
            <StarChip stars={dash.profile.stars} onPress={() => router.push('/shop')} />
          </View>

          <View style={styles.progressCard}>
            <ProgressRing progress={progress} label="Korea" />
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>{dash.visitedCount} / {dash.totalRegions} Regions</Text>
              <Text style={styles.progressSub}>Keep traveling to complete the map</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Travel Groups</Text>
              <Pressable onPress={() => router.push('/group/create')}>
                <Text style={styles.link}>+ New</Text>
              </Pressable>
            </View>
            {dash.groups.length === 0 ? (
              <Text style={styles.empty}>Create your first group — it's free!</Text>
            ) : (
              dash.groups.map((g) => <GroupCard key={g.id} group={g} onPress={() => router.push('/group/' + g.id)} />)
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dash.recentVisits.length === 0 ? (
                <Text style={styles.empty}>No visits yet — start exploring!</Text>
              ) : (
                dash.recentVisits.map((v) => (
                  <PhotoThumb key={v.id} uri={v.editedPhotoUri ?? v.photoUri} onPress={() => router.push('/editor/' + v.id)} />
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg },
  greet: { color: '#fff', fontSize: 24, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,27,75,0.7)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.25)',
  },
  progressInfo: { flex: 1, marginLeft: theme.spacing.lg },
  progressTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  progressSub: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
  section: { marginBottom: theme.spacing.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: theme.spacing.sm },
  link: { color: theme.colors.primaryLight, fontWeight: '600' },
  empty: { color: theme.colors.textMuted, fontSize: 14 },
});
`);

write('app/(tabs)/map.tsx', `import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { REGIONS } from '@tingting/shared';
import { RegionChip } from '@/components/RegionChip';
import { PlaceCard } from '@/components/PlaceCard';
import { api } from '@/lib/api';
import type { Place } from '@tingting/shared';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function MapScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setPlaces(await api.getPlaces(selected ?? undefined));
  };

  useFocusEffect(useCallback(() => { load(); }, [selected]));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Korea Map</Text>
        <Text style={styles.sub}>17 regions · tap to filter places</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          <RegionChip region={{ code: 'ALL', name: 'All', nameEn: 'All', color: theme.colors.primary }} visited onPress={() => setSelected(null)} />
          {REGIONS.map((r) => (
            <RegionChip key={r.code} region={r} visited={profile?.visitedRegions.includes(r.code)} onPress={() => { setSelected(r.code); router.push('/region/' + r.code); }} />
          ))}
        </ScrollView>
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
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  chips: { marginBottom: theme.spacing.md },
});
`);

write('app/(tabs)/visits.tsx', `import { useCallback, useState } from 'react';
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
`);

write('app/(tabs)/quest.tsx', `import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';
import type { Quest } from '@tingting/shared';
import { theme } from '@/constants/theme';

export default function QuestScreen() {
  const [quests, setQuests] = useState<Quest[]>([]);

  const load = async () => setQuests(await api.getQuests());
  useFocusEffect(useCallback(() => { load(); }, []));

  const verify = async (quest: Quest) => {
    try {
      const coords = await getCurrentCoords();
      const result = await api.completeQuest(quest.id, coords.lat, coords.lng);
      Alert.alert('Quest Complete!', '+' + result.reward + ' stars (total: ' + result.stars + ')');
      load();
    } catch (e: unknown) {
      Alert.alert('Quest failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>GPS Quests</Text>
        <Text style={styles.sub}>Visit locations to verify and earn stars</Text>
        {quests.map((q) => (
          <View key={q.id} style={styles.card}>
            <Text style={styles.name}>{q.title}</Text>
            <Text style={styles.desc}>{q.description}</Text>
            <Text style={styles.reward}>Reward: {q.rewardStars} stars</Text>
            {q.completed ? (
              <Text style={styles.done}>Completed</Text>
            ) : (
              <PremiumButton title="Verify GPS" onPress={() => verify(q)} />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.md },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14 },
  reward: { color: theme.colors.star, fontWeight: '600' },
  done: { color: theme.colors.success, fontWeight: '700' },
});
`);

write('app/(tabs)/my.tsx', `import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton } from '@/components/PremiumButton';
import { StarChip } from '@/components/StarChip';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function MyScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{profile?.displayName ?? 'Traveler'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>
        {profile ? <StarChip stars={profile.stars} onPress={() => router.push('/shop')} /> : null}
        <View style={styles.spacer} />
        <PremiumButton title="Star Shop" onPress={() => router.push('/shop')} />
        <PremiumButton title="Create Group" onPress={() => router.push('/group/create')} variant="outline" />
        <PremiumButton title="Sign Out" onPress={async () => { await signOut(); router.replace('/(auth)/login'); }} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.md, alignItems: 'flex-start' },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  email: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  spacer: { height: theme.spacing.md },
});
`);

console.log('Tab screens done');
