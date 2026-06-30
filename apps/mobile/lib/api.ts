import type {
  AuthSession,
  Group,
  HomeDashboard,
  Place,
  PlaceRecommendation,
  Quest,
  ShopItem,
  UserProfile,
  Visit,
} from '@tingting/shared';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { localStore } from './local-store';

export { isSupabaseConfigured };

export const api = {
  async getSession(): Promise<AuthSession | null> {
    if (!isSupabaseConfigured) return localStore.getSession();
    const sb = getSupabase()!;
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    return { userId: data.session.user.id, email: data.session.user.email ?? '', isDemo: false };
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    if (!isSupabaseConfigured) return localStore.signIn(email, password);
    const sb = getSupabase()!;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { userId: data.user!.id, email: data.user!.email ?? '', isDemo: false };
  },

  async signUp(email: string, password: string, displayName: string): Promise<AuthSession> {
    if (!isSupabaseConfigured) return localStore.signUp(email, password, displayName);
    const sb = getSupabase()!;
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;
    await sb.from('profiles').insert({ id: data.user!.id, email, display_name: displayName });
    return { userId: data.user!.id, email, isDemo: false };
  },

  async signInDemo(): Promise<AuthSession> {
    return localStore.signInDemo();
  },

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured) return localStore.signOut();
    await getSupabase()!.auth.signOut();
  },

  async getProfile(): Promise<UserProfile | null> {
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

  async completeOnboarding(displayName: string): Promise<UserProfile> {
    if (!isSupabaseConfigured) return localStore.completeOnboarding(displayName);
    const sb = getSupabase()!;
    const session = await this.getSession();
    await sb.from('profiles').update({ display_name: displayName, onboarding_complete: true }).eq('id', session!.userId);
    return (await this.getProfile())!;
  },

  async getHomeDashboard(): Promise<HomeDashboard> {
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
    if (!isSupabaseConfigured) return localStore.getGroups();
    const dash = await this.getHomeDashboard();
    return dash.groups;
  },

  async createGroup(name: string, description?: string): Promise<{ group: Group; cost: number }> {
    if (!isSupabaseConfigured) return localStore.createGroup(name, description);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('create_group', { p_name: name, p_description: description });
    if (error) throw error;
    const group = await localStore.getGroup(data.id);
    return { group: group!, cost: data.cost };
  },

  async getGroup(id: string): Promise<Group | null> {
    if (!isSupabaseConfigured) return localStore.getGroup(id);
    return localStore.getGroup(id);
  },

  async getPlaces(regionCode?: string): Promise<Place[]> {
    if (!isSupabaseConfigured) return localStore.getPlaces(regionCode);
    const sb = getSupabase()!;
    let q = sb.from('places').select('*');
    if (regionCode) q = q.eq('region_code', regionCode);
    const { data } = await q;
    return (data ?? []).map(mapPlace);
  },

  async getPlace(id: string): Promise<Place | null> {
    if (!isSupabaseConfigured) return localStore.getPlace(id);
    const sb = getSupabase()!;
    const { data } = await sb.from('places').select('*').eq('id', id).single();
    return data ? mapPlace(data) : null;
  },

  async getVisits(): Promise<Visit[]> {
    if (!isSupabaseConfigured) return localStore.getVisits();
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data } = await sb.from('visits').select('*').eq('user_id', session!.userId).order('visited_at', { ascending: false });
    return (data ?? []).map(mapVisit);
  },

  async getVisit(id: string): Promise<Visit | null> {
    if (!isSupabaseConfigured) return localStore.getVisit(id);
    const visits = await this.getVisits();
    return visits.find((v) => v.id === id) ?? null;
  },

  async createVisit(input: Parameters<typeof localStore.createVisit>[0]): Promise<Visit> {
    if (!isSupabaseConfigured) return localStore.createVisit(input);
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data, error } = await sb.from('visits').insert({
      user_id: session!.userId,
      place_id: input.placeId,
      group_id: input.groupId,
      photo_uri: input.photoUri,
      note: input.note,
      lat: input.lat,
      lng: input.lng,
    }).select().single();
    if (error) throw error;
    return mapVisit(data);
  },

  async updateVisit(id: string, patch: Partial<Visit>): Promise<Visit> {
    if (!isSupabaseConfigured) return localStore.updateVisit(id, patch);
    const sb = getSupabase()!;
    const { data, error } = await sb.from('visits').update({
      edited_photo_uri: patch.editedPhotoUri,
      filter: patch.filter,
      note: patch.note,
    }).eq('id', id).select().single();
    if (error) throw error;
    return mapVisit(data);
  },

  async getQuests(): Promise<Quest[]> {
    if (!isSupabaseConfigured) return localStore.getQuests();
    return localStore.getQuests();
  },

  async completeQuest(questId: string, lat: number, lng: number): Promise<{ reward: number; stars: number }> {
    if (!isSupabaseConfigured) return localStore.completeQuest(questId, lat, lng);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('complete_quest', { p_quest_id: questId, p_lat: lat, p_lng: lng });
    if (error) throw error;
    return { reward: data.reward, stars: data.stars };
  },

  async spendStars(amount: number, reason: string): Promise<number> {
    if (!isSupabaseConfigured) return localStore.spendStars(amount, reason);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('spend_stars', { p_amount: amount, p_reason: reason });
    if (error) throw error;
    return data.stars;
  },

  async useAiFeature(feature: string): Promise<{ cost: number; stars: number }> {
    if (!isSupabaseConfigured) return localStore.useAiFeature(feature);
    const sb = getSupabase()!;
    const { data, error } = await sb.rpc('use_ai_feature', { p_feature: feature });
    if (error) throw error;
    return { cost: data.cost, stars: data.stars };
  },

  async getRecommendations(placeId: string): Promise<PlaceRecommendation[]> {
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
    return localStore.getShopItems();
  },

  async getUnlockedEditorAssets(): Promise<string[]> {
    if (!isSupabaseConfigured) return localStore.getUnlockedEditorAssets();
    const sb = getSupabase()!;
    const session = await this.getSession();
    const { data } = await sb.from('user_editor_unlocks').select('asset_id').eq('user_id', session!.userId);
    return (data ?? []).map((r) => r.asset_id as string);
  },

  async unlockEditorAsset(assetId: string, cost: number): Promise<string[]> {
    if (!isSupabaseConfigured) return localStore.unlockEditorAsset(assetId, cost);
    const sb = getSupabase()!;
    const { error } = await sb.rpc('spend_stars', { p_amount: cost, p_reason: 'editor_asset:' + assetId });
    if (error) throw error;
    await sb.from('user_editor_unlocks').insert({ asset_id: assetId });
    return this.getUnlockedEditorAssets();
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
  };
}
