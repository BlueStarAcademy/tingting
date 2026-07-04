import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Place } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { getPlaceImageUrl } from '@/lib/place-images';
import { openPlaceNavigation, type PlaceNavigationProvider } from '@/lib/place-navigation';
import { PremiumButton } from '@/components/PremiumButton';
import { PremiumIconButton } from '@/components/PremiumIconButton';
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
  const navButtons: { provider: PlaceNavigationProvider; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { provider: 'naver', label: t('place.openNaverMap'), icon: 'map-outline' },
    { provider: 'kakaoNavi', label: t('place.openKakaoNavi'), icon: 'car-outline' },
    { provider: 'tmap', label: t('place.openTmap'), icon: 'trail-sign-outline' },
  ];

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
        <PremiumIconButton
          icon="close"
          variant="ghost"
          color={theme.colors.textMuted}
          onPress={onClose}
          accessibilityLabel={t('header.cancel')}
        />
      </View>

      <View style={styles.locationBadge}>
        <Ionicons name="navigate" size={18} color={theme.colors.primary} />
        <Text style={styles.locationText}>{t('place.locationConfirm')}</Text>
      </View>

      <Text style={styles.desc} numberOfLines={2}>
        {place.description}
      </Text>

      <View style={styles.navGrid}>
        {navButtons.map((button) => (
          <Pressable
            key={button.provider}
            onPress={() => openPlaceNavigation(place, button.provider)}
            style={styles.navButton}
            accessibilityRole="button"
            accessibilityLabel={button.label}
          >
            <View style={styles.navIcon}>
              <Ionicons name={button.icon} size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.navButtonText}>{button.label}</Text>
          </Pressable>
        ))}
      </View>
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
    paddingBottom: theme.spacing.lg,
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
  navGrid: { gap: 8 },
  navButton: {
    minHeight: 46,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navIcon: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.tint.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: { flex: 1, color: theme.colors.primaryDark, fontSize: 14, fontWeight: '800' },
});
