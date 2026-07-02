import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import type { PublicExperiencePost } from '@tingting/shared';
import { getRegion } from '@tingting/shared';
import { useLocale } from '@/hooks/useLocale';
import { cardSurface, shadow } from '@/lib/ui';
import { theme } from '@/constants/theme';

interface Props {
  post: PublicExperiencePost;
  liked?: boolean;
  canRecommend?: boolean;
  onToggleRecommend?: () => void;
  /** Fill parent height (recommend feed carousel) */
  fillHeight?: boolean;
}

export function ExperiencePostCard({
  post,
  liked = false,
  canRecommend = true,
  onToggleRecommend,
  fillHeight = false,
}: Props) {
  const router = useRouter();
  const { t, formatDate } = useLocale();
  const regionName = getRegion(post.regionCode)?.name ?? post.regionCode;
  const count = post.recommendCount ?? 0;

  return (
    <View style={[styles.card, cardSurface(), shadow('sm'), fillHeight && styles.cardFill]}>
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          {post.userPhotoUri ? (
            <Image source={{ uri: post.userPhotoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={18} color={theme.colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {post.displayName}
          </Text>
          <Pressable onPress={() => router.push(`/place/${post.placeId}` as Href)}>
            <Text style={styles.place} numberOfLines={1}>
              {post.placeName}
              <Text style={styles.region}> · {regionName}</Text>
            </Text>
          </Pressable>
        </View>
        <Text style={styles.date}>{formatDate(post.visitedAt)}</Text>
      </View>

      <Image
        source={{ uri: post.photoUri }}
        style={[styles.photo, fillHeight && styles.photoFill]}
        resizeMode="cover"
      />

      {post.note ? (
        <View style={[styles.body, fillHeight && styles.bodyFill]}>
          <Text style={styles.note} numberOfLines={fillHeight ? 3 : undefined}>
            {post.note}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.tag}>
          <Ionicons name="location-outline" size={13} color={theme.colors.primaryLight} />
          <Text style={styles.tagText}>{t('recommend.verifiedVisit')}</Text>
        </View>

        {canRecommend ? (
          <Pressable
            style={[styles.recommendBtn, liked && styles.recommendBtnActive]}
            onPress={onToggleRecommend}
            accessibilityRole="button"
            accessibilityLabel={t('recommend.recommendAction')}
          >
            <Ionicons
              name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
              size={16}
              color={liked ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text style={[styles.recommendCount, liked && styles.recommendCountActive]}>{count}</Text>
          </Pressable>
        ) : (
          <View style={styles.recommendReadonly}>
            <Ionicons name="thumbs-up-outline" size={16} color={theme.colors.textSubtle} />
            <Text style={styles.recommendCountReadonly}>{count}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  cardFill: {
    flex: 1,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: theme.colors.text, fontWeight: '700', fontSize: 15 },
  place: { color: theme.colors.primaryLight, fontWeight: '600', fontSize: 13 },
  region: { color: theme.colors.textMuted, fontWeight: '500' },
  date: { color: theme.colors.textSubtle, fontSize: 11, flexShrink: 0 },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: theme.colors.surface,
  },
  photoFill: {
    flex: 1,
    aspectRatio: undefined,
    minHeight: 120,
  },
  body: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm },
  bodyFill: { flexShrink: 1 },
  note: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    paddingBottom: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251,191,36,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  tagText: { color: theme.colors.primaryDark, fontSize: 11, fontWeight: '700' },
  recommendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  recommendBtnActive: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  recommendCount: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 16,
    textAlign: 'center',
  },
  recommendCountActive: {
    color: theme.colors.primaryDark,
  },
  recommendReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  recommendCountReadonly: {
    color: theme.colors.textSubtle,
    fontSize: 13,
    fontWeight: '700',
  },
});
