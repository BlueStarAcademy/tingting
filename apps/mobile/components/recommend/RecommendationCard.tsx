import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRecommendationCategory, type RecommendedPlace } from '@tingting/shared';
import type { IconName } from '@/components/ui';
import { formatDateRange } from '@/lib/dates';
import { openPlaceInMap } from '@/lib/place-navigation';
import { cardSurface } from '@/lib/ui';
import { theme } from '@/constants/theme';

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}km`;
}

function Thumb({ item }: { item: RecommendedPlace }) {
  const info = getRecommendationCategory(item.category);
  const [failed, setFailed] = useState(false);
  const uri = item.thumbnailUrl ?? item.imageUrl;
  if (uri && !failed) {
    return <Image source={{ uri }} style={styles.thumb} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: `${info.color}1F` }]}>
      <Ionicons name={info.icon as IconName} size={28} color={info.color} />
    </View>
  );
}

export function RecommendationCard({
  item,
  onSave,
  onOpenSaved,
}: {
  item: RecommendedPlace;
  onSave: (item: RecommendedPlace) => Promise<void>;
  onOpenSaved: (placeId: string) => void;
}) {
  const info = getRecommendationCategory(item.category);
  const [saving, setSaving] = useState(false);
  const eventRange = item.category === 'event' ? formatDateRange(item.eventStart, item.eventEnd) : null;
  const meta = [item.categoryLabel ?? info.label, item.distanceM != null ? formatDistance(item.distanceM) : null].filter(Boolean).join(' · ');

  const toggleSave = async () => {
    if (item.savedPlaceId) {
      onOpenSaved(item.savedPlaceId);
      return;
    }
    setSaving(true);
    try {
      await onSave(item);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Pressable
      onPress={() => void openPlaceInMap(item, 'kakao')}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityLabel={`${item.name}, 카카오맵에서 보기`}
    >
      <Thumb item={item} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Pressable
            onPress={toggleSave}
            hitSlop={10}
            style={styles.heart}
            accessibilityRole="button"
            accessibilityLabel={item.savedPlaceId ? '저장한 장소 보기' : '가보고 싶어요에 담기'}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name={item.savedPlaceId ? 'heart' : 'heart-outline'} size={21} color={theme.colors.primary} />
            )}
          </Pressable>
        </View>
        <Text style={[styles.meta, { color: info.color }]} numberOfLines={1}>
          {meta}
        </Text>
        {eventRange ? (
          <Text style={styles.event} numberOfLines={1}>
            {eventRange}
          </Text>
        ) : null}
        {item.address ? (
          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
        ) : null}
        <View style={styles.links}>
          <Pressable onPress={() => void openPlaceInMap(item, 'kakao')} hitSlop={6} style={[styles.link, styles.kakao]}>
            <Text style={[styles.linkText, styles.kakaoText]}>카카오맵</Text>
          </Pressable>
          <Pressable onPress={() => void openPlaceInMap(item, 'naver')} hitSlop={6} style={[styles.link, styles.naver]}>
            <Text style={[styles.linkText, styles.naverText]}>네이버지도</Text>
          </Pressable>
          {item.savedPlaceId ? <Text style={styles.saved}>담아 둔 곳</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...cardSurface(), flexDirection: 'row', gap: 12, padding: 10, marginBottom: 10 },
  pressed: { opacity: 0.88 },
  thumb: { width: 84, height: 84, borderRadius: 14, backgroundColor: theme.colors.backgroundAlt },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  heart: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  meta: { fontSize: 12, fontWeight: '800' },
  event: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '700' },
  address: { color: theme.colors.textSubtle, fontSize: 12 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  link: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: theme.radius.full },
  linkText: { fontSize: 11, fontWeight: '800' },
  kakao: { backgroundColor: 'rgba(254,229,0,0.35)' },
  kakaoText: { color: '#5C4A00' },
  naver: { backgroundColor: 'rgba(3,199,90,0.14)' },
  naverText: { color: '#027A38' },
  saved: { color: theme.colors.primary, fontSize: 11, fontWeight: '800', marginLeft: 'auto' },
});
