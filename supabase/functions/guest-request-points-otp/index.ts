import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const hash = async (value: string) => { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes)).map(v => v.toString(16).padStart(2, "0")).join(""); };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("", { headers: cors });
  try {
    const body = await req.json().catch(() => ({})); const sessionId = String(body.sessionId || ""); const memberToken = String(body.memberToken || "");
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: token } = await service.from("point_member_lookup_tokens").select("member_id").eq("token_hash", await hash(memberToken)).gt("expires_at", new Date().toISOString()).maybeSingle();
    const { data: session } = await service.from("point_redemption_sessions").select("id,member_id,requested_points,calculated_discount,status,expires_at").eq("id", sessionId).maybeSingle();
    if (!token || !session || session.member_id !== token.member_id || session.status !== "pending_otp" || new Date(session.expires_at) <= new Date()) return json({ success: false, error: "點數驗證工作階段已失效，請重新操作。" }, 400);
    const { data: authUser } = await service.auth.admin.getUserById(token.member_id); const email = authUser.user?.email || "";
    const resendKey = Deno.env.get("RESEND_API_KEY"); if (!email || !resendKey) return json({ success: false, error: "目前無法寄送 Email 驗證碼。" }, 503);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const { data: request, error } = await service.from("point_otp_requests").insert({ session_id: session.id, user_id: null, member_id: token.member_id, guest_checkout_token: body.guestCheckoutToken || null, channel: "email", masked_identifier: `${email.slice(0, 2)}••••@${email.split("@")[1]}`, otp_hash: await hash(otp), requested_points: session.requested_points, calculated_discount: session.calculated_discount }).select("id").single();
    if (error) return json({ success: false, error: "無法建立驗證碼。" }, 400);
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
    const mail = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [email], subject: "Nestobi 點數兌換驗證碼", html: `<p>您正在使用 ${session.requested_points} 點會員點數。</p><p style="font-size:30px;letter-spacing:8px;font-weight:800">${otp}</p><p>驗證碼 5 分鐘內有效。</p>` }) });
    if (!mail.ok) return json({ success: false, error: "驗證碼寄送失敗。" }, 502);
    return json({ success: true, otpRequestId: request.id, maskedIdentifier: `${email.slice(0, 2)}••••@${email.split("@")[1]}` });
  } catch (error) { console.error("[guest-request-points-otp]", error); return json({ success: false, error: "驗證碼寄送失敗。" }, 500); }
});
