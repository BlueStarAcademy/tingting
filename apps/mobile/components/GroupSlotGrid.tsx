import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import type { Group, UserProfile } from '@tingting/shared';
import { getGroupSlotUnlockCost, MAX_GROUP_SLOTS } from '@tingting/shared';
import { GroupSlotPurchaseModal } from '@/components/GroupSlotPurchaseModal';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { api } from '@/lib/api';
import { cardSurface, sectionTitleStyle } from '@/lib/ui';
import { theme } from '@/constants/theme';

const COLS = 3;
const GAP = 8;

interface Props {
  profile: UserProfile;
  groups: Group[];
  onUpdated: () => void;
}

export function GroupSlotGrid({ profile, groups, onUpdated }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const contentWidth = useContentWidth();
  const horizontalPad = theme.spacing.lg * 2;
  const innerWidth = contentWidth - horizontalPad;
  const cellSize = Math.floor((innerWidth - GAP * (COLS - 1)) / COLS);
  const unlocked = profile.unlockedGroupSlots ?? 1;

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [pendingSlotIndex, setPendingSlotIndex] = useState<number | null>(null);
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [loading, setLoading] = useState(false);

  const groupBySlot = (index: number) =>
    groups.find((g) => (g.slotIndex ?? 0) === index);

  const openPurchaseModal = (index: number, cost: number) => {
    setPendingSlotIndex(index);
    setPurchaseCost(cost);
    setPurchaseOpen(true);
  };

  const closePurchaseModal = () => {
    if (loading) return;
    setPurchaseOpen(false);
    setPendingSlotIndex(null);
    setPurchaseCost(0);
  };

  const confirmPurchase = async () => {
    if (pendingSlotIndex === null) return;
    const slotIndex = pendingSlotIndex;
    setLoading(true);
    try {
      await api.unlockGroupSlot();
      onUpdated();
      closePurchaseModal();
      router.push(`/group/create?slot=${slotIndex}` as Href);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    } finally {
      setLoading(false);
    }
  };

  const handleSlotPress = (index: number) => {
    const isUnlocked = index < unlocked;
    const group = groupBySlot(index);

    if (group) {
      router.push(`/group/${group.id}` as Href);
      return;
    }

    if (!isUnlocked) {
      if (index === unlocked) {
        const cost = getGroupSlotUnlockCost(unlocked);
        openPurchaseModal(index, cost);
      } else {
        Alert.alert(t('common.alert'), t('profile.unlockPrevious'));
      }
      return;
    }

    router.push(`/group/create?slot=${index}` as Href);
  };

  const slots = Array.from({ length: MAX_GROUP_SLOTS }, (_, i) => i);

  return (
    <>
      <View style={styles.wrap}>
        <Text style={styles.title}>{t('home.groups')}</Text>
        <View style={[styles.grid, { width: innerWidth }]}>
          {slots.map((index) => {
            const isUnlocked = index < unlocked;
            const isNextUnlock = index === unlocked;
            const group = groupBySlot(index);
            const showPrice = !isUnlocked && isNextUnlock && index > 0;
            const cost = showPrice ? getGroupSlotUnlockCost(unlocked) : 0;

            return (
              <Pressable
                key={index}
                style={[styles.cell, { width: cellSize, height: cellSize * 1.1 }]}
                onPress={() => handleSlotPress(index)}
              >
                {isUnlocked && group ? (
                  <>
                    <Ionicons name="people" size={22} color={theme.colors.primaryLight} />
                    <Text style={styles.cellName} numberOfLines={2}>
                      {group.name}
                    </Text>
                    <Text style={styles.cellMeta}>{group.memberIds.length}{t('common.members')}</Text>
                  </>
                ) : isUnlocked ? (
                  <>
                    <Ionicons name="add-circle-outline" size={28} color={theme.colors.primaryLight} />
                    <Text style={styles.cellEmpty}>{index === 0 ? t('common.free') : t('profile.addGroup')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={24} color={theme.colors.textMuted} />
                    {showPrice ? (
                      <Text style={styles.price}>✦ {cost}</Text>
                    ) : (
                      <Text style={styles.locked}>{t('profile.locked')}</Text>
                    )}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <GroupSlotPurchaseModal
        visible={purchaseOpen}
        cost={purchaseCost}
        loading={loading}
        onClose={closePurchaseModal}
        onConfirm={confirmPurchase}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginBottom: theme.spacing.lg },
  title: { ...sectionTitleStyle(), marginBottom: theme.spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    alignSelf: 'center',
  },
  cell: {
    ...cardSurface(),
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 4,
  },
  cellName: { color: theme.colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  cellMeta: { color: theme.colors.textMuted, fontSize: 10 },
  cellEmpty: { color: theme.colors.primaryLight, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  price: { color: theme.colors.star, fontSize: 12, fontWeight: '800' },
  locked: { color: theme.colors.textMuted, fontSize: 10 },
});
