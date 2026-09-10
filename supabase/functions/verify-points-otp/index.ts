import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, apikey, Content-Type", "Content-Type": "application/json" };
const response = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
async function hash(value: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes)).map(v => v.toString(16).padStart(2, "0")).join(""); }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  const auth = req.headers.get("Authorization");
  if (!auth) return response({ success: false, error: "Authentication required" }, 401);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const body = await req.json().catch(() => ({}));
  const { data, error } = await client.rpc("verify_point_otp", { p_request_id: body.otpRequestId, p_otp_hash: await hash(String(body.otp || "")) });
  if (error) return response({ success: false, error: /expired/i.test(error.message) ? "驗證碼已失效，請重新取得。" : "驗證碼錯誤，請重新輸入。" }, 400);
  return response(data as Record<string, unknown>);
});
