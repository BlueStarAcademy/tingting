import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Quest } from '@tingting/shared';
import {
  GROUP_STATION_QUEST_GALLERY_REWARD,
  REGION_PHOTO_REVIEW_QUEST_TARGET,
  REGION_PHOTO_REVIEW_QUEST_REWARD,
  REGION_RECOMMENDED_VISIT_QUESTS,
  buildRegionActivityQuestId,
  buildRegionRecommendedVisitQuestId,
  getRegion,
  sanitizeGroupQuests,
  type Place,
  type Visit,
} from '@tingting/shared';
import { api } from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';
import { isPhotoReviewVisit } from '@/lib/travel-progress';
import { StarAmount } from '@/components/StarAmount';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  groupId: string;
  regionCode: string;
  quests: Quest[];
  visits: Visit[];
  places: Place[];
  onUpdated: () => void;
}

export function GroupQuestTab({ groupId, regionCode, quests, visits, places, onUpdated }: Props) {
  const { t } = useLocale();

  const fallbackQuests = buildFallbackQuests(regionCode, visits, places);
  const existingQuestIds = new Set(quests.map((q) => q.id));
  const displayQuests = sanitizeGroupQuests([
    ...quests.filter((q) => q.regionCode === regionCode),
    ...fallbackQuests.filter((q) => !existingQuestIds.has(q.id)),
  ]);

  const verify = async (quest: Quest) => {
    try {
      const coords = await getCurrentCoords();
      const result = await api.completeGroupQuest(groupId, quest.id, coords.lat, coords.lng);
      if (result.rewardStars) {
        Alert.alert('퀘스트 완료!', `${result.rewardStars} 스타를 획득했습니다!`);
      } else if (quest.questKind === 'recommended_visits') {
        Alert.alert('GPS 인증 완료', '추천 장소 방문이 기록되었습니다.');
      } else {
        Alert.alert(
          t('group.stationQuestCompleteTitle'),
          t('group.stationQuestCompleteMessage', { count: result.rewardGallerySlots }),
        );
      }
      onUpdated();
    } catch (e: unknown) {
      Alert.alert(t('quest.failed'), e instanceof Error ? e.message : t('auth.unknownError'));
    }
  };

  const getQuestTitle = (q: Quest) => {
    if (q.isStationQuest && q.regionCode) {
      const name = getRegion(q.regionCode)?.name ?? q.regionCode;
      return `${name} 방문인증`;
    }
    return q.title;
  };

  const canVerifyRecommended = (q: Quest) => {
    if (q.questKind !== 'recommended_visits' || q.completed) return false;
    const maxTarget = REGION_RECOMMENDED_VISIT_QUESTS[REGION_RECOMMENDED_VISIT_QUESTS.length - 1].target;
    return (q.progressCount ?? 0) < maxTarget;
  };

  return (
    <View style={styles.wrap}>
      {displayQuests.length === 0 ? (
        <Text style={styles.empty}>{t('group.questEmpty')}</Text>
      ) : (
        displayQuests.map((q) => {
          const completed = q.completed;
          const isGallery = q.rewardType === 'gallery_slots';
          const isPhotoReview = q.questKind === 'photo_reviews';
          const isRecommended = q.questKind === 'recommended_visits';
          const progressCount = q.progressCount ?? 0;
          const targetCount = q.targetCount ?? 1;
          const showRecommendedVerify = canVerifyRecommended(q);
          return (
            <View key={q.id} style={[styles.card, completed && styles.cardCompleted]}>
              <View style={styles.row1}>
                <Text style={styles.title} numberOfLines={1}>{getQuestTitle(q)}</Text>
              </View>
              <View style={styles.row2}>
                {isGallery ? (
                  <View style={styles.rewardChip}>
                    <Ionicons name="images-outline" size={12} color={theme.colors.primaryLight} />
                    <Text style={styles.rewardText}>
                      +{q.rewardGallerySlots ?? GROUP_STATION_QUEST_GALLERY_REWARD}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.rewardChip}>
                    <StarAmount amount={q.rewardStars} compact textStyle={styles.starRewardText} />
                  </View>
                )}
                {completed ? (
                  <Text style={styles.doneLabel}>{t('group.questCompleteLabel')}</Text>
                ) : isPhotoReview ? (
                  <View style={styles.progressChip}>
                    <Text style={styles.progressText}>
                      {t('group.questProgressCount', { current: progressCount, target: targetCount })}
                    </Text>
                  </View>
                ) : isRecommended ? (
                  <View style={styles.actionRow}>
                    <View style={styles.progressChip}>
                      <Text style={styles.progressText}>
                        {t('group.questProgressCount', { current: progressCount, target: targetCount })}
                      </Text>
                    </View>
                    {showRecommendedVerify ? (
                      <Pressable style={styles.verifyBtn} onPress={() => verify(q)}>
                        <Ionicons name="navigate" size={12} color="#fff" />
                        <Text style={styles.verifyBtnText}>{t('group.stationQuestVerify')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    <Pressable style={styles.verifyBtn} onPress={() => verify(q)}>
                      <Ionicons name="navigate" size={12} color="#fff" />
                      <Text style={styles.verifyBtnText}>{t('group.stationQuestVerify')}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function buildFallbackQuests(regionCode: string, visits: Visit[], places: Place[]): Quest[] {
  const region = getRegion(regionCode);
  const regionPlaceIds = new Set(places.filter((place) => place.regionCode === regionCode).map((place) => place.id));
  const regionReviews = visits.filter(
    (visit) => visit.groupId && regionPlaceIds.has(visit.placeId) && isPhotoReviewVisit(visit),
  );
  const stationPlace = places.find((place) => place.regionCode === regionCode) ?? places[0];
  const placeId = stationPlace?.id ?? regionCode;
  const baseLat = stationPlace?.lat ?? 0;
  const baseLng = stationPlace?.lng ?? 0;
  const regionName = region?.name ?? regionCode;

  const photoQuest: Quest = {
    id: buildRegionActivityQuestId(regionCode, 'photo_reviews'),
    placeId,
    title: `${regionName} 사진 후기 3개`,
    description: `${regionName} 여행 사진과 후기를 3개 남기면 10스타를 받습니다.`,
    rewardStars: REGION_PHOTO_REVIEW_QUEST_REWARD,
    targetLat: baseLat,
    targetLng: baseLng,
    radiusMeters: 0,
    regionCode,
    questKind: 'photo_reviews',
    targetCount: REGION_PHOTO_REVIEW_QUEST_TARGET,
    progressCount: Math.min(regionReviews.length, REGION_PHOTO_REVIEW_QUEST_TARGET),
    completed: regionReviews.length >= REGION_PHOTO_REVIEW_QUEST_TARGET,
  };

  const recommendedQuests: Quest[] = REGION_RECOMMENDED_VISIT_QUESTS.map(({ target, reward }) => ({
    id: buildRegionRecommendedVisitQuestId(regionCode, target),
    placeId,
    title: target === 1 ? `${regionName} 추천장소 방문` : `${regionName} 추천장소 ${target}개 방문`,
    description:
      target === 1
        ? `${regionName} 추천 장소 어디서든 GPS 인증하기`
        : `${regionName} 추천 장소 ${target}곳에서 GPS 인증하기`,
    rewardStars: reward,
    targetLat: baseLat,
    targetLng: baseLng,
    radiusMeters: 0,
    regionCode,
    questKind: 'recommended_visits',
    targetCount: target,
    progressCount: 0,
    completed: false,
  }));

  return [photoQuest, ...recommendedQuests];
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.lg, fontSize: 13 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  cardCompleted: { opacity: 0.6 },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { color: theme.colors.text, fontSize: 13, fontWeight: '800', flex: 1 },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.tint.soft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  rewardText: { color: theme.colors.primaryLight, fontSize: 11, fontWeight: '800' },
  starRewardText: { fontSize: 11, fontWeight: '800' },
  doneLabel: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
  progressChip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
  },
  verifyBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
