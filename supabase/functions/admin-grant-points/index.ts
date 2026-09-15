import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ success: false, error: "Unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ success: false, error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roleRow } = await admin.from("tbl_user_auth").select("role,is_active").eq("user_id", authData.user.id).maybeSingle();
  if (roleRow?.role !== "superadmin" || roleRow.is_active === false) return json({ success: false, error: "Super admin access required" }, 403);

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const amount = Math.floor(Number(body.amount));
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!userId || !Number.isInteger(amount) || amount <= 0 || amount > 10000000) return json({ success: false, error: "請輸入有效的會員與點數（1 至 10,000,000）。" }, 400);

  const { data: member } = await admin.from("tbl_user_auth").select("user_id").eq("user_id", userId).maybeSingle();
  if (!member) return json({ success: false, error: "找不到指定會員。" }, 404);
  const { data: record, error } = await admin.from("points").insert({ user_id: userId, amount, transaction_type: "admin_grant", description: note || "超級管理員贈送點數", source_type: "admin_grant", granted_by: authData.user.id, grant_note: note || null }).select("id,user_id,amount,transaction_type,description,source_type,granted_by,grant_note,created_at").single();
  if (error) return json({ success: false, error: "點數贈送紀錄建立失敗。" }, 500);
  return json({ success: true, record });
});
