import type {
  AdminUserSummary,
  AuthSession,
  CustomerInquiry,
  Group,
  GroupChatMessage,
  GroupSchedule,
  HomeDashboard,
  MailboxMessage,
  PedometerDayState,
  Place,
  PlaceRecommendation,
  Quest,
  RankingEntry,
  PublicExperiencePost,
  ShopItem,
  ShopSubscriptionPlanId,
  UserProfile,
  Visit,
  FeaturePass,
  FeaturePassTier,
} from '@tingting/shared';
import { getAuthRedirectUrl, getSupabase, isSupabaseConfigured } from './supabase';
import { httpApi, hasApiToken, isHttpApiConfigured } from './http-api';
import { localStore } from './local-store';
import type { MinigameId } from '@/lib/minigames/stages';
import type { MinigameBetState, MinigameBetTicket } from '@/lib/minigame-bets';
import { DEMO_EMAIL } from '@tingting/shared';

export { isSupabaseConfigured, isHttpApiConfigured };

/** HTTP API 모드에서 localStore 게임 상태가 세션/프로필을 읽을 수 있게 동기화 */
async function syncLocalAuthCache(profile?: UserProfile | null): Promise<void> {
  if (!isHttpApiConfigured()) return;
  const resolved = profile ?? (await httpApi.getProfile());
  if (!resolved) return;
  const session =
    (await httpApi.getSession()) ??
    ({
      userId: resolved.id,
      email: resolved.email,
      isDemo: resolved.email === DEMO_EMAIL,
    } satisfies AuthSession);
  await localStore.cacheAuthState(session, resolved);
}

export const api = {
  async getSession(): Promise<AuthSession | null> {
    if (isSupabaseConfigured) {
      const sb = getSupabase()!;
      const { data } = await sb.auth.getSession();
      if (data.session) {
        if (isHttpApiConfigured()) {
          await httpApi.ensureApiAuth();
        }
        return { userId: data.session.user.id, email: data.session.user.email ?? '', isDemo: false };
      }
    }
    if (isHttpApiConfigured()) {
      const session = await httpApi.getSession();
      if (session) return session;
      const cached = await localStore.getSession();
      if (cached && (await hasApiToken())) return cached;
      return null;
    }
    return localStore.getSession();
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    if (isSupabaseConfigured) {
      const sb = getSupabase()!;
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (isHttpApiConfigured()) {
        await httpApi.syncSupabaseAuth();
      }
      return { userId: data.user!.id, email: data.user!.email ?? '', isDemo: false };
    }
    if (isHttpApiConfigured()) {
      const session = await httpApi.signIn(email, password);
      await syncLocalAuthCache(await httpApi.getProfile());
      return session;
    }
    return localStore.signIn(email, password);
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthSession> {
    if (isSupabaseConfigured) {
      const sb = getSupabase()!;
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl('auth-callback'),
          data: displayName ? { display_name: displayName } : undefined,
        },
      });
      if (error) throw error;
      if (isHttpApiConfigured() && data.session) {
        await httpApi.syncSupabaseAuth();
      }
      return { userId: data.user?.id ?? '', email: data.user?.email ?? email, isDemo: false };
    }
    if (isHttpApiConfigured()) {
      const session = await httpApi.signUp(email, password, displayName);
      await syncLocalAuthCache(await httpApi.getProfile());
      return session;
    }
    return localStore.signUp(email, password, displayName);
  },

  async resendEmailVerification(email: string): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    const { error } = await getSupabase()!.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getAuthRedirectUrl('auth-callback') },
    });
    if (error) throw error;
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    const { error } = await getSupabase()!.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('reset-password'),
    });
    if (error) throw error;
  },

  async updatePassword(password: string): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    const { error } = await getSupabase()!.auth.updateUser({ password });
    if (error) throw error;
  },

  async signInDemo(): Promise<AuthSession> {
    if (isHttpApiConfigured()) {
      const session = await httpApi.signInDemo();
      await syncLocalAuthCache(await httpApi.getProfile());
      return session;
    }
    return localStore.signInDemo();
  },

  async signInWithKakao(accessToken: string): Promise<AuthSession> {
    if (!isHttpApiConfigured()) {
      throw new Error('Kakao login requires EXPO_PUBLIC_API_URL');
    }
    const session = await httpApi.signInWithKakao(accessToken);
    await syncLocalAuthCache(await httpApi.getProfile());
    return session;
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) await getSupabase()!.auth.signOut();
    if (isHttpApiConfigured()) await httpApi.signOut();
    if (!isSupabaseConfigured && !isHttpApiConfigured()) await localStore.signOut();
  },

  async getProfile(): Promise<UserProfile | null> {
    if (isHttpApiConfigured()) {
      const profile = await httpApi.getProfile();
      if (profile) {
        await syncLocalAuthCache(profile);
        return profile;
      }
      if (await hasApiToken()) {
        const cached = await localStore.getProfile();
        if (cached) return cached;
      }
      return null;
    }
    if (!isSupabaseConfigured) return localStore.getProfile();
    const sb = getSupabase()!;
    const session = await this.getSession();
    if (!session) return null;
    const { data } = await sb.from('profiles').select('*').eq('id', session.userId).single();
    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      stars: data.stars,
      onboardingComplete: data.onboarding_complete,
      visitedRegions: data.visited_regions ?? [],
    };
  },

  async updateProfile(
    patch: Partial<Pick<UserProfile, 'photoUri' | 'birthday' | 'profilePublic'>>
  ): Promise<UserProfile> {
    if (isHttpApiConfigured()) {
      try {
        return await httpApi.updateProfile(patch);
      } catch {
        return localStore.updateProfile(patch);
      }
    }
    return localStore.updateProfile(patch);
  },

  async changeDisplayName(displayName: string): Promise<{ profile: UserProfile; cost: number }> {
    if (isHttpApiConfigured()) return httpApi.changeDisplayName(displayName);
    if (!isSupabaseConfigured) return localStore.changeDisplayName(displayName);
    return localStore.changeDisplayName(displayName);
  },

  async unlockGroupSlot(): Promise<UserProfile> {
    if (isHttpApiConfigured()) return httpApi.unlockGroupSlot();
    if (!isSupabaseConfigured) return localStore.unlockGroupSlot();
    return localStore.unlockGroupSlot();
  },

  async completeMbtiTest(mbti: string): Promise<{ profile: UserProfile; reward: number }> {
    if (isHttpApiConfigured()) return httpApi.completeMbtiTest(mbti);
    if (!isSupabaseConfigured) return localStore.completeMbtiTest(mbti);
    return localStore.completeMbtiTest(mbti);
  },

  async retakeMbtiTest(mbti: string): Promise<UserProfile> {
    if (isHttpApiConfigured()) return httpApi.retakeMbtiTest(mbti);
    if (!isSupabaseConfigured) return localStore.retakeMbtiTest(mbti);
    return localStore.retakeMbtiTest(mbti);
  },

  async completeOnboarding(displayName: string): Promise<UserProfile> {
    if (isHttpApiConfigured()) return httpApi.completeOnboarding(displayName);
    if (!isSupabaseConfigured) return localStore.completeOnboarding(displayName);
    const sb = getSupabase()!;
    const session = await this.getSession();
    await sb.from('profiles').update({ display_name: displayName, onboarding_complete: true }).eq('id', session!.userId);
    return (await this.getProfile())!;
  },

  async getHomeDashboard(): Promise<HomeDashboard> {
    if (isHttpApiConfigured()) return httpApi.getHomeDashboard();
    if (!isSupabaseConfigured) return localStore.getHomeDashboard();
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('get_home_dashboard');
    if (error) throw error;
    const p = data.profile;
    return {
      profile: {
        id: p.id,
        email: p.email,
        displayName: p.display_name,
        stars: p.stars,
        onboardingComplete: p.onboarding_complete,
        visitedRegions: p.visited_regions ?? [],
      },
      groups: (data.groups ?? []).map(mapGroup),
      recentVisits: (data.recentVisits ?? []).map(mapVisit),
      regionProgress: [],
      totalRegions: data.totalRegions ?? 17,
      visitedCount: data.visitedCount ?? 0,
    };
  },

  async getGroups(): Promise<Group[]> {
    if (isHttpApiConfigured()) return httpApi.getGroups();
    if (!isSupabaseConfigured) return localStore.getGroups();
    const dash = await this.getHomeDashboard();
    return dash.groups;
  },

  async createGroup(name: string, description?: string, slotIndex?: number): Promise<{ group: Group; cost: number }> {
    if (isHttpApiConfigured()) return httpApi.createGroup(name, description, slotIndex);
    if (!isSupabaseConfigured) return localStore.createGroup(name, description, slotIndex);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('create_group', { p_name: name, p_description: description });
    if (error) throw error;
    const group = await httpApi.getGroup(data.id);
    return { group: group!, cost: data.cost };
  },

  async getGroup(id: string): Promise<Group | null> {
    if (isHttpApiConfigured()) return httpApi.getGroup(id);
    if (!isSupabaseConfigured) return localStore.getGroup(id);
    return localStore.getGroup(id);
  },

  async unlockGroupMemberSlot(groupId: string): Promise<{ group: Group; cost: number }> {
    if (isHttpApiConfigured()) return httpApi.unlockGroupMemberSlot(groupId);
    if (!isSupabaseConfigured) return localStore.unlockGroupMemberSlot(groupId);
    return localStore.unlockGroupMemberSlot(groupId);
  },

  async unlockGroupGallerySlots(groupId: string): Promise<{ group: Group; cost: number }> {
    if (isHttpApiConfigured()) return httpApi.unlockGroupGallerySlots(groupId);
    if (!isSupabaseConfigured) return localStore.unlockGroupGallerySlots(groupId);
    return localStore.unlockGroupGallerySlots(groupId);
  },

  async inviteGroupMember(groupId: string, phone: string): Promise<{ cost: number }> {
    if (isHttpApiConfigured()) return httpApi.inviteGroupMember(groupId, phone);
    if (!isSupabaseConfigured) return localStore.inviteGroupMember(groupId, phone);
    return localStore.inviteGroupMember(groupId, phone);
  },

  async searchUserByPhone(phone: string) {
    if (isHttpApiConfigured()) return httpApi.searchUserByPhone(phone);
    return localStore.searchUserByPhone(phone);
  },

  async sendPhoneVerificationCode(phone: string): Promise<void> {
    if (isHttpApiConfigured()) return httpApi.sendPhoneVerificationCode(phone);
    return localStore.sendPhoneVerificationCode(phone);
  },

  async verifyPhone(phone: string, code: string): Promise<UserProfile> {
    if (isHttpApiConfigured()) return httpApi.verifyPhone(phone, code);
    return localStore.verifyPhone(phone, code);
  },

  async updatePhoneInviteSettings(blockPhoneInvite: boolean): Promise<UserProfile> {
    if (isHttpApiConfigured()) return httpApi.updatePhoneInviteSettings(blockPhoneInvite);
    return localStore.updatePhoneInviteSettings(blockPhoneInvite);
  },

  async getMailboxMessages(): Promise<MailboxMessage[]> {
    if (isHttpApiConfigured()) return httpApi.getMailboxMessages();
    return localStore.getMailboxMessages();
  },

  async getUnreadMailboxCount(): Promise<number> {
    if (isHttpApiConfigured()) return httpApi.getUnreadMailboxCount();
    return localStore.getUnreadMailboxCount();
  },

  async markMailboxMessageRead(messageId: string): Promise<void> {
    if (isHttpApiConfigured()) return httpApi.markMailboxMessageRead(messageId);
    return localStore.markMailboxMessageRead(messageId);
  },

  async claimMailboxStarReward(messageId: string): Promise<{ reward: number; stars: number }> {
    await syncLocalAuthCache();
    const result = await localStore.claimMailboxStarReward(messageId);
    if (result.reward > 0) {
      const stars = await this.earnStars(
        result.reward,
        `subscription_mail:${messageId}`,
      );
      return { reward: result.reward, stars };
    }
    return result;
  },

  async getSubscriptionState() {
    return localStore.getSubscriptionState();
  },

  async purchaseSubscription(planId: ShopSubscriptionPlanId) {
    return localStore.purchaseSubscription(planId);
  },

  async syncSubscriptionStarMails() {
    return localStore.syncSubscriptionStarMails();
  },

  async markAllMailboxRead(): Promise<number> {
    if (isHttpApiConfigured()) return httpApi.markAllMailboxRead();
    return localStore.markAllMailboxRead();
  },

  async deleteMailboxMessage(messageId: string): Promise<void> {
    if (isHttpApiConfigured()) return httpApi.deleteMailboxMessage(messageId);
    return localStore.deleteMailboxMessage(messageId);
  },

  async deleteAllMailboxMessages(): Promise<number> {
    if (isHttpApiConfigured()) return httpApi.deleteAllMailboxMessages();
    return localStore.deleteAllMailboxMessages();
  },

  async respondToGroupInvite(messageId: string, accept: boolean): Promise<Group | null> {
    if (isHttpApiConfigured()) return httpApi.respondToGroupInvite(messageId, accept);
    return localStore.respondToGroupInvite(messageId, accept);
  },

  async updateGroup(groupId: string, patch: { name?: string; description?: string }): Promise<Group> {
    if (isHttpApiConfigured()) return httpApi.updateGroup(groupId, patch);
    return localStore.updateGroup(groupId, patch);
  },

  async setGroupSharedGalleryUploader(groupId: string, memberId: string | null): Promise<Group> {
    if (isHttpApiConfigured()) return httpApi.setGroupSharedGalleryUploader(groupId, memberId);
    return localStore.setGroupSharedGalleryUploader(groupId, memberId);
  },

  async removeGroupMember(groupId: string, memberId: string): Promise<Group> {
    if (isHttpApiConfigured()) return httpApi.removeGroupMember(groupId, memberId);
    return localStore.removeGroupMember(groupId, memberId);
  },

  async leaveGroup(groupId: string): Promise<void> {
    if (isHttpApiConfigured()) return httpApi.leaveGroup(groupId);
    return localStore.leaveGroup(groupId);
  },

  async getGroupChatMessages(groupId: string): Promise<GroupChatMessage[]> {
    if (isHttpApiConfigured()) return httpApi.getGroupChatMessages(groupId);
    return localStore.getGroupChatMessages(groupId);
  },

  async sendGroupChatMessage(groupId: string, text: string): Promise<GroupChatMessage> {
    if (isHttpApiConfigured()) return httpApi.sendGroupChatMessage(groupId, text);
    return localStore.sendGroupChatMessage(groupId, text);
  },

  async deleteGroupChatMessage(groupId: string, messageId: string): Promise<void> {
    if (isHttpApiConfigured()) return httpApi.deleteGroupChatMessage(groupId, messageId);
    return localStore.deleteGroupChatMessage(groupId, messageId);
  },

  async getGroupVisits(groupId: string): Promise<Visit[]> {
    if (isHttpApiConfigured()) return httpApi.getGroupVisits(groupId);
    if (!isSupabaseConfigured) return localStore.getGroupVisits(groupId);
    const visits = await this.getVisits();
    return visits.filter((v) => v.groupId === groupId);
  },

  async getPlaces(regionCode?: string): Promise<Place[]> {
    if (isHttpApiConfigured()) return httpApi.getPlaces(regionCode);
    if (!isSupabaseConfigured) return localStore.getPlaces(regionCode);
    const sb = getSupabase()!;
    let q = sb.from('places').select('*');
    if (regionCode) q = q.eq('region_code', regionCode);
    const { data } = await q;
    return (data ?? []).map(mapPlace);
  },

  async getRecommendedPlaces(limit = 6): Promise<Place[]> {
    if (isHttpApiConfigured()) return httpApi.getRecommendedPlaces(limit);
    if (!isSupabaseConfigured) return localStore.getRecommendedPlaces(limit);
    return localStore.getRecommendedPlaces(limit);
  },

  async getPlace(id: string): Promise<Place | null> {
    if (isHttpApiConfigured()) return httpApi.getPlace(id);
    if (!isSupabaseConfigured) return localStore.getPlace(id);
    const sb = getSupabase()!;
    const { data } = await sb.from('places').select('*').eq('id', id).single();
    return data ? mapPlace(data) : null;
  },

  async getVisits(): Promise<Visit[]> {
    if (isHttpApiConfigured()) return httpApi.getVisits();
    if (!isSupabaseConfigured) return localStore.getVisits();
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data } = await sb.from('visits').select('*').eq('user_id', session!.userId).order('visited_at', { ascending: false });
    return (data ?? []).map(mapVisit);
  },

  async getVisit(id: string): Promise<Visit | null> {
    if (isHttpApiConfigured()) return httpApi.getVisit(id);
    if (!isSupabaseConfigured) return localStore.getVisit(id);
    const visits = await this.getVisits();
    return visits.find((v) => v.id === id) ?? null;
  },

  async createVisit(input: Parameters<typeof localStore.createVisit>[0]): Promise<Visit> {
    if (isHttpApiConfigured()) return httpApi.createVisit(input);
    if (!isSupabaseConfigured) return localStore.createVisit(input);
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data, error } = await sb.from('visits').insert({
      user_id: session!.userId,
      place_id: input.placeId,
      group_id: input.groupId,
      photo_uri: input.photoUri,
      note: input.note,
      is_public: input.isPublic ?? false,
      lat: input.lat,
      lng: input.lng,
    }).select().single();
    if (error) throw error;
    return mapVisit(data);
  },

  async updateVisit(id: string, patch: Partial<Visit>): Promise<Visit> {
    if (isHttpApiConfigured()) return httpApi.updateVisit(id, patch);
    if (!isSupabaseConfigured) return localStore.updateVisit(id, patch);
    const sb = getSupabase()!;
    const body: Record<string, unknown> = {
      edited_photo_uri: patch.editedPhotoUri,
      filter: patch.filter,
      note: patch.note,
      is_public: patch.isPublic,
    };
    if (patch.photoUri) {
      body.photo_uri = patch.photoUri;
      body.edited_photo_uri = null;
      body.filter = null;
    }
    const { data, error } = await sb.from('visits').update(body).eq('id', id).select().single();
    if (error) throw error;
    return mapVisit(data);
  },

  async replaceVisitPhoto(id: string, photoUri: string): Promise<Visit> {
    if (isHttpApiConfigured()) return httpApi.replaceVisitPhoto(id, photoUri);
    if (!isSupabaseConfigured) return localStore.replaceVisitPhoto(id, photoUri);
    return this.updateVisit(id, { photoUri });
  },

  async deleteVisit(id: string): Promise<void> {
    if (isHttpApiConfigured()) return httpApi.deleteVisit(id);
    if (!isSupabaseConfigured) return localStore.deleteVisit(id);
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { error } = await sb.from('visits').delete().eq('id', id).eq('user_id', session!.userId);
    if (error) throw error;
  },

  async getQuests(): Promise<Quest[]> {
    if (isHttpApiConfigured()) return httpApi.getQuests();
    if (!isSupabaseConfigured) return localStore.getQuests();
    return localStore.getQuests();
  },

  async completeQuest(questId: string, lat: number, lng: number): Promise<{ reward: number; stars: number }> {
    if (isHttpApiConfigured()) return httpApi.completeQuest(questId, lat, lng);
    if (!isSupabaseConfigured) return localStore.completeQuest(questId, lat, lng);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('complete_quest', { p_quest_id: questId, p_lat: lat, p_lng: lng });
    if (error) throw error;
    return { reward: data.reward, stars: data.stars };
  },

  async getGroupQuests(groupId: string): Promise<Quest[]> {
    const [visits, places] = await Promise.all([
      this.getGroupVisits(groupId),
      this.getPlaces(),
    ]);
    let remoteQuests: Quest[] = [];
    if (isHttpApiConfigured()) {
      try {
        remoteQuests = await httpApi.getGroupQuests(groupId);
      } catch {
        remoteQuests = [];
      }
    }
    return localStore.assembleGroupQuests(groupId, visits, places, remoteQuests);
  },

  async completeGroupQuest(
    groupId: string,
    questId: string,
    lat: number,
    lng: number
  ): Promise<{ rewardGallerySlots: number; rewardStars?: number }> {
    if (isHttpApiConfigured()) return httpApi.completeGroupQuest(groupId, questId, lat, lng);
    return localStore.completeGroupQuest(groupId, questId, lat, lng);
  },

  async getMinigameBetState(): Promise<MinigameBetState> {
    return localStore.getMinigameBetState();
  },

  async placeMinigameBet(
    questionId: string,
    choiceId: string,
    stake: number,
  ): Promise<{ ticket: MinigameBetTicket; stars: number }> {
    await syncLocalAuthCache();
    return localStore.placeMinigameBet(questionId, choiceId, stake);
  },

  async claimMinigameBetReward(
    ticketId: string,
    options?: { withAdBonus?: boolean },
  ): Promise<{ ticket: MinigameBetTicket; stars: number; adBonus?: number }> {
    await syncLocalAuthCache();
    const result = await localStore.claimMinigameBetReward(ticketId, options);
    const payout = result.ticket.payout ?? result.ticket.stake * 2;
    const total = payout + (result.adBonus ?? 0);
    if (total > 0) {
      const stars = await this.earnStars(total, `minigame_bet:${ticketId}`);
      return { ...result, stars };
    }
    return result;
  },

  async getMinigameBetDailyState() {
    return localStore.getMinigameBetDailyState();
  },

  async unlockExtraBetSlotViaAd() {
    return localStore.unlockExtraBetSlotViaAd();
  },

  async extendMinigameCapViaAd() {
    await syncLocalAuthCache();
    return localStore.extendMinigameCapViaAd();
  },

  async claimDailyFreeStars() {
    await syncLocalAuthCache();
    const result = await localStore.claimDailyFreeStars();
    const stars = await this.earnStars(result.amount, 'daily_free_ad');
    return { stars, amount: result.amount };
  },

  async claimDailyFreeStarsBasic() {
    await syncLocalAuthCache();
    const result = await localStore.claimDailyFreeStarsBasic();
    const stars = await this.earnStars(result.amount, 'daily_free_basic');
    return { stars, amount: result.amount };
  },

  async getDailyFreeStarsState() {
    await syncLocalAuthCache();
    return localStore.getDailyFreeStarsState();
  },

  async grantQuestAdBonus(questId: string) {
    await syncLocalAuthCache();
    const result = await localStore.grantQuestAdBonus(questId);
    const stars = await this.earnStars(result.bonus, `quest_ad_bonus:${questId}`);
    return { ...result, stars };
  },

  async grantVisitAdBonus() {
    await syncLocalAuthCache();
    const result = await localStore.grantVisitAdBonus();
    const stars = await this.earnStars(result.bonus, 'visit_ad_bonus');
    return { ...result, stars };
  },

  async grantReviewAdBonus() {
    await syncLocalAuthCache();
    const result = await localStore.grantReviewAdBonus();
    const stars = await this.earnStars(result.bonus, 'review_ad_bonus');
    return { ...result, stars };
  },

  async grantEditorFeatureViaAd(featureId: string) {
    return localStore.grantEditorFeatureViaAd(featureId);
  },

  async getMinigameRewardBonus() {
    return localStore.getMinigameRewardBonus();
  },

  async doubleStepRouletteReward(milestone: number) {
    await syncLocalAuthCache();
    const result = await localStore.doubleStepRouletteReward(milestone);
    if (result.bonus > 0) {
      const stars = await this.earnStars(result.bonus, `steps_roulette_double:${milestone}`);
      return { ...result, stars };
    }
    return result;
  },

  async getGroupSchedules(groupId: string): Promise<GroupSchedule[]> {
    return localStore.getGroupSchedules(groupId);
  },

  async createGroupSchedule(input: {
    groupId: string;
    regionCode: string;
    title: string;
    date: string;
    note?: string;
    stickerId?: string;
  }): Promise<GroupSchedule> {
    return localStore.createGroupSchedule(input);
  },

  async deleteGroupSchedule(scheduleId: string): Promise<void> {
    return localStore.deleteGroupSchedule(scheduleId);
  },

  async purchaseStickers(stickerId: string, packId: string): Promise<{ newCount: number }> {
    if (isHttpApiConfigured()) return httpApi.purchaseStickers(stickerId, packId);
    return localStore.purchaseStickers(stickerId, packId);
  },

  async spendStars(amount: number, reason: string): Promise<number> {
    if (isHttpApiConfigured()) return httpApi.spendStars(amount, reason);
    if (!isSupabaseConfigured) return localStore.spendStars(amount, reason);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('spend_stars', { p_amount: amount, p_reason: reason });
    if (error) throw error;
    return data.stars;
  },

  async earnStars(amount: number, reason: string): Promise<number> {
    if (isHttpApiConfigured()) {
      if (!(await hasApiToken())) {
        throw new Error('로그인이 필요합니다');
      }
      const stars = await httpApi.earnStars(amount, reason);
      const profile = await httpApi.getProfile();
      if (profile) {
        await syncLocalAuthCache(profile);
      } else {
        const cached = await localStore.getProfile();
        if (cached) {
          await syncLocalAuthCache({ ...cached, stars });
        }
      }
      return stars;
    }
    return localStore.earnStars(amount, reason);
  },

  async useAiFeature(feature: string): Promise<{ cost: number; stars: number }> {
    if (isHttpApiConfigured()) return httpApi.useAiFeature(feature);
    if (!isSupabaseConfigured) return localStore.useAiFeature(feature);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('use_ai_feature', { p_feature: feature });
    if (error) throw error;
    return { cost: data.cost, stars: data.stars };
  },

  async getRecommendations(placeId: string): Promise<PlaceRecommendation[]> {
    if (isHttpApiConfigured()) return httpApi.getRecommendations(placeId);
    if (!isSupabaseConfigured) return localStore.getRecommendations(placeId);
    const sb = getSupabase()!;
    const { data } = await sb.from('place_recommendations').select('*').eq('place_id', placeId);
    return (data ?? []).map((r) => ({
      id: r.id,
      placeId: r.place_id,
      userId: r.user_id,
      text: r.text,
      rating: r.rating,
      createdAt: r.created_at,
    }));
  },

  async addRecommendation(placeId: string, text: string, rating: number): Promise<PlaceRecommendation> {
    if (isHttpApiConfigured()) return httpApi.addRecommendation(placeId, text, rating);
    if (!isSupabaseConfigured) return localStore.addRecommendation(placeId, text, rating);
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data, error } = await sb.from('place_recommendations').insert({
      place_id: placeId,
      user_id: session!.userId,
      text,
      rating,
    }).select().single();
    if (error) throw error;
    return { id: data.id, placeId: data.place_id, userId: data.user_id, text: data.text, rating: data.rating, createdAt: data.created_at };
  },

  getShopItems(): ShopItem[] {
    return [];
  },

  async getFeaturePasses(): Promise<FeaturePass[]> {
    if (isHttpApiConfigured()) return httpApi.getFeaturePasses();
    return localStore.getFeaturePasses();
  },

  async purchaseFeaturePass(
    featureId: string,
    tier: FeaturePassTier,
  ): Promise<{ pass: FeaturePass; stars: number }> {
    if (isHttpApiConfigured()) return httpApi.purchaseFeaturePass(featureId, tier);
    return localStore.purchaseFeaturePass(featureId, tier);
  },

  async getUnlockedEditorAssets(): Promise<string[]> {
    if (isHttpApiConfigured()) return httpApi.getUnlockedEditorAssets();
    if (!isSupabaseConfigured) return localStore.getUnlockedEditorAssets();
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data } = await sb.from('user_editor_unlocks').select('asset_id').eq('user_id', session!.userId);
    return (data ?? []).map((r) => r.asset_id as string);
  },

  async unlockEditorAsset(assetId: string, cost: number): Promise<string[]> {
    if (isHttpApiConfigured()) return httpApi.unlockEditorAsset(assetId, cost);
    if (!isSupabaseConfigured) return localStore.unlockEditorAsset(assetId, cost);
    const sb = getSupabase()!;
    const { error } = await sb.rpc('spend_stars', { p_amount: cost, p_reason: 'editor_asset:' + assetId });
    if (error) throw error;
    await sb.from('user_editor_unlocks').insert({ asset_id: assetId });
    return this.getUnlockedEditorAssets();
  },

  async getPedometerState() {
    await syncLocalAuthCache();
    return localStore.getPedometerState();
  },

  async syncPedometerSteps(rawSteps: number) {
    await syncLocalAuthCache();
    return localStore.syncPedometerSteps(rawSteps);
  },

  async spinStepRoulette(milestone: number) {
    await syncLocalAuthCache();
    const result = await localStore.spinStepRoulette(milestone);
    if (result.reward > 0) {
      const stars = await this.earnStars(result.reward, `steps_roulette:${milestone}`);
      return { ...result, stars };
    }
    return result;
  },

  async getMinigameProgress() {
    return localStore.getMinigameProgress();
  },

  async getMinigameDailyState() {
    return localStore.getMinigameDailyState();
  },

  async claimMinigameStageClear(gameId: MinigameId, stage: number) {
    await syncLocalAuthCache();
    const result = await localStore.claimMinigameStageClear(gameId, stage);
    if (result.reward > 0) {
      const stars = await this.earnStars(result.reward, `minigame_clear:${gameId}:${stage}`);
      return { ...result, stars };
    }
    return result;
  },

  async claimMinigameReplayReward(gameId: MinigameId, stage: number) {
    await syncLocalAuthCache();
    const result = await localStore.claimMinigameReplayReward(gameId, stage);
    if (result.reward > 0) {
      const stars = await this.earnStars(result.reward, `minigame_replay:${gameId}:${stage}`);
      return { ...result, stars };
    }
    return result;
  },

  async rerollMinigameReward(gameId: MinigameId, stage: number) {
    await syncLocalAuthCache();
    const bonus = await localStore.getMinigameRewardBonus();
    const previousReward = bonus?.gameId === gameId && bonus.stage === stage ? bonus.baseReward : 0;
    const result = await localStore.rerollMinigameReward(gameId, stage);
    const delta = result.reward - previousReward;
    if (delta !== 0) {
      const stars = await this.earnStars(delta, `minigame_reroll:${gameId}:${stage}`);
      return { ...result, stars };
    }
    return result;
  },

  async doubleMinigameReward(gameId: MinigameId, stage: number) {
    await syncLocalAuthCache();
    const result = await localStore.doubleMinigameReward(gameId, stage);
    if (result.bonus > 0) {
      const stars = await this.earnStars(result.bonus, `minigame_double:${gameId}:${stage}`);
      return { ...result, stars };
    }
    return result;
  },

  async setStepTimezone(timezone: string) {
    return localStore.setStepTimezone(timezone);
  },

  async getRankings(type: 'stars' | 'visits' | 'gallery'): Promise<RankingEntry[]> {
    return localStore.getRankings(type);
  },

  async getPublicFeed(): Promise<PublicExperiencePost[]> {
    const feed = isHttpApiConfigured() ? await httpApi.getPublicFeed() : await localStore.getPublicFeed();
    return localStore.applyFeedRecommendCounts(feed);
  },

  async getFeedLikedPostIds(): Promise<string[]> {
    return localStore.getFeedLikedPostIds();
  },

  async toggleFeedRecommend(postId: string, postUserId: string): Promise<{ count: number; liked: boolean }> {
    return localStore.toggleFeedRecommend(postId, postUserId);
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (isHttpApiConfigured()) return httpApi.getUserProfile(userId);
    return localStore.getUserProfile(userId);
  },

  async changePassword(current: string, next: string): Promise<void> {
    if (isSupabaseConfigured) {
      await this.updatePassword(next);
      return;
    }
    return localStore.changePassword(current, next);
  },

  async redeemCoupon(code: string) {
    return localStore.redeemCoupon(code);
  },

  async submitCustomerInquiry(message: string): Promise<void> {
    if (isHttpApiConfigured()) return httpApi.submitCustomerInquiry(message);
    return localStore.submitCustomerInquiry(message);
  },

  async adminListUsers(query?: string): Promise<AdminUserSummary[]> {
    if (isHttpApiConfigured()) return httpApi.adminListUsers(query);
    return localStore.adminListUsers(query);
  },

  async adminGrantStars(userId: string, amount: number, reason?: string): Promise<{ stars: number }> {
    if (isHttpApiConfigured()) return httpApi.adminGrantStars(userId, amount, reason);
    return localStore.adminGrantStars(userId, amount, reason);
  },

  async adminListInquiries(): Promise<CustomerInquiry[]> {
    if (isHttpApiConfigured()) return httpApi.adminListInquiries();
    return localStore.adminListInquiries();
  },

  async adminResolveInquiry(inquiryId: string): Promise<CustomerInquiry> {
    if (isHttpApiConfigured()) return httpApi.adminResolveInquiry(inquiryId);
    return localStore.adminResolveInquiry(inquiryId);
  },

  async adminSendMailbox(input: {
    userId: string;
    title: string;
    body: string;
    type?: 'notice' | 'notification';
  }): Promise<MailboxMessage> {
    if (isHttpApiConfigured()) return httpApi.adminSendMailbox(input);
    return localStore.adminSendMailbox(input);
  },

  async adminBroadcastMailbox(input: {
    title: string;
    body: string;
    userIds?: string[];
    type?: 'notice' | 'notification';
  }): Promise<{ sent: number }> {
    if (isHttpApiConfigured()) return httpApi.adminBroadcastMailbox(input);
    return localStore.adminBroadcastMailbox(input);
  },

  async deleteAccount(): Promise<void> {
    return localStore.deleteAccount();
  },
};

function mapGroup(row: Record<string, unknown>): Group {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    ownerId: row.owner_id as string,
    memberIds: (row.member_ids as string[]) ?? [],
    createdAt: row.created_at as string,
    sharedGalleryUploaderId: row.shared_gallery_uploader_id as string | undefined,
  };
}

function mapPlace(row: Record<string, unknown>): Place {
  return {
    id: row.id as string,
    regionCode: row.region_code as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    lat: row.lat as number,
    lng: row.lng as number,
    category: (row.category as string) ?? '',
    imageUrl: row.image_url as string | undefined,
  };
}

function mapVisit(row: Record<string, unknown>): Visit {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    placeId: row.place_id as string,
    groupId: row.group_id as string | undefined,
    photoUri: (row.photo_uri as string) ?? '',
    editedPhotoUri: row.edited_photo_uri as string | undefined,
    note: row.note as string | undefined,
    visitedAt: row.visited_at as string,
    lat: row.lat as number | undefined,
    lng: row.lng as number | undefined,
    filter: row.filter as string | undefined,
    isPublic: (row.is_public as boolean | undefined) ?? (row.isPublic as boolean | undefined) ?? false,
  };
}
