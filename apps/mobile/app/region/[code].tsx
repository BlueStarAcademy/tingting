import { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { getRegion } from '@tingting/shared';
import { PlaceCard } from '@/components/PlaceCard';
import { AppScreen } from '@/components/AppScreen';
import { api } from '@/lib/api';
import type { Place } from '@tingting/shared';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { prefersEnglishContent } from '@/lib/i18n/locales';
import { theme } from '@/constants/theme';

export default function RegionScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { t, locale } = useLocale();
  const [places, setPlaces] = useState<Place[]>([]);
  const region = getRegion(code);

  useFocusEffect(
    useCallback(() => {
      api.getPlaces(code).then(setPlaces);
    }, [code])
  );

  const visited = profile?.visitedRegions.includes(code);
  const regionLabel = prefersEnglishContent(locale) && region?.nameEn ? region.nameEn : region?.name;

  return (
    <AppScreen title={regionLabel ?? code} showBack>
      {locale === 'ko' && region?.nameEn ? <Text style={styles.sub}>{region.nameEn}</Text> : null}
      <View style={[styles.badge, visited && styles.badgeVisited]}>
        <Text style={styles.badgeText}>{visited ? t('region.visited') : t('region.notVisited')}</Text>
      </View>
      <Text style={styles.count}>{t('region.placeCount', { count: places.length })}</Text>
      {places.map((p) => (
        <PlaceCard key={p.id} place={p} onPress={() => router.push(`/place/${p.id}` as Href)} />
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  sub: { color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  badgeVisited: { backgroundColor: 'rgba(52,211,153,0.2)' },
  badgeText: { color: theme.colors.text, fontWeight: '600' },
  count: { color: theme.colors.primaryLight, marginBottom: theme.spacing.md },
});
