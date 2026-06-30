import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('c:/project/TingTing');

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Wrote', rel);
}

write('supabase/functions/search-places/index.ts', `import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  x: string;
  y: string;
  address_name: string;
  road_address_name?: string;
  place_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query") ?? "";
    const category = url.searchParams.get("category") ?? "";
    const regionCode = url.searchParams.get("region_code");
    const x = url.searchParams.get("x");
    const y = url.searchParams.get("y");
    const page = url.searchParams.get("page") ?? "1";
    const size = url.searchParams.get("size") ?? "15";

    if (!query.trim()) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kakaoKey = Deno.env.get("KAKAO_REST_API_KEY");
    if (!kakaoKey) {
      return new Response(JSON.stringify({ error: "KAKAO_REST_API_KEY not configured", places: [] }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    kakaoUrl.searchParams.set("query", query);
    kakaoUrl.searchParams.set("page", page);
    kakaoUrl.searchParams.set("size", size);
    if (x && y) {
      kakaoUrl.searchParams.set("x", x);
      kakaoUrl.searchParams.set("y", y);
      kakaoUrl.searchParams.set("sort", "distance");
    }
    if (category) kakaoUrl.searchParams.set("category_group_code", category);

    const kakaoRes = await fetch(kakaoUrl.toString(), {
      headers: { Authorization: "KakaoAK " + kakaoKey },
    });

    if (!kakaoRes.ok) {
      const errText = await kakaoRes.text();
      return new Response(JSON.stringify({ error: "Kakao API error", detail: errText }), {
        status: kakaoRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kakaoData = await kakaoRes.json();
    const documents: KakaoPlace[] = kakaoData.documents ?? [];

    const places = documents.map((doc) => ({
      kakao_id: doc.id,
      name: doc.place_name,
      category: doc.category_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      address: doc.road_address_name || doc.address_name,
      place_url: doc.place_url,
      region_code: regionCode,
    }));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey && places.length > 0) {
      const sb = createClient(supabaseUrl, serviceKey);
      const rows = places.map((p) => ({
        kakao_id: p.kakao_id,
        name: p.name,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        description: p.address,
        region_code: p.region_code ?? "SEO",
        source: "kakao",
      }));
      await sb.from("places").upsert(rows, { onConflict: "kakao_id" });
    }

    return new Response(JSON.stringify({ places, meta: kakaoData.meta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
`);

write('supabase/functions/tingting-ai/index.ts', `import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAILY_QUOTAS: Record<string, number> = {
  tingting_glow: 3,
  bbosyap: 3,
  bg_remove: 2,
  sky_fix: 2,
  sky: 2,
  food_pop: 999,
  region_swap: 1,
  group_harmony: 1,
  story_card: 1,
  season_auto: 999,
};

const STAR_COSTS: Record<string, number> = {
  tingting_glow: 40,
  bbosyap: 40,
  bg_remove: 50,
  sky_fix: 30,
  sky: 30,
  region_swap: 35,
  group_harmony: 60,
  story_card: 25,
};

interface AiRequest {
  feature: string;
  image_url?: string;
  region_code?: string;
  category?: string;
  force_spend?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AiRequest = await req.json();
    const feature = body.feature;
    if (!feature) {
      return new Response(JSON.stringify({ error: "feature is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const today = new Date().toISOString().slice(0, 10);
    const quota = DAILY_QUOTAS[feature] ?? 1;

    const { count } = await sb
      .from("ai_usage_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .eq("date", today);

    const used = count ?? 0;
    let cost = 0;
    const withinQuota = used < quota;

    if (!withinQuota || body.force_spend) {
      cost = STAR_COSTS[feature] ?? 20;
      const { data: spendData, error: spendError } = await sb.rpc("use_ai_feature", {
        p_feature: feature,
      });
      if (spendError) {
        return new Response(JSON.stringify({ error: spendError.message, cost }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      cost = spendData?.cost ?? cost;
    } else {
      await sb.from("ai_usage_log").insert({ user_id: userId, feature, date: today, count: 1 });
    }

    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    const resultUrl = body.image_url ?? null;
    let processingNote = "MVP stub — client-side preview recommended";

    if (replicateToken && body.image_url) {
      processingNote = "Queued for Replicate processing (configure model in production)";
    }

    return new Response(
      JSON.stringify({
        feature,
        result_url: resultUrl,
        cost,
        quota_remaining: Math.max(0, quota - used - (withinQuota ? 1 : 0)),
        processing_note: processingNote,
        layer: {
          type: "ai_effect",
          assetId: feature,
          intensity: 0.7,
          region_code: body.region_code,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
`);

write('apps/mobile/lib/editor-assets.ts', `export type EditorAssetType = 'filter' | 'sticker' | 'frame' | 'font' | 'template' | 'effect';

export interface EditorAsset {
  id: string;
  type: EditorAssetType;
  name: string;
  emoji?: string;
  starCost: number;
  free: boolean;
  regionCode?: string;
  previewColor?: string;
}

export const EDITOR_ASSETS: EditorAsset[] = [
  { id: 'filter_natural', type: 'filter', name: '내추럴', starCost: 0, free: true, previewColor: '#94A3B8' },
  { id: 'filter_warm', type: 'filter', name: '따뜻함', starCost: 0, free: true, previewColor: '#F59E0B' },
  { id: 'filter_cool', type: 'filter', name: '시원함', starCost: 0, free: true, previewColor: '#38BDF8' },
  { id: 'filter_vintage', type: 'filter', name: '빈티지', starCost: 20, free: false, previewColor: '#A16207' },
  { id: 'filter_film', type: 'filter', name: '필름', starCost: 25, free: false, previewColor: '#78716C' },
  { id: 'filter_jeju_sea', type: 'filter', name: '제주 바다', starCost: 20, free: false, regionCode: 'JEJ', previewColor: '#0EA5E9' },
  { id: 'sticker_camera', type: 'sticker', name: '카메라', emoji: '📷', starCost: 0, free: true },
  { id: 'sticker_pin', type: 'sticker', name: '핀', emoji: '📍', starCost: 0, free: true },
  { id: 'sticker_plane', type: 'sticker', name: '비행기', emoji: '✈️', starCost: 30, free: false },
  { id: 'sticker_sakura', type: 'sticker', name: '벚꽃', emoji: '🌸', starCost: 25, free: false },
  { id: 'sticker_hallasan', type: 'sticker', name: '한라산', emoji: '🏔️', starCost: 30, free: false, regionCode: 'JEJ' },
  { id: 'frame_polaroid', type: 'frame', name: '폴라로이드', starCost: 0, free: true },
  { id: 'frame_film', type: 'frame', name: '필름 테두리', starCost: 30, free: false },
  { id: 'frame_seoul', type: 'frame', name: '서울 야경', starCost: 35, free: false, regionCode: 'SEO' },
];

export function getAssetsByType(type: EditorAssetType): EditorAsset[] {
  return EDITOR_ASSETS.filter((a) => a.type === type);
}

export function getAsset(id: string): EditorAsset | undefined {
  return EDITOR_ASSETS.find((a) => a.id === id);
}

export function isAssetUnlocked(asset: EditorAsset, unlockedIds: string[]): boolean {
  return asset.free || unlockedIds.includes(asset.id);
}
`);

write('apps/mobile/lib/monetization.ts', `/**
 * RevenueCat placeholder — wire up react-native-purchases in production.
 * Client displays offerings only; receipt validation is server-side.
 */

export type SubscriptionPlanId = 'plus_monthly' | 'plus_yearly' | 'couple_monthly';

export interface PlusPlan {
  id: SubscriptionPlanId;
  name: string;
  priceLabel: string;
  period: string;
  perks: string[];
  revenueCatProductId: string;
}

export interface StarPack {
  id: string;
  stars: number;
  priceLabel: string;
  bonus?: string;
  revenueCatProductId: string;
}

/** Replace with platform-specific key from RevenueCat dashboard */
export const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

export const PLUS_PLANS: PlusPlan[] = [
  {
    id: 'plus_monthly',
    name: 'TingTing Plus',
    priceLabel: '₩4,900',
    period: '/월',
    perks: ['AI 일일 쿼터 2배', '워터마크 제거', '지역 슬롯 +10', '그룹 1개 추가 무료', '오프라인 팩'],
    revenueCatProductId: 'tingting_plus_monthly',
  },
  {
    id: 'plus_yearly',
    name: 'TingTing Plus 연간',
    priceLabel: '₩39,900',
    period: '/년',
    perks: ['월간 Plus 전체 혜택', '연간 한정 프레임', '약 32% 할인'],
    revenueCatProductId: 'tingting_plus_yearly',
  },
  {
    id: 'couple_monthly',
    name: 'TingTing Couple',
    priceLabel: '₩7,900',
    period: '/월',
    perks: ['Plus 전체', '커플 타임라인', '그룹 톤 맞춤', '커플 템플릿'],
    revenueCatProductId: 'tingting_couple_monthly',
  },
];

export const STAR_IAP_CATALOG: StarPack[] = [
  { id: 'stars_s', stars: 100, priceLabel: '₩1,100', revenueCatProductId: 'stars_s' },
  { id: 'stars_m', stars: 550, priceLabel: '₩4,900', bonus: '+10%', revenueCatProductId: 'stars_m' },
  { id: 'stars_l', stars: 1200, priceLabel: '₩9,900', bonus: '+20%', revenueCatProductId: 'stars_l' },
  { id: 'stars_xl', stars: 2800, priceLabel: '₩19,900', bonus: '+30%', revenueCatProductId: 'stars_xl' },
];

export interface MonetizationOfferings {
  plusPlans: PlusPlan[];
  starPacks: StarPack[];
  isConfigured: boolean;
}

let initialized = false;

/** Stub — call Purchases.configure({ apiKey }) when SDK is added */
export async function initRevenueCat(_userId?: string): Promise<void> {
  if (!REVENUECAT_API_KEY) return;
  initialized = true;
}

export async function getOfferings(): Promise<MonetizationOfferings> {
  return {
    plusPlans: PLUS_PLANS,
    starPacks: STAR_IAP_CATALOG,
    isConfigured: initialized && Boolean(REVENUECAT_API_KEY),
  };
}

export async function purchasePlus(_planId: SubscriptionPlanId): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'Coming Soon — RevenueCat 연동 예정' };
}

export async function purchaseStarPack(_packId: string): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'Coming Soon — 스타 IAP 출시 예정' };
}

export async function restorePurchases(): Promise<{ success: boolean; message: string }> {
  return { success: false, message: 'Coming Soon' };
}

export function hasPlusEntitlement(_entitlements?: Record<string, unknown>): boolean {
  return false;
}
`);

write('apps/mobile/components/MiniKoreaMap.tsx', `import { View, Text, StyleSheet } from 'react-native';
import { REGIONS } from '@tingting/shared';
import { theme } from '@/constants/theme';

/** Approximate geographic layout for 17 시·도 mini map */
const REGION_LAYOUT: Record<string, { left: number; top: number; w: number; h: number }> = {
  GWN: { left: 38, top: 2, w: 28, h: 22 },
  GGD: { left: 28, top: 18, w: 22, h: 18 },
  ICN: { left: 18, top: 28, w: 14, h: 12 },
  SEO: { left: 32, top: 28, w: 16, h: 12 },
  NCB: { left: 48, top: 28, w: 16, h: 14 },
  SCB: { left: 42, top: 42, w: 16, h: 14 },
  DJN: { left: 38, top: 42, w: 12, h: 10 },
  SJG: { left: 34, top: 48, w: 10, h: 8 },
  GWJ: { left: 18, top: 48, w: 14, h: 12 },
  NJB: { left: 24, top: 58, w: 16, h: 12 },
  ULS: { left: 58, top: 48, w: 12, h: 10 },
  BUS: { left: 62, top: 56, w: 14, h: 12 },
  DAE: { left: 52, top: 52, w: 12, h: 10 },
  NGB: { left: 58, top: 36, w: 18, h: 14 },
  SGB: { left: 52, top: 62, w: 16, h: 12 },
  SJB: { left: 22, top: 68, w: 18, h: 12 },
  JEJ: { left: 28, top: 82, w: 14, h: 10 },
};

interface Props {
  visitedRegionCodes: string[];
  width?: number;
  height?: number;
}

export function MiniKoreaMap({ visitedRegionCodes, width = 160, height = 100 }: Props) {
  const visited = new Set(visitedRegionCodes);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.outline} />
      {REGIONS.map((region) => {
        const layout = REGION_LAYOUT[region.code];
        if (!layout) return null;
        const isVisited = visited.has(region.code);
        return (
          <View
            key={region.code}
            style={[
              styles.region,
              {
                left: (layout.left / 100) * width,
                top: (layout.top / 100) * height,
                width: (layout.w / 100) * width,
                height: (layout.h / 100) * height,
                backgroundColor: isVisited ? region.color : 'rgba(148,163,184,0.25)',
                opacity: isVisited ? 1 : 0.5,
                borderColor: isVisited ? region.color : 'rgba(148,163,184,0.4)',
              },
            ]}
          >
            {isVisited ? <Text style={styles.check}>✓</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  outline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
    borderRadius: theme.radius.sm,
  },
  region: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 8, fontWeight: '800' },
});
`);

write('vercel.json', `{
  "buildCommand": "npm run web --workspace=mobile",
  "outputDirectory": "apps/mobile/dist",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
`);

console.log('Batch 1 complete');
