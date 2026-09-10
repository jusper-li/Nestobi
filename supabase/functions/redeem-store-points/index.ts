import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const hash = async (value: string) => { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes)).map((v) => v.toString(16).padStart(2, "0")).join(""); };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.checkoutToken || "").trim();
    const points = Math.floor(Number(body.points || 0));
    if (!token || points <= 0) return json({ success: false, error: "抵用資料不完整。" }, 400);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader !== "Bearer undefined") {
      const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await authClient.auth.getUser();
      if (user) {
        const { data, error } = await authClient.rpc("redeem_logged_in_store_points", { p_checkout_token: token, p_points: points });
        if (error) return json({ success: false, error: error.message }, 400);
        return json(data as Record<string, unknown>);
      }
    }
    const memberToken = String(body.memberToken || "");
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const memberHash = await hash(memberToken);
    const { data: lookup } = await service.from("point_member_lookup_tokens").select("member_id").eq("token_hash", memberHash).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (!lookup?.member_id) return json({ success: false, error: "會員驗證已失效，請重新查詢。" }, 400);
    const { data, error } = await service.rpc("redeem_guest_store_points", { p_checkout_token: token, p_session_id: body.sessionId || null, p_points: points });
    if (error) return json({ success: false, error: error.message }, 400);
    return json(data as Record<string, unknown>);
  } catch (error) {
    console.error("[redeem-store-points]", error);
    return json({ success: false, error: error instanceof Error ? error.message : "點數抵用失敗。" }, 500);
  }
});
