import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { PublicExperiencePost } from '@tingting/shared';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ExperiencePostCard } from '@/components/ExperiencePostCard';
import { RecommendFilterBar } from '@/components/recommend/RecommendFilterBar';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import {
  DEFAULT_RECOMMEND_FILTERS,
  buildPlaceLookup,
  filterRecommendFeed,
  getRegionLabel,
  hasActiveRecommendFilters,
  type RecommendFilterState,
} from '@/lib/recommend-filter';
import { theme } from '@/constants/theme';

export default function RecommendScreen() {
  const { t, locale } = useLocale();
  const { profile, session } = useAuth();
  const contentWidth = useContentWidth();
  const ownUserId = profile?.id ?? session?.userId ?? '';
  const [posts, setPosts] = useState<PublicExperiencePost[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<RecommendFilterState>(DEFAULT_RECOMMEND_FILTERS);
  const [placeById, setPlaceById] = useState(() => buildPlaceLookup([]));
  const [refreshing, setRefreshing] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);

  const load = async () => {
    const [feed, places, liked] = await Promise.all([
      api.getPublicFeed(),
      api.getPlaces(),
      api.getFeedLikedPostIds(),
    ]);
    setPosts(feed);
    setPlaceById(buildPlaceLookup(places));
    setLikedIds(new Set(liked));
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const regionLabel = useCallback((code: string) => getRegionLabel(code, locale), [locale]);

  const filteredPosts = useMemo(
    () => filterRecommendFeed(posts, placeById, filters, regionLabel),
    [filters, placeById, posts, regionLabel],
  );

  const filtersActive = hasActiveRecommendFilters(filters);

  const handleToggleRecommend = async (post: PublicExperiencePost) => {
    if (post.userId === ownUserId) return;
    try {
      const result = await api.toggleFeedRecommend(post.id, post.userId);
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, recommendCount: result.count } : item,
        ),
      );
      setLikedIds((current) => {
        const next = new Set(current);
        if (result.liked) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('recommend.recommendFailed'));
    }
  };

  const renderEmpty = () => {
    if (posts.length === 0) {
      return (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={48} color={theme.colors.textSubtle} />
          <Text style={styles.emptyTitle}>{t('recommend.empty')}</Text>
          <Text style={styles.emptySub}>{t('recommend.emptySub')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.empty}>
        <Ionicons name="search-outline" size={48} color={theme.colors.textSubtle} />
        <Text style={styles.emptyTitle}>{t('recommend.noResults')}</Text>
        <Text style={styles.emptySub}>
          {filtersActive ? t('recommend.noResultsSub') : t('recommend.emptySub')}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.page, { width: contentWidth, maxWidth: contentWidth }]}>
      <ScreenBackground />
      <View style={styles.content}>
        <RecommendFilterBar filters={filters} onChange={setFilters} />

        <View style={styles.listArea} onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}>
          {filteredPosts.length === 0 ? (
            renderEmpty()
          ) : cardHeight > 0 ? (
            <FlatList
              data={filteredPosts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              snapToInterval={cardHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
              }
              renderItem={({ item }) => (
                <View style={{ height: cardHeight }}>
                  <ExperiencePostCard
                    post={item}
                    liked={likedIds.has(item.id)}
                    canRecommend={item.userId !== ownUserId}
                    onToggleRecommend={() => handleToggleRecommend(item)}
                    fillHeight
                  />
                </View>
              )}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, overflow: 'hidden' },
  content: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
