import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cityFolderTitle, formatTripDates, type CityFolder } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { thumbUri } from '@/lib/media';
import { theme } from '@/constants/theme';

const COVER = 60;

/** One city trip folder: cover, title, dates, memo and counts. */
export function CityFolderRow({ folder, showCity, onPress }: { folder: CityFolder; showCity?: boolean; onPress: () => void }) {
  const { t } = useLocale();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
      {folder.coverPhotoUri ? (
        <Image source={{ uri: thumbUri(folder.coverPhotoUri, COVER) }} style={styles.cover} resizeMethod="resize" />
      ) : (
        <View style={[styles.cover, styles.coverEmpty]}>
          <Ionicons name="images-outline" size={22} color={theme.colors.primaryLight} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {cityFolderTitle(folder)}
        </Text>
        <Text style={styles.dates} numberOfLines={1}>
          {showCity ? `${folder.cityName} · ` : ''}
          {formatTripDates(folder.startDate, folder.endDate)}
        </Text>
        {folder.memo ? (
          <Text style={styles.memo} numberOfLines={1}>
            {folder.memo}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Ionicons name="image-outline" size={12} color={theme.colors.textSubtle} />
          <Text style={styles.metaText}>{t('album.count', { count: folder.photoCount })}</Text>
          <Ionicons name="location-outline" size={12} color={theme.colors.textSubtle} />
          <Text style={styles.metaText}>{t('city.pinCount', { count: folder.pinCount })}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: { backgroundColor: theme.colors.tint.soft },
  cover: { width: COVER, height: COVER, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.colors.tint.light },
  coverEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.tint.light },
  body: { flex: 1, gap: 2 },
  title: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  dates: { color: theme.colors.primaryDark, fontSize: 12, fontWeight: '700' },
  memo: { color: theme.colors.textMuted, fontSize: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { color: theme.colors.textSubtle, fontSize: 11, fontWeight: '700', marginRight: 6 },
});
