import { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Group, GroupMember } from '@tingting/shared';
import { FREE_GROUP_MEMBER_COUNT, getGroupMemberInviteCost } from '@tingting/shared';
import { formatPhone } from '@/lib/phone';
import { api } from '@/lib/api';
import { useLocale } from '@/hooks/useLocale';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';

interface Props {
  group: Group;
  isOwner: boolean;
  currentUserId?: string;
  onUpdated: () => void;
  onLeft: () => void;
}

function MemberCard({
  member,
  canKick,
  onKick,
}: {
  member: GroupMember;
  canKick: boolean;
  onKick: () => void;
}) {
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
      <Text style={styles.name} numberOfLines={2}>
        {member.displayName}
      </Text>
      {member.phone ? <Text style={styles.phone}>{formatPhone(member.phone)}</Text> : null}
      {member.isOwner ? <Text style={styles.badge}>{t('group.owner')}</Text> : null}
      {canKick && !member.isOwner ? (
        <Pressable style={styles.kickBtn} onPress={onKick}>
          <Ionicons name="remove-circle" size={18} color={theme.colors.error ?? '#f87171'} />
          <Text style={styles.kickText}>{t('group.kick')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function GroupMembersTab({ group, isOwner, currentUserId, onUpdated, onLeft }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const members = group.members ?? [];
  const inviteCost = getGroupMemberInviteCost(members.length);
  const slotCount = Math.max(FREE_GROUP_MEMBER_COUNT, members.length + (isOwner ? 1 : 0));

  const confirmKick = (member: GroupMember) => {
    Alert.alert(t('group.kickTitle'), t('group.kickMessage', { name: member.displayName }), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('group.kick'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeGroupMember(group.id, member.id);
            onUpdated();
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
          }
        },
      },
    ]);
  };

  const confirmLeave = () => {
    Alert.alert(t('group.leaveTitle'), t('group.leaveMessage'), [
      { text: t('header.cancel'), style: 'cancel' },
      {
        text: t('group.leave'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.leaveGroup(group.id);
            onLeft();
            router.back();
          } catch (e: unknown) {
            Alert.alert(t('common.error'), e instanceof Error ? e.message : t('group.failed'));
          }
        },
      },
    ]);
  };

  const slots: Array<{ type: 'member' | 'invite' | 'empty'; member?: GroupMember }> = [];
  for (let i = 0; i < slotCount; i++) {
    if (i < members.length) slots.push({ type: 'member', member: members[i] });
    else if (i === members.length && isOwner) slots.push({ type: 'invite' });
    else slots.push({ type: 'empty' });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('group.membersTitle')}</Text>
      <View style={styles.grid}>
        {slots.map((slot, i) => {
          if (slot.type === 'member' && slot.member) {
            return (
              <MemberCard
                key={slot.member.id}
                member={slot.member}
                canKick={isOwner && slot.member.id !== currentUserId}
                onKick={() => confirmKick(slot.member!)}
              />
            );
          }
          if (slot.type === 'invite') {
            return (
              <Pressable key="invite" style={[styles.card, styles.inviteCard]} onPress={() => setInviteOpen(true)}>
                <Ionicons name="person-add-outline" size={28} color={theme.colors.primaryLight} />
                <Text style={styles.inviteLabel}>{t('group.invite')}</Text>
                {inviteCost > 0 ? (
                  <Text style={styles.inviteCost}>✦ {inviteCost}</Text>
                ) : (
                  <Text style={styles.inviteFree}>{t('common.free')}</Text>
                )}
              </Pressable>
            );
          }
          return (
            <View key={`empty-${i}`} style={[styles.card, styles.emptyCard]}>
              <Ionicons name="ellipse-outline" size={24} color={theme.colors.surfaceLight} />
              <Text style={styles.emptyLabel}>{t('group.emptySlot')}</Text>
            </View>
          );
        })}
      </View>

      {!isOwner ? (
        <PremiumButton title={t('group.leave')} onPress={confirmLeave} />
      ) : null}

      <InviteMemberModal
        visible={inviteOpen}
        groupId={group.id}
        currentMemberCount={members.length}
        onClose={() => setInviteOpen(false)}
        onInvited={onUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
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
    minHeight: 130,
    justifyContent: 'center',
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: theme.colors.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
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
  kickBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  kickText: { color: '#f87171', fontSize: 11, fontWeight: '600' },
  inviteCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  inviteLabel: { color: theme.colors.primaryLight, fontSize: 13, fontWeight: '600' },
  inviteCost: { color: theme.colors.star, fontSize: 12, fontWeight: '800' },
  inviteFree: { color: theme.colors.success, fontSize: 12, fontWeight: '700' },
  emptyCard: { opacity: 0.45, borderStyle: 'dashed' },
  emptyLabel: { color: theme.colors.textMuted, fontSize: 11 },
});
