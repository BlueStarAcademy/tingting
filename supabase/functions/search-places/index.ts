import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
