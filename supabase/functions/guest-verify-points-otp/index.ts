import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const hash = async (value: string) => { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes)).map(v => v.toString(16).padStart(2, "0")).join(""); };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  try {
    const body = await req.json().catch(() => ({})); const memberToken = String(body.memberToken || "");
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: token } = await service.from("point_member_lookup_tokens").select("member_id").eq("token_hash", await hash(memberToken)).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (!token) return json({ success: false, error: "會員驗證已失效，請重新查詢。" }, 400);
    const { data, error } = await service.rpc("verify_guest_point_otp", { p_request_id: body.otpRequestId, p_member_id: token.member_id, p_otp_hash: await hash(String(body.otp || "")) });
    if (error) return json({ success: false, error: "驗證碼錯誤或已失效，請重新輸入。" }, 400);
    return json(data as Record<string, unknown>);
  } catch (error) { console.error("[guest-verify-points-otp]", error); return json({ success: false, error: "驗證碼驗證失敗。" }, 500); }
});
