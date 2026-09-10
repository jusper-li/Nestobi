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
  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user } } = await client.auth.getUser();
  if (!user) return response({ success: false, error: "Authentication required" }, 401);
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "");
  const channel = String(body.channel || "email");
  if (channel !== "email") return response({ success: false, error: "目前尚未設定簡訊驗證服務，請改用 Email。" }, 400);
  const { data: session, error: sessionError } = await service.from("point_redemption_sessions").select("id,user_id,requested_points,calculated_discount,status,expires_at").eq("id", sessionId).eq("user_id", user.id).maybeSingle();
  if (sessionError || !session || session.status !== "pending_otp" || new Date(session.expires_at) <= new Date()) return response({ success: false, error: "點數驗證工作階段已失效，請重新操作。" }, 400);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await hash(otp);
  const { data: otpRequest, error } = await service.from("point_otp_requests").insert({ session_id: session.id, user_id: user.id, channel, masked_identifier: user.email ? `${user.email.slice(0, 2)}••••@${user.email.split("@")[1]}` : null, otp_hash: otpHash, requested_points: session.requested_points, calculated_discount: session.calculated_discount }).select("id").single();
  if (error) return response({ success: false, error: "無法建立驗證碼，請稍後再試。" }, 400);
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
  if (!user.email || !resendKey) return response({ success: false, error: "目前無法寄送 Email 驗證碼，請稍後再試。" }, 503);
  const mail = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [user.email], subject: "Nestobi 點數兌換驗證碼", html: `<div style="font-family:Arial,sans-serif;line-height:1.7"><h2>Nestobi 點數兌換驗證碼</h2><p>您正在使用 ${session.requested_points} 點會員點數。</p><p style="font-size:30px;letter-spacing:8px;font-weight:800">${otp}</p><p>驗證碼 5 分鐘內有效，請勿提供給他人。</p></div>` }) });
  if (!mail.ok) return response({ success: false, error: "驗證碼寄送失敗，請稍後再試。" }, 502);
  await service.from("point_audit_logs").insert({ user_id: user.id, session_id: session.id, otp_request_id: otpRequest.id, action: "request_otp", status: "sent", channel, points: session.requested_points, discount_amount: session.calculated_discount });
  return response({ success: true, otpRequestId: otpRequest.id, maskedIdentifier: user.email ? `${user.email.slice(0, 2)}••••@${user.email.split("@")[1]}` : "" });
});
