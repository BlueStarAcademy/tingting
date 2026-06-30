import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
