import { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Group, GroupMember } from '@tingting/shared';
import {
  FREE_GROUP_MEMBER_COUNT,
  MAX_GROUP_MEMBER_SLOTS,
  getGroupMemberSlotUnlockCost,
} from '@tingting/shared';
import { formatPhone } from '@/lib/phone';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { StarAmount } from '@/components/StarAmount';
import { theme } from '@/constants/theme';

const MAX_ROWS = 3;
const GRID_GAP = theme.spacing.sm;
const CARD_MIN_HEIGHT = 120;
const GRID_MAX_HEIGHT = MAX_ROWS * CARD_MIN_HEIGHT + GRID_GAP * (MAX_ROWS - 1);

interface Props {
  group: Group;
  isOwner: boolean;
  onUpdated: () => void;
}

function MemberCard({ member }: { member: GroupMember }) {
  const { t } = useLocale();
  return (
    <View style={styles.card}>
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={22} color={theme.colors.textMuted} />
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {member.displayName}
      </Text>
      {member.phone ? (
        <Text style={styles.phone}>{formatPhone(member.phone)}</Text>
      ) : null}
      {member.isOwner ? <Text style={styles.badge}>{t('group.owner')}</Text> : null}
    </View>
  );
}

function InviteCard({ onPress }: { onPress: () => void }) {
  const { t } = useLocale();
  return (
    <Pressable style={[styles.card, styles.inviteCard]} onPress={onPress}>
      <Ionicons name="person-add-outline" size={28} color={theme.colors.primaryLight} />
      <Text style={styles.inviteLabel}>{t('group.invite')}</Text>
      <Text style={styles.inviteFree}>{t('common.free')}</Text>
    </Pressable>
  );
}

function EmptySlotCard() {
  const { t } = useLocale();
  return (
    <View style={[styles.card, styles.emptyCard]}>
      <Ionicons name="ellipse-outline" size={24} color={theme.colors.surfaceLight} />
      <Text style={styles.emptyLabel}>{t('group.emptySlot')}</Text>
    </View>
  );
}

export function GroupMemberGrid({ group, isOwner, onUpdated }: Props) {
  const { t } = useLocale();
  const [inviteOpen, setInviteOpen] = useState(false);
  const members = group.members ?? [];
  const unlocked = group.unlockedMemberSlots ?? FREE_GROUP_MEMBER_COUNT;
  const canInvite = isOwner && members.length < unlocked;
  const nextUnlockCost = getGroupMemberSlotUnlockCost(unlocked);
  const showPurchaseSlot = isOwner && unlocked < MAX_GROUP_MEMBER_SLOTS;

  const confirmUnlockSlot = () => {
    Alert.alert(t('profile.unlockSlot'), t('profile.unlockSlotMessage', { cost: nextUnlockCost }), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('profile.unlock'),
        onPress: async () => {
          try {
            await api.unlockGroupMemberSlot(group.id);
            onUpdated();
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
          }
        },
      },
    ]);
  };

  const slots: Array<{ type: 'member' | 'invite' | 'empty'; member?: GroupMember }> = [];
  for (let i = 0; i < unlocked; i++) {
    if (i < members.length) slots.push({ type: 'member', member: members[i] });
    else if (isOwner) slots.push({ type: 'invite' });
    else slots.push({ type: 'empty' });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('group.membersTitle')}</Text>
        <Text style={styles.count}>
          {members.length}{t('common.members')}
        </Text>
      </View>
      <ScrollView
        style={[styles.gridScroll, { maxHeight: GRID_MAX_HEIGHT }]}
        contentContainerStyle={styles.grid}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {slots.map((slot, i) => {
          if (slot.type === 'member' && slot.member) {
            return <MemberCard key={slot.member.id} member={slot.member} />;
          }
          if (slot.type === 'invite') {
            return (
              <InviteCard
                key={`invite-${i}`}
                onPress={() => canInvite && setInviteOpen(true)}
              />
            );
          }
          return <EmptySlotCard key={`empty-${i}`} />;
        })}
        {showPurchaseSlot ? (
          <Pressable style={[styles.card, styles.lockedCard]} onPress={confirmUnlockSlot}>
            <Ionicons name="lock-closed" size={24} color={theme.colors.textMuted} />
            <StarAmount amount={nextUnlockCost} compact textStyle={styles.inviteCost} />
            <Text style={styles.emptyLabel}>{t('profile.unlockSlot')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <InviteMemberModal
        visible={inviteOpen}
        groupId={group.id}
        onClose={() => setInviteOpen(false)}
        onInvited={onUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  count: { color: theme.colors.primaryLight, fontSize: 14, fontWeight: '600' },
  gridScroll: { alignSelf: 'stretch' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
    minHeight: CARD_MIN_HEIGHT,
    justifyContent: 'center',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceLight },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: theme.colors.text, fontSize: 14, fontWeight: '700', maxWidth: '100%' },
  phone: { color: theme.colors.textMuted, fontSize: 11 },
  badge: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: theme.colors.tint.medium,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  inviteCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  inviteLabel: { color: theme.colors.primaryLight, fontSize: 13, fontWeight: '600' },
  inviteCost: { color: theme.colors.star, fontSize: 12, fontWeight: '800' },
  inviteFree: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
  emptyCard: {
    opacity: 0.45,
    borderStyle: 'dashed',
    borderColor: theme.colors.surfaceLight,
  },
  lockedCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.textMuted,
    opacity: 0.85,
  },
  emptyLabel: { color: theme.colors.textMuted, fontSize: 11 },
});
