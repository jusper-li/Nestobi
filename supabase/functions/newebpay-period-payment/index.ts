import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PeriodCheckoutRequest {
  productId: string;
  quantity?: number;
  planMonths?: number | "NE";
}

type SubscriptionPlanMonths = 3 | 6 | 12 | "NE";

const DEFAULT_SUBSCRIPTION_PERIODS: SubscriptionPlanMonths[] = [3, 6, 12, "NE"];
const SUBSCRIPTION_SPEC_NAME = "訂閱期數";

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
  return `SB${clean}${stamp}`;
}

function buildItemDesc(name: string, quantity: number) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return "Nestobi subscription";
  return quantity > 1 ? `${cleanName} x${quantity}` : cleanName;
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

function getPeriodGatewayUrl() {
  return Deno.env.get("NEWEBPAY_PERIOD_URL")
    || "https://ccore.newebpay.com/MPG/period";
}

function normalizeSubscriptionPeriodValue(value: unknown): SubscriptionPlanMonths | null {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return null;
  if (["NE", "M", "MONTHLY", "MONTH", "MONTHS", "月繳"].includes(text)) return "NE";

  const months = Number.parseInt(text, 10);
  if (months === 3 || months === 6 || months === 12) return months;

  return null;
}

function extractSubscriptionPeriods(specifications: unknown): SubscriptionPlanMonths[] {
  if (!Array.isArray(specifications)) return [...DEFAULT_SUBSCRIPTION_PERIODS];

  const values = specifications.flatMap((spec) => {
    if (!spec || typeof spec !== "object") return [];
    const entry = spec as { name?: unknown; options?: unknown; value?: unknown };
    if (String(entry.name ?? "").trim() !== SUBSCRIPTION_SPEC_NAME) return [];

    if (Array.isArray(entry.options)) {
      return entry.options
        .map((option) => normalizeSubscriptionPeriodValue(option))
        .filter((option): option is SubscriptionPlanMonths => Boolean(option));
    }

    const normalized = normalizeSubscriptionPeriodValue(entry.value);
    return normalized ? [normalized] : [];
  });

  const unique = Array.from(new Set(values));
  return unique.length > 0 ? unique : [...DEFAULT_SUBSCRIPTION_PERIODS];
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

    const body: PeriodCheckoutRequest = await req.json();
    const productId = String(body.productId || "").trim();
    const quantity = Math.max(1, Math.floor(Number(body.quantity || 1)));
    const planMonths = body.planMonths === "NE"
      ? "NE"
      : String(Math.max(1, Math.floor(Number(body.planMonths || 12))));

    if (!productId) {
      return jsonResponse({ success: false, error: "Product is required." }, 400);
    }

    const supabase = createServiceClient();
    const [productRes, profileRes] = await Promise.all([
      supabase
        .from("products")
        .select("id,name,price,image_url,category_id,vendor_id,is_active,stock_quantity,specifications")
        .eq("id", productId)
        .maybeSingle(),
      supabase
        .from("tbl_mn5wgzh0")
        .select("display_name,phone,preferred_language")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (productRes.error) {
      return jsonResponse({ success: false, error: productRes.error.message }, 500);
    }

    const product = productRes.data;
    if (!product || !product.is_active) {
      return jsonResponse({ success: false, error: "Product not found." }, 404);
    }

    const { data: category } = product.category_id
      ? await supabase.from("categories").select("id,name,slug,parent_id").eq("id", product.category_id).maybeSingle()
      : { data: null };

    const isSubscriptionCategory = String(category?.slug || "").startsWith("subscription-")
      || category?.slug === "dlal-subscription";

    if (!isSubscriptionCategory) {
      return jsonResponse({ success: false, error: "This product does not support subscriptions." }, 400);
    }

    const allowedPeriods = extractSubscriptionPeriods((product as { specifications?: unknown } | null)?.specifications);
    const normalizedRequestedPeriod = normalizeSubscriptionPeriodValue(planMonths);
    if (!normalizedRequestedPeriod || !allowedPeriods.includes(normalizedRequestedPeriod)) {
      return jsonResponse({
        success: false,
        error: "This subscription period is not enabled for the selected product.",
        allowedPeriods,
      }, 400);
    }
    const periodTimes = String(normalizedRequestedPeriod);

    const { data: vendor } = product.vendor_id
      ? await supabase.from("vendors").select("id,name,contact_email").eq("id", product.vendor_id).maybeSingle()
      : { data: null };

    const monthlyAmount = Math.round(Number(product.price || 0) * quantity);
    const merchantOrderNo = buildMerchantOrderNo(user.id);
    const periodPoint = String(new Date().getDate()).padStart(2, "0");
    const itemDesc = buildItemDesc(String(product.name || "Coffee subscription"), quantity);
    const customerEmail = String(user.email || "");
    const customerName = String(profileRes.data?.display_name || user.email || "");
    const customerPhone = String(profileRes.data?.phone || "");
    const shippingAddress = {
      customer_name: customerName,
      recipient_name: customerName,
      customer_email: customerEmail,
      recipient_email: customerEmail,
      customer_phone: customerPhone,
      recipient_phone: customerPhone,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    };

    const { data: subscription, error: subscriptionError } = await supabase
      .from("product_subscriptions")
      .insert({
        user_id: user.id,
        product_id: product.id,
        vendor_id: product.vendor_id,
        merchant_order_no: merchantOrderNo,
        quantity,
        monthly_amount: monthlyAmount,
        period_type: "M",
        period_point: periodPoint,
        period_start_type: "2",
        period_times: periodTimes,
        status: "pending",
        newebpay_status: "pending",
        shipping_address: shippingAddress,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      })
      .select("id")
      .single();

    if (subscriptionError || !subscription) {
      return jsonResponse({
        success: false,
        error: subscriptionError?.message || "Unable to create subscription.",
      }, 400);
    }

    const merchantId = Deno.env.get("NEWEBPAY_MERCHANT_ID") ?? "";
    const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY") ?? "";
    const hashIV = Deno.env.get("NEWEBPAY_HASH_IV") ?? "";
    const paymentUrl = getPeriodGatewayUrl();

    if (!merchantId || !hashKey || !hashIV) {
      return jsonResponse({ success: false, error: "NewebPay HashKey/HashIV are not configured." }, 500);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const notifyURL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/newebpay-period-webhook`;

    const postDataParams = new URLSearchParams({
      RespondType: "JSON",
      TimeStamp: timestamp.toString(),
      Version: "1.5",
      LangType: "zh-Tw",
      MerOrderNo: merchantOrderNo,
      ProdDesc: itemDesc,
      PeriodType: "M",
      PeriodAmt: String(monthlyAmount),
      PeriodPoint: periodPoint,
      PeriodStartType: "2",
      PeriodTimes: periodTimes,
      PayerEmail: customerEmail,
      PaymentInfo: "Y",
      OrderInfo: "N",
      EmailModify: "1",
      NotifyURL: notifyURL,
    });

    const postData = await aesEncrypt(postDataParams.toString(), hashKey, hashIV);
    const tradeSha = await sha256Hex(`HashKey=${hashKey}&${postData}&HashIV=${hashIV}`);

    await supabase
      .from("product_subscriptions")
      .update({
        monthly_amount: monthlyAmount,
        period_point: periodPoint,
        period_times: planMonths,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        notes: vendor?.name ? `Vendor: ${vendor.name}` : "",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    return jsonResponse({
      success: true,
      mode: "newebpay",
      subscriptionId: subscription.id,
      merchantOrderNo,
      paymentUrl,
      merchantId,
      postData,
      tradeSha,
      version: "1.5",
    });
  } catch (error) {
    console.error("[newebpay-period-payment] Unexpected error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unexpected server error.",
    }, 500);
  }
});
