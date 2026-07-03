import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Quest } from '@tingting/shared';
import {
  GROUP_STATION_QUEST_GALLERY_REWARD,
  getRegion,
} from '@tingting/shared';
import { api } from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';
import { useLocale } from '@/hooks/useLocale';
import { theme } from '@/constants/theme';

interface Props {
  groupId: string;
  regionCode: string;
  quests: Quest[];
  onUpdated: () => void;
}

export function GroupQuestTab({ groupId, regionCode, quests, onUpdated }: Props) {
  const { t } = useLocale();

  const displayQuests = quests.filter(
    (q) => q.regionCode === regionCode
  );

  const verify = async (quest: Quest) => {
    try {
      const coords = await getCurrentCoords();
      const result = await api.completeGroupQuest(groupId, quest.id, coords.lat, coords.lng);
      if (result.rewardStars) {
        Alert.alert(
          '퀘스트 완료!',
          `✦ ${result.rewardStars} 스타를 획득했습니다!`
        );
      } else {
        Alert.alert(
          t('group.stationQuestCompleteTitle'),
          t('group.stationQuestCompleteMessage', { count: result.rewardGallerySlots })
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

  const getQuestMethod = (q: Quest) => {
    if (q.isStationQuest && q.regionCode) {
      const name = getRegion(q.regionCode)?.name ?? q.regionCode;
      return `${name} 내에서 GPS 인증하기`;
    }
    return q.description;
  };

  return (
    <View style={styles.wrap}>
      {displayQuests.length === 0 ? (
        <Text style={styles.empty}>{t('group.questEmpty')}</Text>
      ) : (
        displayQuests.map((q) => {
          const completed = q.completed;
          const isGallery = q.rewardType === 'gallery_slots';
          return (
            <View key={q.id} style={[styles.card, completed && styles.cardCompleted]}>
              {/* Row 1: title / method */}
              <View style={styles.row1}>
                <Text style={styles.title} numberOfLines={1}>{getQuestTitle(q)}</Text>
                <Text style={styles.method} numberOfLines={1}>{getQuestMethod(q)}</Text>
              </View>
              {/* Row 2: reward / buttons */}
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
                    <Text style={styles.starRewardText}>✦ {q.rewardStars}</Text>
                  </View>
                )}
                {completed ? (
                  <Text style={styles.doneLabel}>{t('group.questCompleteLabel')}</Text>
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
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: theme.colors.text, fontSize: 13, fontWeight: '800', flexShrink: 0 },
  method: { color: theme.colors.textMuted, fontSize: 11, flex: 1, textAlign: 'right' },
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
  starRewardText: { color: theme.colors.star, fontSize: 11, fontWeight: '800' },
  doneLabel: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
  btnRow: { flexDirection: 'row', gap: 6 },
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
