import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const secretCache = new Map<string, string>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getSecret(name: string): Promise<string> {
  const envValue = Deno.env.get(name);
  if (envValue) return envValue;
  const cached = secretCache.get(name);
  if (cached) return cached;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error(`${name} is not configured`);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/app_secrets?key=eq.${encodeURIComponent(name)}&select=value&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!res.ok) throw new Error(`${name} is not configured`);
  const rows = await res.json();
  const value = rows?.[0]?.value;
  if (!value) throw new Error(`${name} is not configured`);
  secretCache.set(name, value);
  return value;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wrapper(title: string, content: string) {
  return `<!doctype html>
<html lang="zh-TW">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4ead8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#24180d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f4ead8;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(36,24,13,.12);">
        <tr><td style="background:#24180d;color:#fff;padding:28px 32px;">
          <div style="font-size:26px;font-weight:800;">Nestobi 根本在旅行</div>
          <div style="font-size:13px;color:#e7d8c0;margin-top:4px;">${escapeHtml(title)}</div>
        </td></tr>
        <tr><td style="padding:32px;">${content}</td></tr>
      </table>
      <div style="font-size:12px;color:#8a7864;margin-top:18px;">© 2026 Nestobi. 這是一封系統通知信。</div>
    </td></tr>
  </table>
</body>
</html>`;
}

function verificationEmail(otp: string, displayName?: string) {
  return wrapper(
    "會員驗證碼",
    `<h1 style="font-size:22px;margin:0 0 12px;">你好，${escapeHtml(displayName || "旅人")}</h1>
    <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 22px;">請使用以下驗證碼完成註冊。驗證碼 10 分鐘內有效。</p>
    <div style="background:#f4ead8;border:2px dashed #9b7a4f;border-radius:14px;padding:24px;text-align:center;margin:0 0 22px;">
      <div style="font-size:42px;letter-spacing:10px;font-weight:800;color:#24180d;">${escapeHtml(otp)}</div>
    </div>
    <p style="font-size:13px;line-height:1.7;color:#8a7864;margin:0;">若你沒有註冊 Nestobi，請忽略這封信。</p>`,
  );
}

function resetEmail(resetLink: string) {
  return wrapper(
    "重設密碼",
    `<h1 style="font-size:22px;margin:0 0 12px;">重設你的密碼</h1>
    <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 22px;">請點擊下方按鈕設定新密碼。連結 30 分鐘內有效。</p>
    <p style="text-align:center;margin:0 0 24px;"><a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#24180d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;">重設密碼</a></p>
    <p style="font-size:12px;line-height:1.7;color:#8a7864;word-break:break-all;margin:0;">${escapeHtml(resetLink)}</p>`,
  );
}

function bookingEmail(data: Record<string, unknown>) {
  return wrapper(
    "訂房確認",
    `<h1 style="font-size:22px;margin:0 0 12px;">訂房已建立</h1>
    <p style="font-size:15px;line-height:1.7;color:#5f5041;">${escapeHtml(data.displayName || "旅人")}，你的訂房資訊如下：</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">
      <tr><td style="padding:7px 0;color:#806d58;">房型</td><td align="right" style="font-weight:700;">${escapeHtml(data.roomName)}</td></tr>
      <tr><td style="padding:7px 0;color:#806d58;">地點</td><td align="right">${escapeHtml(data.location)}</td></tr>
      <tr><td style="padding:7px 0;color:#806d58;">入住</td><td align="right">${escapeHtml(data.checkIn)}</td></tr>
      <tr><td style="padding:7px 0;color:#806d58;">退房</td><td align="right">${escapeHtml(data.checkOut)}</td></tr>
      <tr><td style="padding:7px 0;color:#806d58;">總金額</td><td align="right" style="font-weight:800;color:#8b5e2f;">NT$ ${Number(data.totalPrice || 0).toLocaleString("zh-TW")}</td></tr>
    </table>`,
  );
}

function orderEmail(data: Record<string, unknown>) {
  const items = Array.isArray(data.items) ? data.items : [];
  const rows = items.map((item: Record<string, unknown>) =>
    `<tr><td style="padding:8px 0;">${escapeHtml(item.name)}</td><td align="center">${escapeHtml(item.quantity)}</td><td align="right">NT$ ${(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString("zh-TW")}</td></tr>`
  ).join("");
  return wrapper(
    "訂單確認",
    `<h1 style="font-size:22px;margin:0 0 12px;">訂單已建立</h1>
    <p style="font-size:15px;line-height:1.7;color:#5f5041;">${escapeHtml(data.displayName || "旅人")}，謝謝你的購買。</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">${rows}
      <tr><td colspan="2" style="border-top:1px solid #decfb9;padding-top:12px;font-weight:700;">總金額</td><td align="right" style="border-top:1px solid #decfb9;padding-top:12px;font-weight:800;color:#8b5e2f;">NT$ ${Number(data.totalAmount || 0).toLocaleString("zh-TW")}</td></tr>
    </table>`,
  );
}

function contactEmail(data: Record<string, unknown>) {
  return wrapper(
    "新聯絡表單",
    `<h1 style="font-size:22px;margin:0 0 12px;">收到新的聯絡訊息</h1>
    <p><strong>姓名：</strong>${escapeHtml(data.name)}</p>
    <p><strong>Email：</strong>${escapeHtml(data.email)}</p>
    <p><strong>主旨：</strong>${escapeHtml(data.subject)}</p>
    <div style="background:#f8f4ee;border-radius:12px;padding:16px;white-space:pre-wrap;line-height:1.7;">${escapeHtml(data.message)}</div>`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { type, to, data = {} } = await req.json();
    let subject = "";
    let html = "";
    let toAddress = String(to || "");

    if (type === "verification") {
      subject = "Nestobi 會員驗證碼";
      html = verificationEmail(String(data.otp || ""), data.displayName);
    } else if (type === "reset-password") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service key is not configured");
      const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase.from("password_reset_tokens").insert({ email: toAddress, token, expires_at: expiresAt });
      const siteUrl = data.siteUrl || "http://localhost:5174";
      subject = "Nestobi 重設密碼";
      html = resetEmail(`${siteUrl}/auth/new-password?token=${encodeURIComponent(token)}`);
    } else if (type === "booking-confirmation") {
      subject = "Nestobi 訂房確認";
      html = bookingEmail(data);
    } else if (type === "order-confirmation") {
      subject = "Nestobi 訂單確認";
      html = orderEmail(data);
    } else if (type === "contact") {
      subject = `Nestobi 聯絡表單：${String(data.subject || "未命名")}`;
      toAddress = String(to || "service@travel.com.tw");
      html = contactEmail(data);
    } else {
      return json({ error: "Invalid type" }, 400);
    }

    if (!toAddress) return json({ error: "Missing recipient" }, 400);
    const resendApiKey = await getSecret("RESEND_API_KEY");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nestobi <onboarding@resend.dev>",
        to: [toAddress],
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) return json({ error: "Email send failed", details: result }, 500);
    return json({ success: true, id: result.id });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
