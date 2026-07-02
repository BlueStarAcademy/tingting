import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Place } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { getPlaceImageUrl } from '@/lib/place-images';
import { PremiumButton } from '@/components/PremiumButton';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

type Props = {
  place: Place;
  onClose: () => void;
  onViewDetail: () => void;
};

export function PlaceLocationSheet({ place, onClose, onViewDetail }: Props) {
  const { t } = useLocale();
  const region = getRegion(place.regionCode);
  const imageUri = getPlaceImageUrl(place);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="location" size={22} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.titleBody}>
            <Text style={styles.name} numberOfLines={1}>
              {place.name}
            </Text>
            <Text style={styles.region} numberOfLines={1}>
              {region?.name} · {place.category}
            </Text>
          </View>
        </View>
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel={t('header.cancel')}>
          <Ionicons name="close" size={22} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.locationBadge}>
        <Ionicons name="navigate" size={18} color={theme.colors.primary} />
        <Text style={styles.locationText}>{t('place.locationConfirm')}</Text>
      </View>

      <Text style={styles.desc} numberOfLines={2}>
        {place.description}
      </Text>
      <Text style={styles.coords}>
        {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
      </Text>

      <PremiumButton title={t('place.viewDetail')} onPress={onViewDetail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minWidth: 0 },
  thumb: { width: 52, height: 52, borderRadius: theme.radius.md },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBody: { flex: 1, minWidth: 0 },
  name: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  region: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, fontWeight: '600' },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.tint.soft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  locationText: { color: theme.colors.primaryDark, fontSize: 13, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  coords: { color: theme.colors.textSubtle, fontSize: 12 },
});
