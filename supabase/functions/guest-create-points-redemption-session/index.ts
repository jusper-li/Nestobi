import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const hash = async (value: string) => { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes)).map(v => v.toString(16).padStart(2, "0")).join(""); };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const memberToken = String(body.memberToken || ""); const guestToken = String(body.guestCheckoutToken || "");
    const requestedPoints = Math.floor(Number(body.requestedPoints || 0));
    if (!memberToken || !guestToken || requestedPoints <= 0) return json({ success: false, error: "點數驗證資料不完整。" }, 400);
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: token } = await service.from("point_member_lookup_tokens").select("member_id").eq("token_hash", await hash(memberToken)).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (!token) return json({ success: false, error: "會員驗證已失效，請重新查詢。" }, 400);
    const { data: balance } = await service.from("member_point_balances").select("current_points,reserved_points").eq("user_id", token.member_id).maybeSingle();
    const available = Math.max(0, Number(balance?.current_points || 0) - Number(balance?.reserved_points || 0));
    if (requestedPoints > available) return json({ success: false, error: "目前可用點數不足。" }, 400);
    const { data: session, error } = await service.from("point_redemption_sessions").insert({ user_id: null, member_id: token.member_id, guest_checkout_token: guestToken, requested_points: requestedPoints, calculated_discount: requestedPoints, verification_channel: "email", status: "pending_otp" }).select("id,requested_points,calculated_discount").single();
    if (error) return json({ success: false, error: "無法建立點數驗證工作階段。" }, 400);
    return json({ success: true, sessionId: session.id, requestedPoints: session.requested_points, discountAmount: session.calculated_discount });
  } catch (error) { console.error("[guest-create-points-redemption-session]", error); return json({ success: false, error: "點數驗證失敗。" }, 500); }
});
