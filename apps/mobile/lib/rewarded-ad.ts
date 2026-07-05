import { Alert, Platform } from 'react-native';

export type AdPlacement =
  | 'shop_daily_stars'
  | 'minigame_reroll'
  | 'minigame_double'
  | 'minigame_continue'
  | 'minigame_replay_reward'
  | 'minigame_cap_extend'
  | 'steps_roulette_double'
  | 'bet_extra'
  | 'bet_claim_bonus'
  | 'editor_unlock_1h'
  | 'quest_bonus'
  | 'visit_bonus'
  | 'review_bonus';

const PLACEMENT_MESSAGES: Record<AdPlacement, { title: string; message: string; confirm: string }> = {
  shop_daily_stars: { title: '광고 시청', message: '광고를 시청하면 무료 스타를 받을 수 있습니다.', confirm: '광고 보기' },
  minigame_reroll: { title: '광고 시청', message: '광고를 시청하면 보상을 다시 뽑을 수 있습니다.', confirm: '광고 보기' },
  minigame_double: { title: '광고 시청', message: '광고를 시청하면 보상을 2배로 받을 수 있습니다.', confirm: '광고 보기' },
  minigame_continue: { title: '광고 시청', message: '광고를 시청하면 이어서 도전할 수 있습니다.', confirm: '광고 보기' },
  minigame_replay_reward: { title: '광고 시청', message: '광고를 시청하면 보상을 다시 받을 수 있습니다.', confirm: '광고 보기' },
  minigame_cap_extend: { title: '광고 시청', message: '광고를 시청하면 오늘 획득 한도를 10 늘릴 수 있습니다.', confirm: '광고 보기' },
  steps_roulette_double: { title: '광고 시청', message: '광고를 시청하면 룰렛 보상을 2배로 받을 수 있습니다.', confirm: '광고 보기' },
  bet_extra: { title: '광고 시청', message: '광고를 시청하면 한 번 더 예측할 수 있습니다.', confirm: '광고 보기' },
  bet_claim_bonus: { title: '광고 시청', message: '광고를 시청하면 수령액의 50%를 추가로 받을 수 있습니다.', confirm: '광고 보기' },
  editor_unlock_1h: { title: '광고 시청', message: '광고를 시청하면 1시간 동안 사용할 수 있습니다.', confirm: '광고 보기' },
  quest_bonus: { title: '광고 시청', message: '광고를 시청하면 보너스 스타를 받을 수 있습니다.', confirm: '광고 보기' },
  visit_bonus: { title: '광고 시청', message: '광고를 시청하면 방문 보너스 스타를 받을 수 있습니다.', confirm: '광고 보기' },
  review_bonus: { title: '광고 시청', message: '광고를 시청하면 리뷰 보너스 스타를 받을 수 있습니다.', confirm: '광고 보기' },
};

/**
 * Rewarded ad gate. Replace Alert stub with AdMob SDK in production native builds.
 */
export function showRewardedAd(placement: AdPlacement): Promise<boolean> {
  const copy = PLACEMENT_MESSAGES[placement];
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      setTimeout(() => resolve(true), 800);
      return;
    }
    Alert.alert(
      copy.title,
      copy.message,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        {
          text: copy.confirm,
          onPress: () => {
            setTimeout(() => resolve(true), 1200);
          },
        },
      ],
      { cancelable: false },
    );
  });
}

export async function watchAdForReward(placement: AdPlacement, adFree: boolean): Promise<boolean> {
  if (adFree) return true;
  return showRewardedAd(placement);
}
