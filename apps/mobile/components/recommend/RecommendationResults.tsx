import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  getRecommendationCategory,
  RECOMMENDATION_SOURCE_LABELS,
  type RecommendedPlace,
} from '@tingting/shared';
import { RecommendationCard } from '@/components/recommend/RecommendationCard';
import { ActionButton, EmptyState } from '@/components/ui';
import type { PagedRecommendations } from '@/hooks/usePagedRecommendations';
import { api } from '@/lib/api';
import { theme } from '@/constants/theme';

/** Saves a recommendation as a "가고 싶어요" place; Kakao ids dedupe on the server. */
export async function saveRecommendation(item: RecommendedPlace): Promise<string> {
  const place = await api.createPlace({
    name: item.name,
    category: getRecommendationCategory(item.category).placeCategory,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    phone: item.phone,
    url: item.url,
    kakaoPlaceId: item.kakaoPlaceId,
    kakaoCategory: item.categoryLabel,
    regionCode: item.regionCode,
    eventStart: item.eventStart,
    eventEnd: item.eventEnd,
    status: 'wish',
  });
  return place.id;
}

export function RecommendationResults({
  state,
  emptyTitle,
  emptyMessage,
  onOpenSaved,
  onToast,
}: {
  state: PagedRecommendations;
  emptyTitle: string;
  emptyMessage?: string;
  onOpenSaved: (placeId: string) => void;
  onToast: (message: string) => void;
}) {
  const save = async (item: RecommendedPlace) => {
    try {
      state.markSaved(item.id, await saveRecommendation(item));
      onToast('가보고 싶어요에 담았어요');
    } catch (e) {
      onToast(e instanceof Error ? e.message : '저장하지 못했어요');
    }
  };

  if (state.status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.loadingText}>추천 장소를 찾는 중이에요</Text>
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <EmptyState icon="cloud-offline-outline" title="불러오지 못했어요" message={state.error ?? undefined}>
        <ActionButton icon="refresh" label="다시 시도" onPress={state.retry} />
      </EmptyState>
    );
  }
  if (state.status !== 'ready') return null;

  if (state.items.length === 0) {
    const notice = state.notice;
    return (
      <EmptyState
        icon={notice?.code === 'tour_key_required' ? 'key-outline' : notice ? 'alert-circle-outline' : 'compass-outline'}
        title={notice?.message ?? emptyTitle}
        message={
          notice?.code === 'tour_key_required'
            ? '설정이 끝나면 지역 축제와 공연 일정이 여기에 보여요.'
            : notice
              ? '검색 서버가 잠시 응답하지 않아요. 다른 카테고리나 반경으로도 찾아보세요.'
              : emptyMessage
        }
      >
        {notice && notice.code !== 'tour_key_required' ? <ActionButton icon="refresh" label="다시 시도" onPress={state.retry} /> : null}
      </EmptyState>
    );
  }

  return (
    <View>
      {state.items.map((item) => (
        <RecommendationCard key={item.id} item={item} onSave={save} onOpenSaved={onOpenSaved} />
      ))}
      {state.hasMore ? (
        <ActionButton
          icon="chevron-down"
          label="더 보기"
          onPress={() => void state.loadMore()}
          loading={state.loadingMore}
          style={styles.more}
        />
      ) : null}
      {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
      {state.source ? (
        <Text style={styles.source}>정보 제공: {RECOMMENDATION_SOURCE_LABELS[state.source]}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 10, paddingVertical: theme.spacing.xxl },
  loadingText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  more: { marginTop: 2 },
  error: { color: theme.colors.error, fontSize: 12, textAlign: 'center', marginTop: 8 },
  source: { color: theme.colors.textSubtle, fontSize: 11, textAlign: 'center', marginTop: 12 },
});
