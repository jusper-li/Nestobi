import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Locale = "zh-TW" | "en" | "ja" | "ko";

type MailCopy = {
  wrapperTitle: string;
  systemNotice: string;
  verificationTitle: string;
  verificationHello: string;
  verificationBody: string;
  verificationIgnore: string;
  resetTitle: string;
  resetBody: string;
  resetButton: string;
  bookingTitle: string;
  bookingBody: string;
  orderTitle: string;
  orderBody: string;
  contactTitle: string;
  contactBody: string;
  total: string;
  subtotal: string;
  discount: string;
  pointsEarned: string;
  room: string;
  location: string;
  checkIn: string;
  checkOut: string;
  nights: string;
  guests: string;
  bookingNo: string;
  item: string;
  qty: string;
  price: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  paymentMethod: string;
  paymentStatus: string;
  specialRequests: string;
  supportNote: string;
  orderNo: string;
  shippingAddress: string;
  shippingMethod: string;
};

const secretCache = new Map<string, string>();

function normalizeLocale(value: unknown): Locale {
  const raw = String(value ?? "").toLowerCase();
  if (raw.startsWith("zh")) return "zh-TW";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("ko")) return "ko";
  return "en";
}

function localeTag(locale: Locale): string {
  return {
    "zh-TW": "zh-TW",
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
  }[locale];
}

function text(locale: Locale, values: Record<Locale, string>): string {
  return values[locale] ?? values.en;
}

function copy(locale: Locale): MailCopy {
  return {
    wrapperTitle: text(locale, {
      "zh-TW": "Nestobi 根本在旅行",
      en: "Nestobi Rooted Travel",
      ja: "Nestobi 旅行",
      ko: "Nestobi 여행",
    }),
    systemNotice: text(locale, {
      "zh-TW": "這是一封系統通知信。",
      en: "This is a system notification email.",
      ja: "これはシステム通知メールです。",
      ko: "이 메일은 시스템 알림입니다.",
    }),
    verificationTitle: text(locale, {
      "zh-TW": "驗證碼通知",
      en: "Verification code",
      ja: "認証コード",
      ko: "인증 코드",
    }),
    verificationHello: text(locale, {
      "zh-TW": "您好",
      en: "Hello",
      ja: "こんにちは",
      ko: "안녕하세요",
    }),
    verificationBody: text(locale, {
      "zh-TW": "請輸入下方 6 位數驗證碼完成註冊，驗證碼有效時間為 10 分鐘。",
      en: "Enter the 6-digit code below to complete your registration. The code is valid for 10 minutes.",
      ja: "下記の6桁の認証コードを入力して登録を完了してください。コードの有効期限は10分です。",
      ko: "아래의 6자리 인증 코드를 입력하여 가입을 완료해 주세요. 코드는 10분 동안 유효합니다.",
    }),
    verificationIgnore: text(locale, {
      "zh-TW": "若非您本人操作，請忽略此郵件。",
      en: "If you did not request this, you can ignore this email.",
      ja: "ご自身で依頼していない場合は、このメールを無視してください。",
      ko: "본인이 요청하지 않았다면 이 메일을 무시해 주세요.",
    }),
    resetTitle: text(locale, {
      "zh-TW": "重設密碼",
      en: "Reset password",
      ja: "パスワードを再設定",
      ko: "비밀번호 재설정",
    }),
    resetBody: text(locale, {
      "zh-TW": "請點擊下方按鈕設定新密碼。連結有效時間為 30 分鐘。",
      en: "Click the button below to set a new password. The link is valid for 30 minutes.",
      ja: "下のボタンから新しいパスワードを設定してください。リンクの有効期限は30分です。",
      ko: "아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 링크는 30분 동안 유효합니다.",
    }),
    resetButton: text(locale, {
      "zh-TW": "前往重設密碼",
      en: "Reset password",
      ja: "パスワードを再設定",
      ko: "비밀번호 재설정",
    }),
    bookingTitle: text(locale, {
      "zh-TW": "訂房資訊已確認",
      en: "Booking confirmed",
      ja: "予約が確認されました",
      ko: "예약이 확인되었습니다",
    }),
    bookingBody: text(locale, {
      "zh-TW": "以下是您的訂房明細，請妥善保存。",
      en: "Here is your booking summary. Please keep it for reference.",
      ja: "ご予約内容の詳細です。大切に保管してください。",
      ko: "예약 상세 내역입니다. 참고용으로 보관해 주세요.",
    }),
    orderTitle: text(locale, {
      "zh-TW": "訂單資訊已確認",
      en: "Order confirmed",
      ja: "注文が確認されました",
      ko: "주문이 확인되었습니다",
    }),
    orderBody: text(locale, {
      "zh-TW": "以下是您的訂單明細，請妥善保存。",
      en: "Here is your order summary. Please keep it for reference.",
      ja: "ご注文内容の詳細です。大切に保管してください。",
      ko: "주문 상세 내역입니다. 참고용으로 보관해 주세요.",
    }),
    contactTitle: text(locale, {
      "zh-TW": "聯絡表單通知",
      en: "Contact form notification",
      ja: "お問い合わせ通知",
      ko: "문의 폼 알림",
    }),
    contactBody: text(locale, {
      "zh-TW": "您收到一則新的聯絡訊息：",
      en: "You received a new contact message:",
      ja: "新しいお問い合わせメッセージがあります：",
      ko: "새 문의 메시지가 도착했습니다:",
    }),
    total: text(locale, {
      "zh-TW": "總金額",
      en: "Total",
      ja: "合計",
      ko: "총액",
    }),
    subtotal: text(locale, {
      "zh-TW": "小計",
      en: "Subtotal",
      ja: "小計",
      ko: "소계",
    }),
    discount: text(locale, {
      "zh-TW": "點數折抵",
      en: "Points discount",
      ja: "ポイント割引",
      ko: "포인트 할인",
    }),
    pointsEarned: text(locale, {
      "zh-TW": "本次可得點數",
      en: "Points earned",
      ja: "今回獲得ポイント",
      ko: "이번 획득 포인트",
    }),
    room: text(locale, {
      "zh-TW": "房型",
      en: "Room",
      ja: "客室",
      ko: "객실",
    }),
    location: text(locale, {
      "zh-TW": "地點",
      en: "Location",
      ja: "場所",
      ko: "위치",
    }),
    checkIn: text(locale, {
      "zh-TW": "入住日期",
      en: "Check in",
      ja: "チェックイン",
      ko: "체크인",
    }),
    checkOut: text(locale, {
      "zh-TW": "退房日期",
      en: "Check out",
      ja: "チェックアウト",
      ko: "체크아웃",
    }),
    nights: text(locale, {
      "zh-TW": "入住晚數",
      en: "Nights",
      ja: "宿泊数",
      ko: "숙박 수",
    }),
    guests: text(locale, {
      "zh-TW": "入住人數",
      en: "Guests",
      ja: "宿泊人数",
      ko: "투숙 인원",
    }),
    bookingNo: text(locale, {
      "zh-TW": "訂房編號",
      en: "Booking no.",
      ja: "予約番号",
      ko: "예약 번호",
    }),
    item: text(locale, {
      "zh-TW": "品項",
      en: "Item",
      ja: "商品",
      ko: "상품",
    }),
    qty: text(locale, {
      "zh-TW": "數量",
      en: "Qty",
      ja: "数量",
      ko: "수량",
    }),
    price: text(locale, {
      "zh-TW": "價格",
      en: "Price",
      ja: "価格",
      ko: "가격",
    }),
    name: text(locale, {
      "zh-TW": "姓名",
      en: "Name",
      ja: "お名前",
      ko: "이름",
    }),
    email: text(locale, {
      "zh-TW": "電子郵件",
      en: "Email",
      ja: "メール",
      ko: "이메일",
    }),
    phone: text(locale, {
      "zh-TW": "電話",
      en: "Phone",
      ja: "電話",
      ko: "전화",
    }),
    subject: text(locale, {
      "zh-TW": "主旨",
      en: "Subject",
      ja: "件名",
      ko: "제목",
    }),
    message: text(locale, {
      "zh-TW": "內容",
      en: "Message",
      ja: "本文",
      ko: "내용",
    }),
    paymentMethod: text(locale, {
      "zh-TW": "付款方式",
      en: "Payment method",
      ja: "支払い方法",
      ko: "결제 수단",
    }),
    paymentStatus: text(locale, {
      "zh-TW": "付款狀態",
      en: "Payment status",
      ja: "支払い状況",
      ko: "결제 상태",
    }),
    specialRequests: text(locale, {
      "zh-TW": "特殊需求",
      en: "Special requests",
      ja: "特別リクエスト",
      ko: "특별 요청",
    }),
    supportNote: text(locale, {
      "zh-TW": "如需調整訂單內容，請盡快聯繫客服或住宿端。",
      en: "If you need to adjust your booking, please contact support or the property as soon as possible.",
      ja: "予約内容の変更が必要な場合は、できるだけ早くサポートまたは宿泊施設へご連絡ください。",
      ko: "예약 내용을 변경해야 한다면 가능한 빨리 고객 지원 또는 숙소에 문의해 주세요.",
    }),
    orderNo: text(locale, {
      "zh-TW": "訂單編號",
      en: "Order no.",
      ja: "注文番号",
      ko: "주문 번호",
    }),
    shippingAddress: text(locale, {
      "zh-TW": "送貨地址",
      en: "Shipping address",
      ja: "配送先住所",
      ko: "배송 주소",
    }),
    shippingMethod: text(locale, {
      "zh-TW": "配送方式",
      en: "Shipping method",
      ja: "配送方法",
      ko: "배송 방법",
    }),
  };
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

function money(value: number, locale: Locale) {
  return `NT$ ${Math.round(value).toLocaleString(localeTag(locale))}`;
}

function wrapper(locale: Locale, title: string, content: string) {
  const c = copy(locale);
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
          <div style="font-size:26px;font-weight:800;">${escapeHtml(c.wrapperTitle)}</div>
          <div style="font-size:13px;color:#e7d8c0;margin-top:4px;">${escapeHtml(title)}</div>
        </td></tr>
        <tr><td style="padding:32px;">${content}</td></tr>
      </table>
      <div style="font-size:12px;color:#8a7864;margin-top:18px;">© 2026 Nestobi. ${escapeHtml(c.systemNotice)}</div>
    </td></tr>
  </table>
</body>
</html>`;
}

function verificationEmail(locale: Locale, otp: string, displayName?: string) {
  const c = copy(locale);
  return wrapper(
    locale,
    c.verificationTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(c.verificationHello)}, ${escapeHtml(displayName || "traveler")}</h1>
     <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 22px;">${escapeHtml(c.verificationBody)}</p>
     <div style="background:#f4ead8;border:2px dashed #9b7a4f;border-radius:14px;padding:24px;text-align:center;margin:0 0 22px;">
       <div style="font-size:42px;letter-spacing:10px;font-weight:800;color:#24180d;">${escapeHtml(otp)}</div>
     </div>
     <p style="font-size:13px;line-height:1.7;color:#8a7864;margin:0;">${escapeHtml(c.verificationIgnore)}</p>`,
  );
}

function resetEmail(locale: Locale, resetLink: string) {
  const c = copy(locale);
  return wrapper(
    locale,
    c.resetTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(c.resetTitle)}</h1>
     <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 22px;">${escapeHtml(c.resetBody)}</p>
     <p style="text-align:center;margin:0 0 24px;">
       <a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#24180d;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;">${escapeHtml(c.resetButton)}</a>
     </p>
     <p style="font-size:12px;line-height:1.7;color:#8a7864;word-break:break-all;margin:0;">${escapeHtml(resetLink)}</p>`,
  );
}

function paymentMethodLabel(locale: Locale, value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (status === "points") return text(locale, { "zh-TW": "點數付款", en: "Points payment", ja: "ポイント支払い", ko: "포인트 결제" });
  if (status === "service") return text(locale, { "zh-TW": "專人服務", en: "Service support", ja: "専人サービス", ko: "전담 서비스" });
  if (status === "credit_card" || status === "card") return text(locale, { "zh-TW": "信用卡", en: "Credit card", ja: "クレジットカード", ko: "신용카드" });
  if (status === "webatm") return "WebATM";
  if (status === "atm") return "ATM";
  if (status === "cvs") return text(locale, { "zh-TW": "超商代碼", en: "Convenience store code", ja: "コンビニコード", ko: "편의점 코드" });
  return status || "-";
}

function paymentStatusLabel(locale: Locale, value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (status === "paid") return text(locale, { "zh-TW": "已付款", en: "Paid", ja: "支払い済み", ko: "결제 완료" });
  if (status === "refunded") return text(locale, { "zh-TW": "已退款", en: "Refunded", ja: "返金済み", ko: "환불 완료" });
  if (status === "failed") return text(locale, { "zh-TW": "付款失敗", en: "Payment failed", ja: "支払い失敗", ko: "결제 실패" });
  return text(locale, { "zh-TW": "待付款", en: "Pending payment", ja: "支払い待ち", ko: "결제 대기" });
}

function bookingEmail(locale: Locale, data: Record<string, unknown>) {
  const c = copy(locale);
  const bookingNo = String(data.bookingNo || data.bookingId || "");
  const displayName = String(data.displayName || data.fullName || data.name || "traveler");
  const roomName = String(data.roomName || data.hotelName || data.roomType || "");
  const location = String(data.location || data.address || "");
  const checkIn = String(data.checkIn || data.checkInDate || "");
  const checkOut = String(data.checkOut || data.checkOutDate || "");
  const nights = Number(data.nights || data.stayNights || 0);
  const guests = Number(data.guests || data.guestCount || 0);
  const subtotalPrice = Number(data.subtotalPrice ?? data.totalPrice ?? data.totalAmount ?? 0);
  const pointsDiscount = Number(data.pointsDiscount || 0);
  const pointsEarned = Number(data.pointsEarned || 0);
  const totalPrice = Number(data.totalPrice ?? data.totalAmount ?? Math.max(subtotalPrice - pointsDiscount, 0));
  const paymentMethod = paymentMethodLabel(locale, data.paymentMethod);
  const paymentStatus = paymentStatusLabel(locale, data.paymentStatus);
  const specialRequests = String(data.specialRequests || data.specialRequest || "").trim();
  const guestEmail = String(data.email || data.contactEmail || "");
  const guestPhone = String(data.phone || data.contactPhone || "");

  const rows: string[] = [];
  if (bookingNo) rows.push(row(c.bookingNo, bookingNo, locale));
  rows.push(row(text(locale, { "zh-TW": "訂房人", en: "Guest", ja: "宿泊者", ko: "투숙객" }), displayName, locale));
  if (guestEmail) rows.push(row(c.email, guestEmail, locale));
  if (guestPhone) rows.push(row(c.phone, guestPhone, locale));
  if (roomName) rows.push(row(c.room, roomName, locale));
  if (location) rows.push(row(c.location, location, locale));
  if (checkIn) rows.push(row(c.checkIn, checkIn, locale));
  if (checkOut) rows.push(row(c.checkOut, checkOut, locale));
  if (nights > 0) rows.push(row(c.nights, String(nights), locale));
  if (guests > 0) rows.push(row(c.guests, String(guests), locale));

  const paymentRows = [
    row(c.paymentMethod, paymentMethod, locale),
    row(c.paymentStatus, paymentStatus, locale),
    row(c.subtotal, money(subtotalPrice, locale), locale),
    pointsDiscount > 0 ? row(c.discount, `-${money(pointsDiscount, locale)}`, locale, "#2f8f46") : "",
    pointsEarned > 0 ? row(c.pointsEarned, String(pointsEarned), locale) : "",
    row(c.total, money(totalPrice, locale), locale, "#8b5e2f", true),
  ].filter(Boolean).join("");

  const specialBlock = specialRequests
    ? `<div style="background:#fff7eb;border:1px solid #edd7b3;border-radius:12px;padding:16px;margin:20px 0 0;">
         <div style="font-size:13px;font-weight:700;color:#8b5e2f;margin:0 0 8px;">${escapeHtml(c.specialRequests)}</div>
         <div style="font-size:14px;line-height:1.7;color:#5f5041;white-space:pre-wrap;">${escapeHtml(specialRequests)}</div>
       </div>`
    : "";

  return wrapper(
    locale,
    c.bookingTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(c.bookingTitle)}</h1>
     <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 18px;">${escapeHtml(displayName)}, ${escapeHtml(c.bookingBody)}</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">
       ${rows.join("")}
     </table>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">
       ${paymentRows}
     </table>
     ${specialBlock}
     <div style="margin-top:18px;font-size:13px;line-height:1.7;color:#8a7864;">
       ${escapeHtml(c.supportNote)}
     </div>`,
  );
}

function orderEmail(locale: Locale, data: Record<string, unknown>) {
  const c = copy(locale);
  const items = Array.isArray(data.items) ? data.items : [];
  const merchantOrderNo = String(data.merchantOrderNo || data.orderNo || data.orderId || "");
  const displayName = String(data.displayName || data.fullName || data.name || "traveler");
  const shippingName = String(data.shippingName || data.recipientName || data.receiverName || "");
  const customerEmail = String(data.email || data.customerEmail || "");
  const customerPhone = String(data.phone || data.customerPhone || "");
  const shippingMethod = String(data.shippingMethod || "");
  const shippingAddress = String(data.shippingAddress || data.address || "");
  const paymentMethod = paymentMethodLabel(locale, data.paymentMethod);
  const paymentStatus = paymentStatusLabel(locale, data.paymentStatus);
  const subtotalPrice = Number(data.subtotalPrice || data.subtotal_amount || 0);
  const pointsDiscount = Number(data.pointsDiscount || 0);
  const pointsEarned = Number(data.pointsEarned || 0);
  const totalAmount = Number(data.totalAmount || data.totalPrice || 0);

  const rows = items
    .map((item: Record<string, unknown>) => {
      const name = String(item.name || item.title || "");
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const lineTotal = Number(item.total || price * quantity || 0);
      if (!name) return "";
      return `<tr>
        <td style="padding:8px 0;">${escapeHtml(name)}</td>
        <td align="center" style="padding:8px 0;">${escapeHtml(String(quantity || 0))}</td>
        <td align="right" style="padding:8px 0;">${escapeHtml(money(lineTotal, locale))}</td>
      </tr>`;
    })
    .filter(Boolean)
    .join("");

  const infoRows = [
    merchantOrderNo ? row(c.orderNo, merchantOrderNo, locale) : "",
    row(text(locale, { "zh-TW": "???", en: "Customer", ja: "???", ko: "???" }), displayName, locale),
    shippingName ? row(text(locale, { "zh-TW": "???", en: "Recipient", ja: "???", ko: "???" }), shippingName, locale) : "",
    customerEmail ? row(c.email, customerEmail, locale) : "",
    customerPhone ? row(c.phone, customerPhone, locale) : "",
    shippingMethod ? row(c.shippingMethod, shippingMethod, locale) : "",
    shippingAddress ? row(c.shippingAddress, shippingAddress, locale) : "",
    row(c.paymentMethod, paymentMethod, locale),
    row(c.paymentStatus, paymentStatus, locale),
  ].filter(Boolean).join("");

  const amountRows = [
    row(c.subtotal, money(subtotalPrice || totalAmount, locale), locale),
    pointsDiscount > 0 ? row(c.discount, "-" + money(pointsDiscount, locale), locale, "#2f8f46") : "",
    pointsEarned > 0 ? row(c.pointsEarned, String(pointsEarned), locale) : "",
    row(c.total, money(totalAmount, locale), locale, "#8b5e2f", true),
  ].filter(Boolean).join("");

  return wrapper(
    locale,
    c.orderTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(c.orderTitle)}</h1>
     <p style="font-size:15px;line-height:1.7;color:#5f5041;margin:0 0 18px;">${escapeHtml(displayName)}, ${escapeHtml(c.orderBody)}</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">
       ${infoRows}
     </table>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">
       ${amountRows}
     </table>
     <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:12px;padding:16px;margin:16px 0;">
       <tr>
         <th align="left" style="padding:8px 0;color:#806d58;font-size:13px;font-weight:700;">${escapeHtml(c.item)}</th>
         <th align="center" style="padding:8px 0;color:#806d58;font-size:13px;font-weight:700;">${escapeHtml(c.qty)}</th>
         <th align="right" style="padding:8px 0;color:#806d58;font-size:13px;font-weight:700;">${escapeHtml(c.price)}</th>
       </tr>
       ${rows}
       <tr>
         <td colspan="2" style="border-top:1px solid #decfb9;padding-top:12px;font-weight:700;">${escapeHtml(c.total)}</td>
         <td align="right" style="border-top:1px solid #decfb9;padding-top:12px;font-weight:800;color:#8b5e2f;">${escapeHtml(money(totalAmount, locale))}</td>
       </tr>
     </table>`,
  );
}

function contactEmail(locale: Locale, data: Record<string, unknown>) {
  const c = copy(locale);
  return wrapper(
    locale,
    c.contactTitle,
    `<h1 style="font-size:22px;margin:0 0 12px;">${escapeHtml(c.contactBody)}</h1>
     <p><strong>${escapeHtml(c.name)}:</strong> ${escapeHtml(data.name)}</p>
     <p><strong>${escapeHtml(c.email)}:</strong> ${escapeHtml(data.email)}</p>
     <p><strong>${escapeHtml(c.phone)}:</strong> ${escapeHtml(data.phone)}</p>
     <p><strong>${escapeHtml(c.subject)}:</strong> ${escapeHtml(data.subject)}</p>
     <div style="background:#f8f4ee;border-radius:12px;padding:16px;white-space:pre-wrap;line-height:1.7;">${escapeHtml(data.message)}</div>`,
  );
}

function row(label: string, value: unknown, locale: Locale, color = "#24180d", strong = false) {
  return `<tr>
    <td style="padding:7px 0;color:#806d58;">${escapeHtml(label)}</td>
    <td align="right" style="padding:7px 0;color:${escapeHtml(color)};${strong ? "font-weight:800;" : "font-weight:700;"}">${escapeHtml(value)}</td>
  </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { type, to, data = {} } = await req.json();
    const locale = normalizeLocale((data as Record<string, unknown>).lang);
    let subject = "";
    let html = "";
    let toAddress = String(to || "");

    if (type === "verification") {
      const c = copy(locale);
      subject = c.verificationTitle;
      html = verificationEmail(locale, String((data as Record<string, unknown>).otp || ""), String((data as Record<string, unknown>).displayName || ""));
    } else if (type === "reset-password") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service key is not configured");

      const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase.from("password_reset_tokens").insert({ email: toAddress, token, expires_at: expiresAt });

      const siteUrl = String((data as Record<string, unknown>).siteUrl || "http://localhost:5174");
      subject = copy(locale).resetTitle;
      html = resetEmail(locale, `${siteUrl}/auth/new-password?token=${encodeURIComponent(token)}`);
    } else if (type === "booking-confirmation") {
      subject = copy(locale).bookingTitle;
      html = bookingEmail(locale, data as Record<string, unknown>);
    } else if (type === "order-confirmation") {
      subject = copy(locale).orderTitle;
      html = orderEmail(locale, data as Record<string, unknown>);
    } else if (type === "contact") {
      const c = copy(locale);
      subject = `${c.contactTitle}: ${String((data as Record<string, unknown>).subject || "untitled")}`;
      toAddress = String(to || "service@dlalshop.com");
      html = contactEmail(locale, data as Record<string, unknown>);
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
