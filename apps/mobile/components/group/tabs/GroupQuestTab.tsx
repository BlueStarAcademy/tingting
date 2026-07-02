import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Quest } from '@tingting/shared';
import {
  GROUP_STATION_QUEST_GALLERY_REWARD,
  GROUP_STATION_QUEST_SKIP_PRICE_KRW,
} from '@tingting/shared';
import { PremiumButton } from '@/components/PremiumButton';
import { api } from '@/lib/api';
import { getCurrentCoords } from '@/lib/location';
import { useLocale } from '@/hooks/useLocale';
import { purchaseGalleryQuestSkip, GALLERY_QUEST_SKIP_PRODUCT } from '@/lib/monetization';
import { theme } from '@/constants/theme';

interface Props {
  groupId: string;
  regionCode: string;
  quests: Quest[];
  onUpdated: () => void;
}

function QuestReward({ quest }: { quest: Quest }) {
  const { t } = useLocale();
  if (quest.rewardType === 'gallery_slots') {
    return (
      <View style={styles.rewardRow}>
        <Ionicons name="images-outline" size={16} color={theme.colors.primaryLight} />
        <Text style={styles.galleryReward}>
          {t('group.stationQuestReward', {
            count: quest.rewardGallerySlots ?? GROUP_STATION_QUEST_GALLERY_REWARD,
          })}
        </Text>
      </View>
    );
  }
  return <Text style={styles.starReward}>✦ {quest.rewardStars}</Text>;
}

export function GroupQuestTab({ groupId, regionCode, quests, onUpdated }: Props) {
  const { t } = useLocale();

  const displayQuests = quests.filter(
    (q) => q.isStationQuest && q.regionCode === regionCode
  );

  const verify = async (quest: Quest) => {
    try {
      const coords = await getCurrentCoords();
      const result = await api.completeGroupQuest(groupId, quest.id, coords.lat, coords.lng);
      Alert.alert(
        t('group.stationQuestCompleteTitle'),
        t('group.stationQuestCompleteMessage', { count: result.rewardGallerySlots })
      );
      onUpdated();
    } catch (e: unknown) {
      Alert.alert(t('quest.failed'), e instanceof Error ? e.message : t('auth.unknownError'));
    }
  };

  const confirmSkipPurchase = (quest: Quest) => {
    Alert.alert(
      t('group.stationQuestSkipTitle'),
      t('group.stationQuestSkipConfirm', {
        price: GROUP_STATION_QUEST_SKIP_PRICE_KRW.toLocaleString('ko-KR'),
        count: quest.rewardGallerySlots ?? GROUP_STATION_QUEST_GALLERY_REWARD,
      }),
      [
        { text: t('header.cancel'), style: 'cancel' },
        {
          text: GALLERY_QUEST_SKIP_PRODUCT.priceLabel,
          onPress: () => void purchaseSkip(quest),
        },
      ]
    );
  };

  const purchaseSkip = async (quest: Quest) => {
    try {
      const purchase = await purchaseGalleryQuestSkip();
      if (!purchase.success) {
        Alert.alert(t('common.alert'), purchase.message);
        return;
      }
      const result = await api.skipGroupStationQuestPurchase(groupId, quest.id);
      Alert.alert(
        t('group.stationQuestCompleteTitle'),
        t('group.stationQuestCompleteMessage', { count: result.rewardGallerySlots })
      );
      onUpdated();
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sub}>{t('group.questSub')}</Text>
      {displayQuests.length === 0 ? (
        <Text style={styles.empty}>{t('group.questEmpty')}</Text>
      ) : (
        <>
          {displayQuests.map((q, index) => (
            <View
              key={q.id}
              style={[styles.card, index === 0 && !q.completed ? styles.featuredCard : null]}
            >
              {q.isStationQuest ? (
                <View style={styles.badgeRow}>
                  <Ionicons name="train-outline" size={14} color={theme.colors.primaryLight} />
                  <Text style={styles.badge}>{t('group.stationQuestBadge')}</Text>
                </View>
              ) : null}
              <Text style={styles.name}>{q.title}</Text>
              <Text style={styles.desc}>{q.description}</Text>
              <View style={styles.footer}>
                <QuestReward quest={q} />
                {q.completed ? (
                  <Text style={styles.done}>
                    {t('group.stationQuestCompleted', {
                      count: q.rewardGallerySlots ?? GROUP_STATION_QUEST_GALLERY_REWARD,
                    })}
                  </Text>
                ) : (
                  <Text style={styles.pending}>{t('group.questPending')}</Text>
                )}
              </View>
              {!q.completed ? (
                <View style={styles.actions}>
                  <PremiumButton title={t('group.stationQuestVerify')} onPress={() => verify(q)} />
                  <PremiumButton
                    title={t('group.stationQuestSkip', {
                      price: GROUP_STATION_QUEST_SKIP_PRICE_KRW.toLocaleString('ko-KR'),
                    })}
                    variant="outline"
                    onPress={() => confirmSkipPurchase(q)}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  sub: { color: theme.colors.textMuted, fontSize: 13, marginBottom: theme.spacing.xs },
  empty: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.tint.medium,
  },
  featuredCard: {
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badge: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  desc: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  galleryReward: { color: theme.colors.primaryLight, fontWeight: '800', fontSize: 14 },
  starReward: { color: theme.colors.star, fontWeight: '800', fontSize: 14 },
  done: { color: theme.colors.success, fontWeight: '700', fontSize: 12 },
  pending: { color: theme.colors.primaryLight, fontWeight: '600', fontSize: 12 },
  actions: { gap: theme.spacing.sm, marginTop: theme.spacing.sm },
});
