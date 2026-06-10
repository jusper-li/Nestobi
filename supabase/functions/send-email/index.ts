import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Locale = "zh-TW" | "en" | "ja" | "ko";

const secretCache = new Map<string, string>();

function normalizeLocale(value: unknown): Locale {
  const raw = String(value ?? "").toLowerCase();
  if (raw.startsWith("zh")) return "zh-TW";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("ko")) return "ko";
  return "en";
}

function localeTag(locale: Locale) {
  return {
    "zh-TW": "zh-TW",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
  }[locale];
}

function localeCopy(locale: Locale) {
  switch (locale) {
    case "zh-TW":
      return {
        wrapperTitle: "Nestobi 根本在旅行",
        systemNotice: "此信件為系統通知",
        verificationTitle: "會員驗證碼",
        verificationHello: "您好",
        verificationBody: "請輸入以下 6 碼驗證碼完成註冊，驗證碼 10 分鐘內有效。",
        verificationIgnore: "若非本人操作，請忽略此信件。",
        resetTitle: "重設密碼",
        resetBody: "請點擊下方按鈕重新設定密碼，連結 30 分鐘內有效。",
        resetButton: "重設密碼",
        bookingTitle: "訂房確認",
        bookingBody: "以下是您的訂房資訊：",
        orderTitle: "訂單確認",
        orderBody: "感謝您的訂購，以下是訂單資訊：",
        contactTitle: "聯絡表單",
        contactBody: "收到新的聯絡訊息：",
        total: "總計",
        room: "房型",
        location: "地點",
        checkIn: "入住",
        checkOut: "退房",
        item: "品項",
        qty: "數量",
        price: "金額",
        name: "姓名",
        email: "電子郵件",
        subject: "主旨",
        message: "內容",
      };
    case "ja":
      return {
        wrapperTitle: "Nestobi 根本在旅行",
        systemNotice: "このメールはシステム通知です。",
        verificationTitle: "認証コード",
        verificationHello: "こんにちは",
        verificationBody: "登録を完了するため、以下の6桁の認証コードを入力してください。有効期限は10分です。",
        verificationIgnore: "心当たりがない場合は、このメールを無視してください。",
        resetTitle: "パスワードを再設定",
        resetBody: "下のボタンから新しいパスワードを設定してください。リンクの有効期限は30分です。",
        resetButton: "パスワードを再設定",
        bookingTitle: "予約確認",
        bookingBody: "ご予約内容は以下のとおりです。",
        orderTitle: "注文確認",
        orderBody: "ご注文ありがとうございます。注文内容は以下のとおりです。",
        contactTitle: "お問い合わせ",
        contactBody: "新しいお問い合わせを受信しました。",
        total: "合計",
        room: "部屋タイプ",
        location: "場所",
        checkIn: "チェックイン",
        checkOut: "チェックアウト",
        item: "商品",
        qty: "数量",
        price: "金額",
        name: "お名前",
        email: "メールアドレス",
        subject: "件名",
        message: "内容",
      };
    case "ko":
      return {
        wrapperTitle: "Nestobi 根本在旅行",
        systemNotice: "이 메일은 시스템 알림입니다.",
        verificationTitle: "인증 코드",
        verificationHello: "안녕하세요",
        verificationBody: "가입을 완료하려면 아래 6자리 인증 코드를 입력해 주세요. 인증 코드는 10분 동안 유효합니다.",
        verificationIgnore: "본인이 요청하지 않았다면 이 메일을 무시해 주세요.",
        resetTitle: "비밀번호 재설정",
        resetBody: "아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 링크는 30분 동안 유효합니다.",
        resetButton: "비밀번호 재설정",
        bookingTitle: "예약 확인",
        bookingBody: "예약 정보는 아래와 같습니다.",
        orderTitle: "주문 확인",
        orderBody: "주문해 주셔서 감사합니다. 주문 정보는 아래와 같습니다.",
        contactTitle: "문의 폼",
        contactBody: "새 문의 메시지를 받았습니다.",
        total: "합계",
        room: "객실 유형",
        location: "위치",
        checkIn: "체크인",
        checkOut: "체크아웃",
        item: "상품",
        qty: "수량",
        price: "금액",
        name: "이름",
        email: "이메일",
        subject: "제목",
        message: "내용",
      };
    default:
      return {
        wrapperTitle: "Nestobi Rooted Travel",
        systemNotice: "This is a system notification email.",
        verificationTitle: "Verification code",
        verificationHello: "Hello",
        verificationBody: "Enter the 6-digit code below to complete your registration. The code is valid for 10 minutes.",
        verificationIgnore: "If you did not request this, you can ignore this email.",
        resetTitle: "Reset password",
        resetBody: "Click the button below to set a new password. The link is valid for 30 minutes.",
        resetButton: "Reset password",
        bookingTitle: "Booking confirmation",
        bookingBody: "Here is your booking information:",
        orderTitle: "Order confirmation",
        orderBody: "Thanks for your purchase. Here are your order details:",
        contactTitle: "Contact form",
        contactBody: "A new contact message has been received:",
        total: "Total",
        room: "Room",
        location: "Location",
        checkIn: "Check in",
        checkOut: "Check out",
        item: "Item",
        qty: "Qty",
        price: "Price",
        name: "Name",
        email: "Email",
        subject: "Subject",
        message: "Message",
      };
  }
}

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

function wrapper(locale: Locale, title: string, content: string) {
  const copy = localeCopy(locale);
  return `<!doctype html>
<html lang="${localeTag(locale)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;background:#f4ead8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#24180d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f4ead8;">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(36,24,13,.12);">
        <tr><td style="background:#24180d;color:#fff;padding:28px 32px;">
          <div style="font-size:26px;font-weight:800;">${escapeHtml(copy.wrapperTitle)}</div>
          <div style="font-size:13px;color:#e7d8c0;margin-top:4px;">${escapeHtml(title)}</div>
        </td></tr>
        <tr><td style="padding:32px;">${content}</td></tr>
      </table>
      <div style="font-size:12px;color:#8a7864;margin-top:18px;">© 2026 Nestobi. ${escapeHtml(copy.systemNotice)}</div>
    </td></tr>
  </table>
</body>
</html>`;
}

function verificationEmail(locale: Locale, otp: string, displayName?: string) {
  const copy = localeCopy(locale);
  return wrapper(
    locale,
    copy.verificationTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(copy.verificationHello)}, ${escapeHtml(displayName || "traveler")}</h1>
     <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 22px;">${escapeHtml(copy.verificationBody)}</p>
     <div style="background:#f4ead8;border:2px dashed #9b7a4f;border-radius:14px;padding:24px;text-align:center;margin:0 0 22px;">
       <div style="font-size:42px;letter-spacing:10px;font-weight:800;color:#24180d;">${escapeHtml(otp)}</div>
     </div>
     <p style="font-size:13px;line-height:1.7;color:#8a7864;margin:0;">${escapeHtml(copy.verificationIgnore)}</p>`,
  );
}

function resetEmail(locale: Locale, resetLink: string) {
  const copy = localeCopy(locale);
  return wrapper(
    locale,
    copy.resetTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(copy.resetTitle)}</h1>
     <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 22px;">${escapeHtml(copy.resetBody)}</p>
     <p style="text-align:center;margin:0 0 24px;">
       <a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#24180d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;">${escapeHtml(copy.resetButton)}</a>
     </p>
     <p style="font-size:12px;line-height:1.7;color:#8a7864;word-break:break-all;margin:0;">${escapeHtml(resetLink)}</p>`,
  );
}

function bookingEmail(locale: Locale, data: Record<string, unknown>) {
  const copy = localeCopy(locale);
  const totalPrice = Number(data.totalPrice || 0);

  return wrapper(
    locale,
    copy.bookingTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(copy.bookingTitle)}</h1>
     <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 18px;">${escapeHtml(data.displayName || "traveler")}, ${escapeHtml(copy.bookingBody)}</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">
       <tr><td style="padding:7px 0;color:#806d58;">${escapeHtml(copy.room)}</td><td align="right" style="font-weight:700;">${escapeHtml(data.roomName)}</td></tr>
       <tr><td style="padding:7px 0;color:#806d58;">${escapeHtml(copy.location)}</td><td align="right">${escapeHtml(data.location)}</td></tr>
       <tr><td style="padding:7px 0;color:#806d58;">${escapeHtml(copy.checkIn)}</td><td align="right">${escapeHtml(data.checkIn)}</td></tr>
       <tr><td style="padding:7px 0;color:#806d58;">${escapeHtml(copy.checkOut)}</td><td align="right">${escapeHtml(data.checkOut)}</td></tr>
       <tr><td style="padding:7px 0;color:#806d58;">${escapeHtml(copy.total)}</td><td align="right" style="font-weight:800;color:#8b5e2f;">NT$ ${totalPrice.toLocaleString(localeTag(locale))}</td></tr>
     </table>`,
  );
}

function orderEmail(locale: Locale, data: Record<string, unknown>) {
  const copy = localeCopy(locale);
  const items = Array.isArray(data.items) ? data.items : [];
  const rows = items
    .map((item: Record<string, unknown>) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      return `<tr>
        <td style="padding:8px 0;">${escapeHtml(item.name)}</td>
        <td align="center">${escapeHtml(quantity)}</td>
        <td align="right">NT$ ${(price * quantity).toLocaleString(localeTag(locale))}</td>
      </tr>`;
    })
    .join("");

  return wrapper(
    locale,
    copy.orderTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(copy.orderTitle)}</h1>
     <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 18px;">${escapeHtml(data.displayName || "traveler")}, ${escapeHtml(copy.orderBody)}</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">
       <tr>
         <th align="left" style="padding:8px 0;color:#806d58;font-size:13px;font-weight:700;">${escapeHtml(copy.item)}</th>
         <th align="center" style="padding:8px 0;color:#806d58;font-size:13px;font-weight:700;">${escapeHtml(copy.qty)}</th>
         <th align="right" style="padding:8px 0;color:#806d58;font-size:13px;font-weight:700;">${escapeHtml(copy.price)}</th>
       </tr>
       ${rows}
       <tr><td colspan="2" style="border-top:1px solid #decfb9;padding-top:12px;font-weight:700;">${escapeHtml(copy.total)}</td><td align="right" style="border-top:1px solid #decfb9;padding-top:12px;font-weight:800;color:#8b5e2f;">NT$ ${Number(data.totalAmount || 0).toLocaleString(localeTag(locale))}</td></tr>
     </table>`,
  );
}

function contactEmail(locale: Locale, data: Record<string, unknown>) {
  const copy = localeCopy(locale);
  return wrapper(
    locale,
    copy.contactTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(copy.contactBody)}</h1>
     <p><strong>${escapeHtml(copy.name)}:</strong> ${escapeHtml(data.name)}</p>
     <p><strong>${escapeHtml(copy.email)}:</strong> ${escapeHtml(data.email)}</p>
     <p><strong>${escapeHtml(copy.subject)}:</strong> ${escapeHtml(data.subject)}</p>
     <div style="background:#f8f4ee;border-radius:12px;padding:16px;white-space:pre-wrap;line-height:1.7;">${escapeHtml(data.message)}</div>`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { type, to, data = {} } = await req.json();
    const locale = normalizeLocale(data.lang);
    let subject = "";
    let html = "";
    let toAddress = String(to || "");

    if (type === "verification") {
      const copy = localeCopy(locale);
      subject = copy.verificationTitle;
      html = verificationEmail(locale, String(data.otp || ""), data.displayName);
    } else if (type === "reset-password") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service key is not configured");

      const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase.from("password_reset_tokens").insert({ email: toAddress, token, expires_at: expiresAt });

      const siteUrl = String(data.siteUrl || "http://localhost:5174");
      subject = localeCopy(locale).resetTitle;
      html = resetEmail(locale, `${siteUrl}/auth/new-password?token=${encodeURIComponent(token)}`);
    } else if (type === "booking-confirmation") {
      subject = localeCopy(locale).bookingTitle;
      html = bookingEmail(locale, data);
    } else if (type === "order-confirmation") {
      subject = localeCopy(locale).orderTitle;
      html = orderEmail(locale, data);
    } else if (type === "contact") {
      const copy = localeCopy(locale);
      subject = `${copy.contactTitle}: ${String(data.subject || "untitled")}`;
      toAddress = String(to || "service@dlalshop.com");
      html = contactEmail(locale, data);
    } else {
      return json({ error: "Invalid type" }, 400);
    }

    if (!toAddress) return json({ error: "Missing recipient" }, 400);

    const resendApiKey = await getSecret("RESEND_API_KEY");
    const fromAddress = await getSecret("RESEND_FROM_EMAIL")
      .then((email) => (email.includes("<") ? email : `Nestobi <${email}>`))
      .catch(() => "Nestobi <onboarding@resend.dev>");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        subject,
        html,
      }),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      return json({ error: "Email send failed", from: fromAddress, details: result }, 500);
    }

    return json({ success: true, id: result.id });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
