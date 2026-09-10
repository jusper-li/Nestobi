import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const hash = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(v => v.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!phone && !email) return json({ success: false, error: "請輸入手機或 Email。" }, 400);
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: member, error } = await service.rpc("lookup_guest_member", { p_phone: phone || null, p_email: email || null });
    const found = Array.isArray(member) ? member[0] : member;
    if (error || !found?.member_id) return json({ success: true, matched: false });
    const rawToken = crypto.randomUUID();
    const identifierHash = await hash(`${phone.replace(/[^0-9+]/g, "")}|${email}`);
    const { error: tokenError } = await service.from("point_member_lookup_tokens").insert({ token_hash: await hash(rawToken), member_id: found.member_id, identifier_hash: identifierHash });
    if (tokenError) return json({ success: false, error: "無法建立會員驗證工作階段。" }, 500);
    const maskedEmail = String(found.member_email || "");
    return json({ success: true, matched: true, memberToken: rawToken, availablePoints: Number(found.available_points || 0), maskedEmail: maskedEmail.includes("@") ? `${maskedEmail.slice(0, 2)}••••@${maskedEmail.split("@")[1]}` : "" });
  } catch (error) {
    console.error("[guest-lookup-member-points]", error);
    return json({ success: false, error: "會員資料查詢失敗。" }, 500);
  }
});
