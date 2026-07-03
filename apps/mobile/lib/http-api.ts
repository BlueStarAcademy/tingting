import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickRecommendedPlaces } from '@tingting/shared';
import type {
  AdminUserSummary,
  AuthSession,
  CustomerInquiry,
  Group,
  GroupChatMessage,
  GroupSchedule,
  HomeDashboard,
  MailboxMessage,
  Place,
  PlaceRecommendation,
  PublicExperiencePost,
  Quest,
  ShopItem,
  UserProfile,
  Visit,
  FeaturePass,
  FeaturePassTier,
} from '@tingting/shared';
import { filterPlacesByRegion, mergePlacesWithBundled } from '@/lib/places-data';
import { SEED_PUBLIC_EXPERIENCE_POSTS } from '@/lib/public-feed-seed';

const TOKEN_KEY = '@tingting/api-token';
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export function isHttpApiConfigured(): boolean {
  return Boolean(API_URL);
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const httpApi = {
  async getSession(): Promise<AuthSession | null> {
    const token = await getToken();
    if (!token) return null;
    try {
      const { profile } = await request<{ profile: UserProfile }>('/auth/me');
      return { userId: profile.id, email: profile.email, isDemo: false };
    } catch {
      await setToken(null);
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const data = await request<{ token: string; session: AuthSession }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(data.token);
    return data.session;
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthSession> {
    const data = await request<{ token: string; session: AuthSession }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    await setToken(data.token);
    return data.session;
  },

  async signInDemo(): Promise<AuthSession> {
    const data = await request<{ token: string; session: AuthSession }>('/auth/demo', { method: 'POST' });
    await setToken(data.token);
    return data.session;
  },

  async signOut(): Promise<void> {
    await setToken(null);
  },

  async getProfile(): Promise<UserProfile | null> {
    try {
      const { profile } = await request<{ profile: UserProfile }>('/auth/me');
      return profile;
    } catch {
      return null;
    }
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await request<UserProfile>(`/users/${userId}/profile`);
    } catch {
      return null;
    }
  },

  async completeOnboarding(displayName: string): Promise<UserProfile> {
    const { profile } = await request<{ profile: UserProfile }>('/auth/onboarding', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
    return profile;
  },

  async updateProfile(
    patch: Partial<Pick<UserProfile, 'photoUri' | 'birthday' | 'profilePublic'>>
  ): Promise<UserProfile> {
    const { profile } = await request<{ profile: UserProfile }>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return profile;
  },

  async changeDisplayName(displayName: string): Promise<{ profile: UserProfile; cost: number }> {
    return request('/profile/display-name', {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    });
  },

  async unlockGroupSlot(): Promise<UserProfile> {
    const { profile } = await request<{ profile: UserProfile }>('/profile/unlock-group-slot', { method: 'POST' });
    return profile;
  },

  async completeMbtiTest(mbti: string): Promise<{ profile: UserProfile; reward: number }> {
    return request('/profile/mbti', { method: 'POST', body: JSON.stringify({ mbti }) });
  },

  async retakeMbtiTest(mbti: string): Promise<UserProfile> {
    const { profile } = await request<{ profile: UserProfile }>('/profile/mbti/retake', {
      method: 'POST',
      body: JSON.stringify({ mbti }),
    });
    return profile;
  },

  async getHomeDashboard(): Promise<HomeDashboard> {
    return request<HomeDashboard>('/dashboard');
  },

  async getGroups(): Promise<Group[]> {
    return request<Group[]>('/groups');
  },

  async createGroup(name: string, description?: string, slotIndex?: number): Promise<{ group: Group; cost: number }> {
    return request('/groups', { method: 'POST', body: JSON.stringify({ name, description, slotIndex }) });
  },

  async getGroup(id: string): Promise<Group | null> {
    try {
      return await request<Group>(`/groups/${id}`);
    } catch {
      return null;
    }
  },

  async inviteGroupMember(groupId: string, phone: string): Promise<{ cost: number }> {
    return request(`/groups/${groupId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async searchUserByPhone(
    phone: string
  ): Promise<{ userId: string; displayName: string; phone: string; profile?: UserProfile } | null> {
    try {
      return await request(`/users/search-by-phone?phone=${encodeURIComponent(phone)}`);
    } catch {
      return null;
    }
  },

  async sendPhoneVerificationCode(phone: string): Promise<void> {
    await request('/users/phone/send-code', { method: 'POST', body: JSON.stringify({ phone }) });
  },

  async verifyPhone(phone: string, code: string): Promise<UserProfile> {
    return request<UserProfile>('/users/phone/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  },

  async updatePhoneInviteSettings(blockPhoneInvite: boolean): Promise<UserProfile> {
    return request<UserProfile>('/users/phone/invite-settings', {
      method: 'PATCH',
      body: JSON.stringify({ blockPhoneInvite }),
    });
  },

  async getMailboxMessages(): Promise<MailboxMessage[]> {
    try {
      return await request<MailboxMessage[]>('/mailbox');
    } catch {
      return [];
    }
  },

  async getUnreadMailboxCount(): Promise<number> {
    try {
      const { count } = await request<{ count: number }>('/mailbox/unread-count');
      return count;
    } catch {
      return 0;
    }
  },

  async markMailboxMessageRead(messageId: string): Promise<void> {
    try {
      await request(`/mailbox/${messageId}/read`, { method: 'POST' });
    } catch {
      // Mailbox API may be unavailable on older deployments.
    }
  },

  async markAllMailboxRead(): Promise<number> {
    try {
      const { count } = await request<{ count: number }>('/mailbox/read-all', { method: 'POST' });
      return count;
    } catch {
      return 0;
    }
  },

  async deleteMailboxMessage(messageId: string): Promise<void> {
    await request(`/mailbox/${messageId}`, { method: 'DELETE' });
  },

  async deleteAllMailboxMessages(): Promise<number> {
    const { count } = await request<{ count: number }>('/mailbox', { method: 'DELETE' });
    return count;
  },

  async respondToGroupInvite(messageId: string, accept: boolean): Promise<Group | null> {
    return request<Group | null>(`/mailbox/${messageId}/invite-response`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    });
  },

  async unlockGroupMemberSlot(groupId: string): Promise<{ group: Group; cost: number }> {
    return request(`/groups/${groupId}/unlock-member-slot`, { method: 'POST' });
  },

  async unlockGroupGallerySlots(groupId: string): Promise<{ group: Group; cost: number }> {
    return request(`/groups/${groupId}/unlock-gallery-slots`, { method: 'POST' });
  },

  async updateGroup(groupId: string, patch: { name?: string; description?: string }): Promise<Group> {
    return request<Group>(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(patch) });
  },

  async removeGroupMember(groupId: string, memberId: string): Promise<Group> {
    return request<Group>(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
  },

  async leaveGroup(groupId: string): Promise<void> {
    await request(`/groups/${groupId}/leave`, { method: 'POST' });
  },

  async getGroupChatMessages(groupId: string): Promise<GroupChatMessage[]> {
    try {
      const rows = await request<GroupChatMessage[]>(`/groups/${groupId}/chat`);
      return rows.filter((message) => !message.deletedAt);
    } catch {
      return [];
    }
  },

  async sendGroupChatMessage(groupId: string, text: string): Promise<GroupChatMessage> {
    return request<GroupChatMessage>(`/groups/${groupId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async deleteGroupChatMessage(groupId: string, messageId: string): Promise<void> {
    await request(`/groups/${groupId}/chat/${messageId}`, { method: 'DELETE' });
  },

  async getGroupVisits(groupId: string): Promise<Visit[]> {
    try {
      return await request<Visit[]>(`/groups/${groupId}/visits`);
    } catch {
      return [];
    }
  },

  async getPlaces(regionCode?: string): Promise<Place[]> {
    let remote: Place[] = [];
    try {
      remote = await request<Place[]>('/places');
    } catch {
      /* fall back to bundled seed */
    }
    const merged = mergePlacesWithBundled(remote.length > 0 ? remote : []);
    return filterPlacesByRegion(merged, regionCode);
  },

  async getRecommendedPlaces(limit = 6): Promise<Place[]> {
    try {
      return await request<Place[]>(`/places/recommended?limit=${limit}`);
    } catch {
      const all = await this.getPlaces();
      return pickRecommendedPlaces(all, limit);
    }
  },

  async getPlace(id: string): Promise<Place | null> {
    try {
      return await request<Place>(`/places/${id}`);
    } catch {
      return mergePlacesWithBundled([]).find((p) => p.id === id) ?? null;
    }
  },

  async getVisits(): Promise<Visit[]> {
    return request<Visit[]>('/visits');
  },

  async getVisit(id: string): Promise<Visit | null> {
    const visits = await this.getVisits();
    return visits.find((v) => v.id === id) ?? null;
  },

  async createVisit(input: {
    placeId: string;
    photoUri: string;
    groupId?: string;
    note?: string;
    lat?: number;
    lng?: number;
  }): Promise<Visit> {
    return request<Visit>('/visits', { method: 'POST', body: JSON.stringify(input) });
  },

  async updateVisit(id: string, patch: Partial<Visit>): Promise<Visit> {
    return request<Visit>(`/visits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        editedPhotoUri: patch.editedPhotoUri,
        filter: patch.filter,
        note: patch.note,
        photoUri: patch.photoUri,
      }),
    });
  },

  async replaceVisitPhoto(id: string, photoUri: string): Promise<Visit> {
    return request<Visit>(`/visits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ photoUri }),
    });
  },

  async deleteVisit(id: string): Promise<void> {
    await request(`/visits/${id}`, { method: 'DELETE' });
  },

  async getQuests(): Promise<Quest[]> {
    return request<Quest[]>('/quests');
  },

  async completeQuest(questId: string, lat: number, lng: number): Promise<{ reward: number; stars: number }> {
    return request(`/quests/${encodeURIComponent(questId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    });
  },

  async getGroupQuests(groupId: string): Promise<Quest[]> {
    try {
      return await request<Quest[]>(`/groups/${groupId}/quests`);
    } catch {
      return [];
    }
  },

  async completeGroupQuest(
    groupId: string,
    questId: string,
    lat: number,
    lng: number
  ): Promise<{ rewardGallerySlots: number }> {
    return request(`/groups/${groupId}/quests/${encodeURIComponent(questId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    });
  },

  async skipGroupStationQuestPurchase(
    groupId: string,
    questId: string
  ): Promise<{ rewardGallerySlots: number }> {
    return request(`/groups/${groupId}/quests/${encodeURIComponent(questId)}/skip-purchase`, {
      method: 'POST',
    });
  },

  async getGroupSchedules(groupId: string): Promise<GroupSchedule[]> {
    return request<GroupSchedule[]>(`/groups/${groupId}/schedules`);
  },

  async createGroupSchedule(input: {
    groupId: string;
    regionCode: string;
    title: string;
    date: string;
    note?: string;
  }): Promise<GroupSchedule> {
    return request<GroupSchedule>(`/groups/${input.groupId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async deleteGroupSchedule(scheduleId: string): Promise<void> {
    await request(`/schedules/${encodeURIComponent(scheduleId)}`, { method: 'DELETE' });
  },

  async spendStars(amount: number, reason: string): Promise<number> {
    const { stars } = await request<{ stars: number }>('/stars/spend', {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
    return stars;
  },

  async useAiFeature(feature: string): Promise<{ cost: number; stars: number }> {
    return request('/ai/use', { method: 'POST', body: JSON.stringify({ feature }) });
  },

  async getRecommendations(placeId: string): Promise<PlaceRecommendation[]> {
    return request<PlaceRecommendation[]>(`/places/${placeId}/recommendations`);
  },

  async addRecommendation(placeId: string, text: string, rating: number): Promise<PlaceRecommendation> {
    return request(`/places/${placeId}/recommendations`, {
      method: 'POST',
      body: JSON.stringify({ text, rating }),
    });
  },

  getShopItems(): ShopItem[] {
    return [];
  },

  async getShopItemsAsync(): Promise<ShopItem[]> {
    return request<ShopItem[]>('/shop/items');
  },

  async getFeaturePasses(): Promise<FeaturePass[]> {
    return request<FeaturePass[]>('/editor/passes');
  },

  async purchaseFeaturePass(
    featureId: string,
    tier: FeaturePassTier,
  ): Promise<{ pass: FeaturePass; stars: number }> {
    return request('/editor/passes', {
      method: 'POST',
      body: JSON.stringify({ featureId, tier }),
    });
  },

  async getUnlockedEditorAssets(): Promise<string[]> {
    return request<string[]>('/editor/unlocks');
  },

  async unlockEditorAsset(assetId: string, cost: number): Promise<string[]> {
    return request<string[]>('/editor/unlock', {
      method: 'POST',
      body: JSON.stringify({ assetId, cost }),
    });
  },

  async getPublicFeed(): Promise<PublicExperiencePost[]> {
    try {
      return await request<PublicExperiencePost[]>('/feed/experiences');
    } catch {
      return SEED_PUBLIC_EXPERIENCE_POSTS;
    }
  },

  async submitCustomerInquiry(message: string): Promise<void> {
    await request('/inquiries', { method: 'POST', body: JSON.stringify({ message }) });
  },

  async adminListUsers(query?: string): Promise<AdminUserSummary[]> {
    const q = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    return request<AdminUserSummary[]>(`/admin/users${q}`);
  },

  async adminGrantStars(userId: string, amount: number, reason?: string): Promise<{ stars: number }> {
    return request(`/admin/users/${userId}/stars`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, reason: reason ?? 'admin_grant' }),
    });
  },

  async adminListInquiries(): Promise<CustomerInquiry[]> {
    return request<CustomerInquiry[]>('/admin/inquiries');
  },

  async adminResolveInquiry(inquiryId: string): Promise<CustomerInquiry> {
    return request<CustomerInquiry>(`/admin/inquiries/${inquiryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved' }),
    });
  },

  async adminSendMailbox(input: {
    userId: string;
    title: string;
    body: string;
    type?: 'notice' | 'notification';
  }): Promise<MailboxMessage> {
    return request<MailboxMessage>('/admin/mailbox/send', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async adminBroadcastMailbox(input: {
    title: string;
    body: string;
    userIds?: string[];
    type?: 'notice' | 'notification';
  }): Promise<{ sent: number }> {
    return request<{ sent: number }>('/admin/mailbox/broadcast', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
