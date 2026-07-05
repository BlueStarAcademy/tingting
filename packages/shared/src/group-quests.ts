import {
  REGION_PHOTO_REVIEW_QUEST_TARGET,
  REGION_PHOTO_REVIEW_QUEST_REWARD,
} from './constants';
import type { Quest } from './types';

/** 추천 장소 GPS 방문 퀘스트 (지역별) */
export const REGION_RECOMMENDED_VISIT_QUESTS = [
  { target: 1, reward: 10 },
  { target: 3, reward: 20 },
  { target: 5, reward: 30 },
] as const;

export function buildRegionRecommendedVisitQuestId(regionCode: string, target: number): string {
  return `region-recommended-${regionCode}-${target}`;
}

/** 레거시 공개 후기 퀘스트 (제거됨) */
export function isLegacyPublicReviewQuest(
  quest: Pick<Quest, 'id' | 'title' | 'questKind'>,
): boolean {
  const kind = quest.questKind as string | undefined;
  return (
    kind === 'public_review' ||
    quest.id.includes('public_review') ||
    quest.title.includes('공개 후기')
  );
}

function fixPhotoReviewQuest<T extends Quest>(quest: T): T {
  const isPhoto =
    quest.questKind === 'photo_reviews' ||
    quest.id.includes('photo_reviews') ||
    quest.title.includes('사진 후기 3개');
  if (!isPhoto) return quest;
  const regionName = quest.title.replace(/ 사진 후기 3개$/, '') || quest.regionCode || '';
  return {
    ...quest,
    questKind: 'photo_reviews',
    rewardStars: REGION_PHOTO_REVIEW_QUEST_REWARD,
    targetCount: REGION_PHOTO_REVIEW_QUEST_TARGET,
    title: regionName ? `${regionName} 사진 후기 3개` : quest.title,
    description: regionName
      ? `${regionName} 여행 사진과 후기를 3개 남기면 10스타를 받습니다.`
      : quest.description,
  };
}

/** API·캐시 등 레거시 퀘스트 데이터 정리 */
export function sanitizeGroupQuests<T extends Quest>(quests: T[]): T[] {
  return sortGroupQuests(
    quests
      .filter((quest) => !isLegacyPublicReviewQuest(quest))
      .map((quest) => fixPhotoReviewQuest(quest)),
  );
}

/** 원격 상태(completed·progress)를 로컬 정의 퀘스트에 병합. 레거시 퀘스트는 제외 */
export function mergeRemoteGroupQuestState<T extends Quest>(localQuests: T[], remoteQuests: Quest[]): T[] {
  const remoteById = new Map(remoteQuests.map((quest) => [quest.id, quest]));
  return sanitizeGroupQuests(
    localQuests.map((quest) => {
      const remote = remoteById.get(quest.id);
      if (!remote) return quest;
      return {
        ...quest,
        completed: Boolean(quest.completed || remote.completed),
        progressCount: Math.max(quest.progressCount ?? 0, remote.progressCount ?? 0),
      };
    }),
  );
}

/** 그룹 퀘스트 탭 표시 순서 (고정) */
export function getGroupQuestSortOrder(
  quest: Pick<Quest, 'isStationQuest' | 'questKind' | 'targetCount'>,
): number {
  if (quest.isStationQuest) return 0;
  if (quest.questKind === 'photo_reviews') return 10;
  if (quest.questKind === 'recommended_visits') return 20 + (quest.targetCount ?? 0);
  return 99;
}

export function sortGroupQuests<T extends Quest>(quests: T[]): T[] {
  return [...quests].sort((a, b) => {
    const order = getGroupQuestSortOrder(a) - getGroupQuestSortOrder(b);
    if (order !== 0) return order;
    return a.title.localeCompare(b.title, 'ko');
  });
}
