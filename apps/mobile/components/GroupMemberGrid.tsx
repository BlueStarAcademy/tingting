import { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Group, GroupMember } from '@tingting/shared';
import { FREE_GROUP_MEMBER_COUNT, getGroupMemberInviteCost } from '@tingting/shared';
import { formatPhone } from '@/lib/phone';
import { useLocale } from '@/hooks/useLocale';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { theme } from '@/constants/theme';

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

function InviteCard({ cost, onPress }: { cost: number; onPress: () => void }) {
  const { t } = useLocale();
  return (
    <Pressable style={[styles.card, styles.inviteCard]} onPress={onPress}>
      <Ionicons name="person-add-outline" size={28} color={theme.colors.primaryLight} />
      <Text style={styles.inviteLabel}>{t('group.invite')}</Text>
      {cost > 0 ? (
        <Text style={styles.inviteCost}>✦ {cost}</Text>
      ) : (
        <Text style={styles.inviteFree}>{t('common.free')}</Text>
      )}
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
  const memberCount = members.length;
  const inviteCost = getGroupMemberInviteCost(memberCount);

  const slotCount = Math.max(FREE_GROUP_MEMBER_COUNT, memberCount + (isOwner ? 1 : 0));
  const slots: Array<{ type: 'member' | 'invite' | 'empty'; member?: GroupMember }> = [];

  for (let i = 0; i < slotCount; i++) {
    if (i < memberCount) {
      slots.push({ type: 'member', member: members[i] });
    } else if (i === memberCount && isOwner) {
      slots.push({ type: 'invite' });
    } else {
      slots.push({ type: 'empty' });
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('group.membersTitle')}</Text>
        <Text style={styles.count}>
          {memberCount}{t('common.members')}
        </Text>
      </View>
      <View style={styles.grid}>
        {slots.map((slot, i) => {
          if (slot.type === 'member' && slot.member) {
            return <MemberCard key={slot.member.id} member={slot.member} />;
          }
          if (slot.type === 'invite') {
            return <InviteCard key="invite" cost={inviteCost} onPress={() => setInviteOpen(true)} />;
          }
          return <EmptySlotCard key={`empty-${i}`} />;
        })}
      </View>
      <InviteMemberModal
        visible={inviteOpen}
        groupId={group.id}
        currentMemberCount={memberCount}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
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
    minHeight: 120,
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
  emptyLabel: { color: theme.colors.textMuted, fontSize: 11 },
});
