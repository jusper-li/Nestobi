import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type PaymentMethod = "CREDIT" | "WEBATM" | "ATM" | "CVS" | "BARCODE" | "APPLEPAY" | "ANDROIDPAY" | "UNIONPAY";

interface ShopCheckoutRequest {
  pointsToUse?: number;
  paymentMethod?: PaymentMethod;
  name?: string;
  phone?: string;
  address?: string;
}

interface NewebPayCredentials {
  merchantId: string | null;
  hashKey: string | null;
  hashIV: string | null;
  mpgUrl: string | null;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createAuthClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

async function getNewebPayCredentials(): Promise<NewebPayCredentials> {
  const envCredentials = {
    merchantId: Deno.env.get("NEWEBPAY_MERCHANT_ID") ?? null,
    hashKey: Deno.env.get("NEWEBPAY_HASH_KEY") ?? null,
    hashIV: Deno.env.get("NEWEBPAY_HASH_IV") ?? null,
    mpgUrl: Deno.env.get("NEWEBPAY_MPG_URL") ?? null,
  };

  return {
    merchantId: envCredentials.merchantId,
    hashKey: envCredentials.hashKey,
    hashIV: envCredentials.hashIV,
    mpgUrl: envCredentials.mpgUrl,
  };
}

async function aesEncrypt(data: string, key: string, iv: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: encoder.encode(iv) },
    cryptoKey,
    encoder.encode(data)
  );
  return Array.from(new Uint8Array(encrypted))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function buildMerchantOrderNo(userId: string) {
  const clean = userId.replaceAll("-", "").slice(0, 6);
  const stamp = Date.now().toString().slice(-12);
  return `NB${clean}${stamp}`;
}

function buildItemDesc(items: Array<{ name?: string | null }>) {
  const names = items
    .map(item => String(item.name || "").trim())
    .filter(Boolean);
  if (names.length === 0) return "Nestobi shop purchase";

  const display = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${display} and ${names.length - 3} more` : display;
}

function getSiteUrl(req: Request) {
  const configured = Deno.env.get("SITE_URL")
    || Deno.env.get("PUBLIC_SITE_URL");
  if (configured) return configured;

  const origin = req.headers.get("Origin") || req.headers.get("Referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // Ignore malformed headers and fall through to the production fallback.
    }
  }

  return "https://nestobi.com";
}

async function sendOrderEmail(
  to: string,
  displayName: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  totalAmount: number,
  lang: string,
  merchantOrderNo?: string,
  paymentStatus?: string,
) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "order-confirmation",
        to,
        data: {
          displayName,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount,
          lang,
          merchantOrderNo,
          paymentStatus,
        },
      }),
    });
  } catch (error) {
    console.warn("[newebpay-mpg-payment] Failed to send confirmation email:", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Authentication required." }, 401);
    }

    const authClient = createAuthClient(authHeader);
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ success: false, error: "Invalid or expired session." }, 401);
    }

    const body: ShopCheckoutRequest = await req.json();
    const pointsToUse = Math.max(0, Math.floor(Number(body.pointsToUse || 0)));
    const paymentMethod = body.paymentMethod || "CREDIT";
    const shippingName = String(body.name || "").trim();
    const shippingPhone = String(body.phone || "").trim();
    const shippingAddress = String(body.address || "").trim();

    if (!shippingName || !shippingPhone || !shippingAddress) {
      return jsonResponse({
        success: false,
        error: "Shipping name, phone, and address are required.",
      }, 400);
    }

    const merchantOrderNo = buildMerchantOrderNo(user.id);
    const { data: checkoutResult, error: checkoutError } = await authClient.rpc("create_shop_checkout_order", {
      p_merchant_order_no: merchantOrderNo,
      p_shipping_name: shippingName,
      p_shipping_phone: shippingPhone,
      p_shipping_address: shippingAddress,
      p_points_to_use: pointsToUse,
    });

    if (checkoutError || !checkoutResult?.success) {
      return jsonResponse({
        success: false,
        error: checkoutError?.message || checkoutResult?.error || "Checkout failed.",
      }, 400);
    }

    const checkout = checkoutResult as {
      success: true;
      order_id: string;
      merchant_order_no: string;
      subtotal_amount: number;
      points_discount: number;
      total_amount: number;
      payment_method: string;
      payment_status: string;
      order_status: string;
      newebpay_status: string;
      items: Array<{ name?: string | null; quantity: number; unit_price: number; total_price: number }>;
    };

    const siteUrl = getSiteUrl(req).replace(/\/$/, "");
    const returnUrl = `${siteUrl}/member/orders?merchantOrderNo=${encodeURIComponent(checkout.merchant_order_no)}`;
    const clientBackUrl = returnUrl;
    const { data: profile } = await createServiceClient()
      .from("tbl_mn5wgzh0")
      .select("display_name, preferred_language")
      .eq("user_id", user.id)
      .maybeSingle();
    const orderEmailItems = checkout.items.map(item => ({
      name: String(item.name || ""),
      quantity: Number(item.quantity || 0),
      price: Number(item.unit_price || 0),
    }));
    const orderEmailData = {
      displayName: String(profile?.display_name || user.email || ""),
      items: orderEmailItems,
      totalAmount: Number(checkout.total_amount || 0),
      lang: String(profile?.preferred_language || "zh-TW"),
      merchantOrderNo: checkout.merchant_order_no,
      paymentStatus: checkout.payment_status,
      orderStatus: checkout.order_status,
    };

    if (user.email) {
      await sendOrderEmail(
        user.email,
        orderEmailData.displayName,
        orderEmailItems,
        orderEmailData.totalAmount,
        orderEmailData.lang,
        orderEmailData.merchantOrderNo,
        orderEmailData.paymentStatus,
      );
    }

    if (checkout.payment_status === "paid") {
      return jsonResponse({
        success: true,
        mode: "points",
        orderId: checkout.order_id,
        merchantOrderNo: checkout.merchant_order_no,
        returnUrl,
        clientBackUrl,
      });
    }

    const credentials = await getNewebPayCredentials();
    if (!credentials.merchantId || !credentials.hashKey || !credentials.hashIV) {
      return jsonResponse({ success: false, error: "NewebPay HashKey/HashIV are not configured." }, 500);
    }

    const itemDesc = buildItemDesc(checkout.items);
    const timestamp = Math.floor(Date.now() / 1000);
    const notifyURL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/newebpay-mpg-webhook`;
    const enabledPaymentFlags = {
      CREDIT: "1",
      WEBATM: "1",
      VACC: "1",
      CVS: "1",
      BARCODE: "1",
    } as const;

    const tradeInfoParams = new URLSearchParams({
      MerchantID: credentials.merchantId,
      RespondType: "JSON",
      TimeStamp: timestamp.toString(),
      Version: "2.3",
      MerchantOrderNo: checkout.merchant_order_no,
      Amt: String(Math.round(Number(checkout.total_amount || 0))),
      ItemDesc: itemDesc,
      Email: user.email || "",
      LoginType: "0",
      NotifyURL: notifyURL,
      ReturnURL: returnUrl,
      ClientBackURL: clientBackUrl,
      ...enabledPaymentFlags,
      UNIONPAY: paymentMethod === "UNIONPAY" ? "1" : "0",
      APPLEPAY: paymentMethod === "APPLEPAY" ? "1" : "0",
      ANDROIDPAY: paymentMethod === "ANDROIDPAY" ? "1" : "0",
    });

    const encryptedTradeInfo = await aesEncrypt(
      tradeInfoParams.toString(),
      credentials.hashKey,
      credentials.hashIV,
    );
    const tradeSha = await sha256Hex(`HashKey=${credentials.hashKey}&${encryptedTradeInfo}&HashIV=${credentials.hashIV}`);

    return jsonResponse({
      success: true,
      mode: "newebpay",
      orderId: checkout.order_id,
      merchantOrderNo: checkout.merchant_order_no,
      paymentUrl: credentials.mpgUrl || "https://core.newebpay.com/MPG/mpg_gateway",
      merchantId: credentials.merchantId,
      tradeInfo: encryptedTradeInfo,
      tradeSha,
      version: "2.3",
      returnUrl,
      clientBackUrl,
    });
  } catch (error) {
    console.error("[newebpay-mpg-payment] Unexpected error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unexpected server error.",
    }, 500);
  }
});
