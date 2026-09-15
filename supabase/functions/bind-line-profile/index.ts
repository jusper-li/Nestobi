import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "POST required" }, 405);
  const authHeader = req.headers.get("Authorization") || ""; const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const client = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_ANON_KEY") || "", { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await client.auth.getUser(); if (!user) return json({ ok: false, error: "Authentication required" }, 401);
  const body = await req.json().catch(() => ({})); const idToken = typeof body.idToken === "string" ? body.idToken : ""; const channelId = (Deno.env.get("LINE_LOGIN_CHANNEL_ID") || Deno.env.get("LINE_CHANNEL_ID") || "").trim();
  if (!idToken || !channelId) return json({ ok: false, error: "LINE binding is not configured" }, 400);
  const verifyBody = new URLSearchParams({ id_token: idToken, client_id: channelId }); const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: verifyBody });
  if (!verifyRes.ok) return json({ ok: false, error: "LINE token verification failed" }, 400);
  const verified = await verifyRes.json(); const lineUserId = typeof verified.sub === "string" ? verified.sub : ""; if (!lineUserId) return json({ ok: false, error: "LINE user id missing" }, 400);
  const admin = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  const { data: existing } = await admin.from("user_line_accounts").select("user_id").eq("line_user_id", lineUserId).maybeSingle(); if (existing && existing.user_id !== user.id) return json({ ok: false, error: "此 LINE 帳號已綁定其他會員" }, 409);
  const now = new Date().toISOString(); const { data, error } = await admin.from("user_line_accounts").upsert({ user_id: user.id, line_user_id: lineUserId, line_display_name: String(verified.name || "LINE 會員").slice(0, 120), line_picture_url: typeof verified.picture === "string" ? verified.picture : null, is_active: true, bound_at: now, unbound_at: null, updated_at: now }, { onConflict: "user_id" }).select("id,line_user_id,line_display_name,line_picture_url,is_active,bound_at,unbound_at").single();
  if (error) return json({ ok: false, error: "LINE 綁定儲存失敗" }, 500); return json({ ok: true, account: data });
});
