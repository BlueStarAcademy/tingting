import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Group, GroupMember, UserProfile } from '@tingting/shared';
import {
  FREE_GROUP_MEMBER_COUNT,
  MAX_GROUP_MEMBER_SLOTS,
  getGroupMemberSlotUnlockCost,
} from '@tingting/shared';
import { formatPhone } from '@/lib/phone';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useLocale } from '@/hooks/useLocale';
import { InviteMemberModal } from '@/components/InviteMemberModal';
import { ProfileViewModal } from '@/components/ProfileViewModal';
import { GroupSlotPurchaseModal } from '@/components/GroupSlotPurchaseModal';
import { PremiumButton } from '@/components/PremiumButton';
import { theme } from '@/constants/theme';

const FULL_COLUMNS = 3;
/** 4번째 슬롯이 살짝 보여 가로 스크롤 가능함을 암시 */
const PEEK_RATIO = 0.16;
const CARD_GAP = theme.spacing.sm;
const SECTION_HORIZONTAL_PADDING = theme.spacing.lg * 2;
const CARD_MIN_HEIGHT = 120;

interface Props {
  group: Group;
  isOwner: boolean;
  currentUserId?: string;
  onUpdated: () => void;
  onLeft: () => void;
}

function memberToProfile(member: GroupMember): UserProfile {
  return {
    id: member.id,
    email: '',
    displayName: member.displayName,
    stars: 0,
    onboardingComplete: true,
    visitedRegions: [],
    photoUri: member.photoUri,
    phone: member.phone,
  };
}

function MemberCard({
  member,
  canKick,
  onKick,
  onPress,
  cardWidth,
}: {
  member: GroupMember;
  canKick: boolean;
  onKick: () => void;
  onPress: () => void;
  cardWidth: number;
}) {
  const { t } = useLocale();
  return (
    <Pressable style={[styles.card, { width: cardWidth }]} onPress={onPress}>
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={20} color={theme.colors.textMuted} />
        </View>
      )}
      <Text style={styles.name} numberOfLines={2}>
        {member.displayName}
      </Text>
      {member.phone ? <Text style={styles.phone} numberOfLines={1}>{formatPhone(member.phone)}</Text> : null}
      {member.isOwner ? <Text style={styles.badge}>{t('group.owner')}</Text> : null}
      {canKick && !member.isOwner ? (
        <Pressable
          style={styles.kickBtn}
          onPress={(event) => {
            event.stopPropagation?.();
            onKick();
          }}
        >
          <Ionicons name="remove-circle" size={16} color={theme.colors.error ?? '#f87171'} />
          <Text style={styles.kickText}>{t('group.kick')}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function GroupMembersTab({ group, isOwner, currentUserId, onUpdated, onLeft }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const contentWidth = useContentWidth();
  const { profile: authProfile, refresh: refreshAuth } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewProfile, setViewProfile] = useState<UserProfile | null>(null);
  const [viewIsSelf, setViewIsSelf] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const members = useMemo(() => {
    const raw = group.members ?? [];
    return [...raw].sort((a, b) => {
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      return 0;
    });
  }, [group.members]);
  const unlocked = group.unlockedMemberSlots ?? FREE_GROUP_MEMBER_COUNT;
  const canInvite = isOwner && members.length < unlocked;
  const nextUnlockCost = getGroupMemberSlotUnlockCost(unlocked);
  const showPurchaseSlot = isOwner && unlocked < MAX_GROUP_MEMBER_SLOTS;

  const cardWidth = useMemo(() => {
    const visibleWidth = contentWidth - SECTION_HORIZONTAL_PADDING;
    const gapCount = FULL_COLUMNS;
    return (visibleWidth - CARD_GAP * gapCount) / (FULL_COLUMNS + PEEK_RATIO);
  }, [contentWidth]);

  const viewportWidth = useMemo(
    () => contentWidth - SECTION_HORIZONTAL_PADDING,
    [contentWidth]
  );

  const openMemberProfile = async (member: GroupMember) => {
    setProfileLoading(true);
    setProfileOpen(true);
    try {
      if (member.id === currentUserId && authProfile) {
        setViewProfile(authProfile);
        setViewIsSelf(true);
        return;
      }
      const fetched = await api.getUserProfile(member.id);
      setViewProfile(fetched ?? memberToProfile(member));
      setViewIsSelf(member.id === currentUserId);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setProfileOpen(false);
    setViewProfile(null);
    setViewIsSelf(false);
  };

  const handleProfileUpdated = async () => {
    await refreshAuth();
    onUpdated();
    if (currentUserId) {
      const updated = await api.getUserProfile(currentUserId);
      if (updated) setViewProfile(updated);
    }
  };

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

  const confirmUnlockSlot = () => {
    setPurchaseOpen(true);
  };

  const closePurchaseModal = () => {
    if (purchaseLoading) return;
    setPurchaseOpen(false);
  };

  const confirmPurchase = async () => {
    setPurchaseLoading(true);
    try {
      await api.unlockGroupMemberSlot(group.id);
      onUpdated();
      setPurchaseOpen(false);
    } catch (e: unknown) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('shop.insufficient'));
    } finally {
      setPurchaseLoading(false);
    }
  };

  const renderSlot = (slotIndex: number) => {
    if (slotIndex < unlocked) {
      const member = members[slotIndex];
      if (member) {
        return (
          <MemberCard
            key={member.id}
            member={member}
            cardWidth={cardWidth}
            canKick={isOwner && member.id !== currentUserId}
            onKick={() => confirmKick(member)}
            onPress={() => void openMemberProfile(member)}
          />
        );
      }
      if (isOwner) {
        return (
          <Pressable
            key={`invite-${slotIndex}`}
            style={[styles.card, styles.inviteCard, { width: cardWidth }]}
            onPress={() => canInvite && setInviteOpen(true)}
          >
            <Ionicons name="person-add-outline" size={24} color={theme.colors.primaryLight} />
            <Text style={styles.inviteLabel}>{t('group.invite')}</Text>
            <Text style={styles.inviteFree}>{t('common.free')}</Text>
          </Pressable>
        );
      }
      return (
        <View key={`empty-${slotIndex}`} style={[styles.card, styles.emptyCard, { width: cardWidth }]}>
          <Ionicons name="ellipse-outline" size={22} color={theme.colors.surfaceLight} />
          <Text style={styles.emptyLabel}>{t('group.emptySlot')}</Text>
        </View>
      );
    }

    if (slotIndex === unlocked && showPurchaseSlot) {
      return (
        <Pressable
          key={`purchase-${slotIndex}`}
          style={[styles.card, styles.lockedCard, { width: cardWidth }]}
          onPress={confirmUnlockSlot}
        >
          <Ionicons name="lock-closed" size={22} color={theme.colors.textMuted} />
          {nextUnlockCost > 0 ? (
            <Text style={styles.price}>✦ {nextUnlockCost}</Text>
          ) : (
            <Text style={styles.inviteFree}>{t('common.free')}</Text>
          )}
          <Text style={styles.lockedLabel}>{t('profile.unlockSlot')}</Text>
        </Pressable>
      );
    }

    return null;
  };

  const visibleSlotCount = Math.min(
    MAX_GROUP_MEMBER_SLOTS,
    unlocked + (showPurchaseSlot ? 1 : 0)
  );
  const slotIndices = Array.from({ length: visibleSlotCount }, (_, i) => i);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('group.membersTitle')}</Text>
      <View style={[styles.scrollViewport, { width: viewportWidth }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          nestedScrollEnabled
          decelerationRate="fast"
        >
          {slotIndices.map((slotIndex) => renderSlot(slotIndex))}
        </ScrollView>
      </View>

      {!isOwner ? (
        <PremiumButton title={t('group.leave')} onPress={confirmLeave} />
      ) : null}

      <GroupSlotPurchaseModal
        visible={purchaseOpen}
        cost={nextUnlockCost}
        loading={purchaseLoading}
        titleKey="group.memberSlotUnlockTitle"
        messageKey="group.memberSlotUnlockMessage"
        onClose={closePurchaseModal}
        onConfirm={confirmPurchase}
      />

      <InviteMemberModal
        visible={inviteOpen}
        groupId={group.id}
        onClose={() => setInviteOpen(false)}
        onInvited={onUpdated}
      />
      <ProfileViewModal
        visible={profileOpen}
        profile={viewProfile}
        loading={profileLoading}
        isSelf={viewIsSelf}
        onClose={closeProfile}
        onUpdated={handleProfileUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  scrollViewport: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
    paddingVertical: 2,
  },
  card: {
    height: CARD_MIN_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.tint.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: theme.colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  phone: { color: theme.colors.textMuted, fontSize: 10, textAlign: 'center' },
  badge: {
    color: theme.colors.primaryLight,
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: theme.colors.tint.medium,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  kickBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  kickText: { color: '#f87171', fontSize: 10, fontWeight: '600' },
  inviteCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.tint.soft,
  },
  inviteLabel: { color: theme.colors.primaryLight, fontSize: 12, fontWeight: '600' },
  inviteFree: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
  emptyCard: { opacity: 0.45, borderStyle: 'dashed' },
  emptyLabel: { color: theme.colors.textMuted, fontSize: 10, textAlign: 'center' },
  lockedCard: {
    borderStyle: 'dashed',
    borderColor: theme.colors.textMuted,
  },
  price: { color: theme.colors.star, fontSize: 12, fontWeight: '800' },
  lockedLabel: { color: theme.colors.textMuted, fontSize: 10, textAlign: 'center' },
});
