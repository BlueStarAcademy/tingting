import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Place } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { useContentWidth } from '@/hooks/useContentWidth';
import { getPlaceImageUrl } from '@/lib/place-images';
import { cardSurface, sectionTitleStyle } from '@/lib/ui';
import { theme } from '@/constants/theme';

const COLS = 2;
const GAP = theme.spacing.sm;

export function RecommendedPlacesSection() {
  const router = useRouter();
  const { t } = useLocale();
  const contentWidth = useContentWidth();
  const [places, setPlaces] = useState<Place[]>([]);

  const horizontalPad = theme.spacing.lg * 2;
  const cardWidth = Math.floor((contentWidth - horizontalPad - GAP * (COLS - 1)) / COLS);

  useFocusEffect(
    useCallback(() => {
      api.getRecommendedPlaces(6).then(setPlaces);
    }, [])
  );

  if (places.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('home.recommended')}</Text>
      <Text style={styles.sub}>{t('home.recommendedSub')}</Text>
      <View style={styles.grid}>
        {places.map((place) => {
          const region = getRegion(place.regionCode);
          const imageUri = getPlaceImageUrl(place);
          return (
            <Pressable
              key={place.id}
              style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
              onPress={() => router.push(`/place/${place.id}` as Href)}
            >
              <View style={styles.imageWrap}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: region?.color ?? theme.colors.surfaceLight }]}>
                    <Ionicons name="image-outline" size={28} color={theme.colors.textSubtle} />
                  </View>
                )}
                {region ? (
                  <View style={styles.regionBadge}>
                    <Text style={styles.regionBadgeText} numberOfLines={1}>
                      {region.name}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {place.name}
                </Text>
                <Text style={styles.desc} numberOfLines={2}>
                  {place.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginBottom: theme.spacing.lg },
  title: { ...sectionTitleStyle(), marginBottom: 4 },
  sub: { color: theme.colors.textMuted, fontSize: 13, marginBottom: theme.spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  card: {
    ...cardSurface(),
    overflow: 'hidden',
    padding: 0,
  },
  pressed: { opacity: 0.92 },
  imageWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: theme.colors.surfaceLight,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    maxWidth: '80%',
  },
  regionBadgeText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    padding: theme.spacing.sm,
    gap: 4,
  },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  desc: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 16 },
});
