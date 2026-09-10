import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, apikey, Content-Type", "Content-Type": "application/json" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  const auth = req.headers.get("Authorization");
  if (!auth) return response({ success: false, error: "Authentication required" }, 401);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const body = await req.json().catch(() => ({}));
  const { data, error } = await client.rpc("create_point_redemption_session", { p_requested_points: Number(body.requestedPoints || 0), p_channel: String(body.channel || "email") });
  if (error) return response({ success: false, error: /No redeemable/i.test(error.message) ? "目前可用點數不足。" : "無法建立點數驗證工作階段。" }, 400);
  return response(data as Record<string, unknown>);
});
