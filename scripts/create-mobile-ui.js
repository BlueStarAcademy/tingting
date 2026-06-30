const fs = require('fs');
const path = require('path');
const mobile = path.resolve(__dirname, '../apps/mobile');

function write(rel, content) {
  const full = path.join(mobile, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Wrote apps/mobile/' + rel);
}

write('components/GradientBackground.tsx', `import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

export function GradientBackground({ style, children }: { style?: ViewStyle; children?: React.ReactNode }) {
  return (
    <LinearGradient
      colors={[theme.colors.gradientStart, theme.colors.gradientMid, theme.colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
});
`);

write('components/ProgressRing.tsx', `import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface Props {
  progress: number;
  size?: number;
  label?: string;
}

export function ProgressRing({ progress, size = 120, label }: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
  const stroke = 8;
  const inner = size - stroke * 2;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: theme.colors.surfaceLight,
          },
        ]}
      />
      <View
        style={[
          styles.progressArc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: theme.colors.star,
            borderTopColor: pct >= 25 ? theme.colors.star : 'transparent',
            borderRightColor: pct >= 50 ? theme.colors.star : 'transparent',
            borderBottomColor: pct >= 75 ? theme.colors.star : 'transparent',
            borderLeftColor: pct >= 100 ? theme.colors.star : 'transparent',
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
      <View style={[styles.inner, { width: inner, height: inner, borderRadius: inner / 2 }]}>
        <Text style={styles.pct}>{pct}%</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  progressArc: { position: 'absolute' },
  inner: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  label: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
});
`);

write('components/StarChip.tsx', `import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

export function StarChip({ stars, onPress }: { stars: number; onPress?: () => void }) {
  const content = (
    <>
      <Ionicons name="star" size={16} color={theme.colors.star} />
      <Text style={styles.text}>{stars}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable style={styles.chip} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.chip}>{content}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  text: { color: theme.colors.star, fontWeight: '700', fontSize: 15 },
});
`);

write('components/GroupCard.tsx', `import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Group } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.icon}>
        <Ionicons name="people" size={22} color={theme.colors.primaryLight} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.meta}>{group.memberIds.length} members</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.2)',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  body: { flex: 1 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  meta: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
});
`);

write('components/PlaceCard.tsx', `import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Place } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function PlaceCard({ place, onPress }: { place: Place; onPress: () => void }) {
  const region = getRegion(place.regionCode);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: region?.color ?? theme.colors.primary }]}>
        <Ionicons name="location" size={20} color="#fff" />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.region}>{region?.name ?? place.regionCode} · {place.category}</Text>
        <Text style={styles.desc} numberOfLines={2}>{place.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.15)',
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  body: { flex: 1 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  region: { color: theme.colors.primaryLight, fontSize: 12, marginTop: 2 },
  desc: { color: theme.colors.textMuted, fontSize: 13, marginTop: 4 },
});
`);

write('components/RegionChip.tsx', `import { Pressable, Text, StyleSheet } from 'react-native';
import type { Region } from '@tingting/shared';
import { theme } from '@/constants/theme';

export function RegionChip({ region, visited, onPress }: { region: Region; visited?: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, visited && styles.visited, { borderColor: region.color }]}
      onPress={onPress}
    >
      <Text style={[styles.text, visited && styles.textVisited]}>{region.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    backgroundColor: 'rgba(30,27,75,0.8)',
    marginRight: 8,
    marginBottom: 8,
  },
  visited: { backgroundColor: 'rgba(99,102,241,0.35)' },
  text: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  textVisited: { color: theme.colors.text },
});
`);

write('components/PremiumButton.tsx', `import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline';
}

export function PremiumButton({ title, onPress, loading, variant = 'primary' }: Props) {
  if (variant === 'outline') {
    return (
      <Pressable style={styles.outline} onPress={onPress} disabled={loading}>
        {loading ? <ActivityIndicator color={theme.colors.primaryLight} /> : <Text style={styles.outlineText}>{title}</Text>}
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} disabled={loading} style={styles.wrap}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryLight]} style={styles.btn}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: theme.radius.md, overflow: 'hidden' },
  btn: { paddingVertical: 14, alignItems: 'center', borderRadius: theme.radius.md },
  text: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outline: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryLight,
  },
  outlineText: { color: theme.colors.primaryLight, fontSize: 16, fontWeight: '600' },
});
`);

write('components/PhotoThumb.tsx', `import { Image, Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

export function PhotoThumb({ uri, onPress }: { uri: string; onPress?: () => void }) {
  const inner = <Image source={{ uri }} style={styles.img} />;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.wrap}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.wrap}>{inner}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    width: 100,
    height: 100,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
  },
  img: { width: '100%', height: '100%' },
});
`);

write('components/ScreenHeader.tsx', `import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export function ScreenHeader({ title, showBack }: { title: string; showBack?: boolean }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md },
  back: { width: 40 },
  title: { flex: 1, textAlign: 'center', color: theme.colors.text, fontSize: 18, fontWeight: '700' },
});
`);

write('hooks/useAuth.tsx', `import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { AuthSession, UserProfile } from '@tingting/shared';
import { api } from '@/lib/api';

interface AuthContextValue {
  session: AuthSession | null;
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const s = await api.getSession();
    setSession(s);
    if (s) {
      setProfile(await api.getProfile());
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await api.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
`);

console.log('Components done');
