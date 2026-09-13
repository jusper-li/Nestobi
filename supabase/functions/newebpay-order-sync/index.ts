import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createEzpayInvoiceForOrder } from "../_shared/ezpay-invoice.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type NewebPayCredentials = {
  merchantId: string | null;
  hashKey: string | null;
  hashIV: string | null;
  mpgUrl: string | null;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function createAuthClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
}

async function getNewebPayCredentials(): Promise<NewebPayCredentials> {
  return {
    merchantId: Deno.env.get("NEWEBPAY_MERCHANT_ID") ?? null,
    hashKey: Deno.env.get("NEWEBPAY_HASH_KEY") ?? null,
    hashIV: Deno.env.get("NEWEBPAY_HASH_IV") ?? null,
    mpgUrl: Deno.env.get("NEWEBPAY_MPG_URL") ?? null,
  };
}

async function sha256Hex(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function aesDecrypt(hexData: string, key: string, iv: string): Promise<string> {
  const encoder = new TextEncoder();
  const encryptedBytes = new Uint8Array(
    (hexData.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)),
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-CBC" },
    false,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: encoder.encode(iv) },
    cryptoKey,
    encryptedBytes,
  );
  return new TextDecoder().decode(decrypted);
}

function safeEquals(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function countCheckValue(merchantId: string, hashKey: string, hashIV: string, merchantOrderNo: string, amt: number) {
  const payload = new URLSearchParams({
    IV: hashIV,
    Amt: String(Math.round(amt)),
    MerchantID: merchantId,
    MerchantOrderNo: merchantOrderNo,
    Key: hashKey,
  });
  return sha256Hex(payload.toString());
}

function getQueryUrl(mpgUrl?: string | null) {
  try {
    const origin = mpgUrl ? new URL(mpgUrl).origin : "https://core.newebpay.com";
    return `${origin}/API/QueryTradeInfo`;
  } catch {
    return "https://core.newebpay.com/API/QueryTradeInfo";
  }
}

async function getRewardPoints(
  supabase: ReturnType<typeof createServiceClient>,
  sourceType: string,
  amount: number,
) {
  const { data, error } = await supabase.rpc("calculate_point_reward_points", {
    p_source_type: sourceType,
    p_amount: amount,
  });

  if (error) {
    console.warn("[newebpay-order-sync] Failed to calculate reward points:", error);
    throw error;
  }

  return Math.max(0, Math.floor(Number(data || 0)));
}

async function parseMerchantOrderNoFromTradeInfo(
  tradeInfo: string,
  tradeSha: string | null,
  credentials: NewebPayCredentials,
) {
  if (!credentials.hashKey || !credentials.hashIV) {
    throw new Error("NewebPay credentials are not configured.");
  }

  if (tradeSha) {
    const expectedSha = await sha256Hex(`HashKey=${credentials.hashKey}&${tradeInfo}&HashIV=${credentials.hashIV}`);
    if (!safeEquals(tradeSha.toUpperCase(), expectedSha)) {
      throw new Error("Invalid TradeSha.");
    }
  }

  const decrypted = await aesDecrypt(tradeInfo, credentials.hashKey, credentials.hashIV);
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(decrypted) as Record<string, unknown>;
  } catch {
    payload = Object.fromEntries(new URLSearchParams(decrypted).entries());
  }

  const result = (payload.Result || payload.result || payload) as Record<string, unknown>;
  return String(result.MerchantOrderNo || result.merchantOrderNo || payload.MerchantOrderNo || "").trim() || null;
}

async function isElevatedUser(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await supabase
    .from("tbl_user_auth")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return data?.role === "admin" || data?.role === "superadmin";
}

async function getUserRole(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  const { data } = await supabase.from("tbl_user_auth").select("role").eq("user_id", userId).maybeSingle();
  return String(data?.role || "").toLowerCase() || null;
}

async function isVendorSubscriptionOwner(supabase: ReturnType<typeof createServiceClient>, userId: string, vendorId: string | null) {
  if (!vendorId) return false;
  const { data } = await supabase.from("vendors").select("id").eq("id", vendorId).eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

async function isVendorOrderOwner(supabase: ReturnType<typeof createServiceClient>, userId: string, orderId: string) {
  const { data } = await supabase
    .from("purchase_records")
    .select("products(vendor_id)")
    .eq("order_id", orderId);
  const vendorIds = (data || [])
    .map((row: any) => row.products?.vendor_id)
    .filter(Boolean);
  if (!vendorIds.length) return false;
  const { data: vendor } = await supabase.from("vendors").select("id").eq("user_id", userId).in("id", vendorIds).maybeSingle();
  return Boolean(vendor);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  let stage = "request";
  try {
    console.log("[order-sync] request received", { method: req.method });
    const credentials = await getNewebPayCredentials();
    if (!credentials.merchantId || !credentials.hashKey || !credentials.hashIV) {
      return jsonResponse({ success: false, error: "NewebPay credentials are not configured." }, 500);
    }

    const contentType = req.headers.get("content-type") || "";
    let merchantOrderNo: string | null = null;
    const posToken = new URL(req.url).searchParams.get("posToken");
    let jsonUserId: string | null = null;
    let authHeaderForQuery: string | null = null;

    if (contentType.includes("application/json")) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ success: false, error: "Authentication required." }, 401);
      }
      authHeaderForQuery = authHeader;
      stage = "authentication";
      const authClient = createAuthClient(authHeader);
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      const { data: { user }, error: userError } = await authClient.auth.getUser(token);
      if (userError || !user) {
        console.log("[order-sync] authorization", {
          authorizationHeaderExists: true,
          userFound: false,
          userId: null,
          roleDetected: null,
          adminAllowed: false,
        });
        return jsonResponse({ success: false, error: "Invalid or expired session." }, 401);
      }
      jsonUserId = user.id;
      console.log("[order-sync] authenticated user", { userId: user.id });
      const body = await req.json().catch(() => ({}));
      merchantOrderNo = typeof body?.merchantOrderNo === "string" ? body.merchantOrderNo : null;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const tradeInfo = String(form.get("TradeInfo") || "").trim();
      const tradeSha = String(form.get("TradeSha") || "").trim() || null;
      merchantOrderNo = tradeInfo
        ? await parseMerchantOrderNoFromTradeInfo(tradeInfo, tradeSha, credentials)
        : String(form.get("MerchantOrderNo") || form.get("merchantOrderNo") || "").trim() || null;
    } else {
      const text = await req.text();
      try {
        const body = JSON.parse(text);
        merchantOrderNo = typeof body?.merchantOrderNo === "string" ? body.merchantOrderNo : null;
      } catch {
        const params = new URLSearchParams(text);
        const tradeInfo = String(params.get("TradeInfo") || "").trim();
        merchantOrderNo = tradeInfo
          ? await parseMerchantOrderNoFromTradeInfo(tradeInfo, params.get("TradeSha"), credentials)
          : String(params.get("MerchantOrderNo") || params.get("merchantOrderNo") || "").trim() || null;
      }
    }

    if (!merchantOrderNo) {
      return jsonResponse({ success: false, error: "Missing merchantOrderNo." }, 400);
    }
    console.log("[order-sync] input", { orderId: null, merchantOrderNo });

    stage = "order-lookup";
    const supabase = createServiceClient();
    console.log("[order-sync] lookup", { merchantOrderNo, paymentType: "unknown" });
    const { data: regularOrder, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, points_member_id, total_amount, subtotal_amount, points_discount, merchant_order_no, payment_status, payment_method, newebpay_status, newebpay_payment_type, order_channel")
      .eq("merchant_order_no", merchantOrderNo)
      .maybeSingle();

    if (orderError) {
      return jsonResponse({ success: false, error: orderError.message }, 500);
    }

    let order: any = regularOrder;
    let orderTable = "orders";
    if (!order) {
      const { data: subscription, error: subscriptionError } = await supabase
        .from("product_subscriptions")
        .select("id,user_id,vendor_id,merchant_order_no,monthly_amount,newebpay_status,status,period_times,billing_cycle_count,order_id")
        .eq("merchant_order_no", merchantOrderNo)
        .maybeSingle();
      if (subscriptionError) {
        return jsonResponse({ success: false, stage: "order-lookup", merchantOrderNo, error: subscriptionError.message }, 500);
      }
      if (subscription) {
        order = {
          id: subscription.order_id || subscription.id,
          user_id: subscription.user_id,
          vendor_id: subscription.vendor_id,
          total_amount: subscription.monthly_amount,
          merchant_order_no: subscription.merchant_order_no,
          payment_status: subscription.newebpay_status === "success" ? "paid" : "unpaid",
          payment_method: "newebpay_subscription",
          newebpay_status: subscription.newebpay_status,
          order_channel: "subscription",
        };
        orderTable = "product_subscriptions";
      }
    }

    console.log("[order-sync] lookup result", { found: Boolean(order), table: orderTable });

    if (!order) {
      return jsonResponse({ success: false, stage: "order-lookup", merchantOrderNo, error: "Order not found" }, 404);
    }

    console.log("[order-sync] payment method", { merchantOrderNo, paymentMethod: order.payment_method || "unknown" });

    const role = jsonUserId ? await getUserRole(supabase, jsonUserId) : null;
    const adminVerified = role === "admin" || role === "superadmin";
    const vendorVerified = jsonUserId
      ? (orderTable === "product_subscriptions"
        ? await isVendorSubscriptionOwner(supabase, jsonUserId, order.vendor_id || null)
        : await isVendorOrderOwner(supabase, jsonUserId, order.id))
      : false;
    const authDebug = {
      authorizationHeaderExists: Boolean(req.headers.get("Authorization")),
      userFound: Boolean(jsonUserId),
      userId: jsonUserId,
      roleDetected: role,
      adminAllowed: adminVerified || vendorVerified,
    };
    console.log("[order-sync] auth debug", authDebug);
    if (jsonUserId) console.log("[order-sync] admin verified", { userId: jsonUserId, verified: adminVerified, roleFound: Boolean(role), role, vendorVerified });
    if (jsonUserId && order.user_id !== jsonUserId && !adminVerified && !vendorVerified) {
      const reason = !role ? "No role found in tbl_user_auth" : `Role '${role}' is not allowed for this order`;
      return jsonResponse({ success: false, stage: "authorization", reason, userAuthenticated: Boolean(jsonUserId), roleDetected: role, adminAllowed: authDebug.adminAllowed }, 403);
    }

    if (orderTable === "orders" && String(order.payment_status || "").toLowerCase() === "paid" && String(order.newebpay_status || "").toLowerCase() === "success") {
      try {
        const invoiceResult = await createEzpayInvoiceForOrder(supabase, order.id);
        if (!invoiceResult.success && invoiceResult.error) {
          console.warn("[newebpay-order-sync] Invoice creation failed:", invoiceResult.error);
        }
      } catch (invoiceError) {
        console.warn("[newebpay-order-sync] Invoice creation failed:", invoiceError);
      }

      if (!contentType.includes("application/json")) {
        const destination = order.order_channel === "pos" && posToken ? `/pos/pay/${encodeURIComponent(posToken)}` : order.user_id ? "/member/orders" : "/cart";
        const query = order.order_channel === "pos" && posToken ? "paymentStatus=paid" : order.user_id ? `merchantOrderNo=${encodeURIComponent(merchantOrderNo)}` : `guestOrder=${encodeURIComponent(merchantOrderNo)}&paymentStatus=paid`;
        return Response.redirect(`${Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://nestobi.com"}${destination}?${query}`, 303);
      }
      return jsonResponse({ success: true, synced: false, reason: "already_paid" });
    }

    const amt = Math.round(Number(order.total_amount || 0));
    const checkValue = await countCheckValue(
      credentials.merchantId,
      credentials.hashKey,
      credentials.hashIV,
      order.merchant_order_no,
      amt,
    );

    const payload = new URLSearchParams({
      MerchantID: credentials.merchantId,
      Version: "1.1",
      RespondType: "JSON",
      CheckValue: checkValue,
      TimeStamp: String(Math.floor(Date.now() / 1000)),
      MerchantOrderNo: order.merchant_order_no,
      Amt: String(amt),
    });

    stage = "provider-query";
    const response = await fetch(getQueryUrl(credentials.mpgUrl), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    });

    const raw = await response.text();
    console.log("[order-sync] NewebPay response", {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      preview: raw.slice(0, 1000),
    });
    if (!response.ok) {
      return jsonResponse({
        success: false,
        stage: "newebpay",
        providerHttpStatus: response.status,
        providerResponse: raw.slice(0, 1000),
      }, response.status);
    }
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { Status: "ERROR", Message: raw };
    }

    const result = parsed?.Result ?? parsed?.result ?? parsed;
    const status = String(parsed?.Status ?? parsed?.status ?? "").toUpperCase();
    const tradeStatus = String(result?.TradeStatus ?? result?.tradeStatus ?? "");
    const isPaid = status === "SUCCESS" && tradeStatus === "1";

    // Phase one is query-only: expose the provider result without changing
    // local payment, subscription, points, invoice, or order records.
    if (contentType.includes("application/json")) {
      return jsonResponse({
        success: true,
        stage: "newebpay",
        merchantOrderNo,
        paymentStatus: isPaid ? "paid" : order.payment_status,
        paid: isPaid,
        providerHttpStatus: response.status,
        providerResponse: raw.slice(0, 1000),
        queryStatus: status,
        tradeStatus,
        tradeNo: result?.TradeNo ?? null,
        amount: result?.Amt ?? result?.TradeAmt ?? amt,
      });
    }

    if (!isPaid) {
      if (!contentType.includes("application/json")) {
        const destination = order.order_channel === "pos" && posToken ? `/pos/pay/${encodeURIComponent(posToken)}` : order.user_id ? "/member/orders" : "/cart";
        const query = order.order_channel === "pos" && posToken ? "paymentStatus=unpaid" : order.user_id ? `merchantOrderNo=${encodeURIComponent(merchantOrderNo)}` : `guestOrder=${encodeURIComponent(merchantOrderNo)}&paymentStatus=unpaid`;
        return Response.redirect(`${Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://nestobi.com"}${destination}?${query}`, 303);
      }
      return jsonResponse({
        success: true,
        synced: false,
        paymentStatus: order.payment_status,
        newebpayStatus: order.newebpay_status,
        queryStatus: status,
        tradeStatus,
      });
    }

    stage = "database-update";
    const { error: orderUpdateError, data: orderUpdateData } = await supabase
      .from("orders")
      .update({
        status: "processing",
        payment_status: "paid",
        newebpay_status: "success",
        newebpay_trade_no: result?.TradeNo ?? null,
        newebpay_auth_code: result?.AuthCode ?? null,
        newebpay_card_no: result?.CardNo ?? null,
        newebpay_respond_code: result?.RespondCode ?? null,
        newebpay_payment_type: result?.PaymentType ?? order.newebpay_payment_type ?? null,
        newebpay_paid_at: result?.PayTime ?? result?.AuthTime ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    console.log("[order-sync] database update result", { ok: !orderUpdateError, updated: Boolean(orderUpdateData) });
    if (orderUpdateError) {
      return jsonResponse({ success: false, stage: "database-update", error: orderUpdateError.message }, 500);
    }

    const { error: captureError } = await supabase.rpc("capture_member_points", { p_order_id: order.id });
    if (captureError) throw captureError;

    await supabase
      .from("purchase_records")
      .update({ status: "completed" })
      .eq("order_id", order.id);

    const rewardPoints = await getRewardPoints(supabase, "order", Number(order.total_amount || 0));
    if (rewardPoints > 0) {
      const { data: existingPoints } = await supabase
        .from("points")
        .select("id")
        .eq("reference_id", order.id)
        .eq("source_type", "order")
        .eq("transaction_type", "earned")
        .maybeSingle();

      if (!existingPoints) {
        await supabase.from("points").insert({
          user_id: order.points_member_id || order.user_id,
          amount: rewardPoints,
          transaction_type: "earned",
          reference_id: order.id,
          source_type: "order",
          source_id: order.id,
          description: "NewebPay payment sync reward points",
        });
      }
    }

    try {
      const invoiceResult = await createEzpayInvoiceForOrder(supabase, order.id);
      if (!invoiceResult.success && invoiceResult.error) {
        console.warn("[newebpay-order-sync] Invoice creation failed:", invoiceResult.error);
      }
    } catch (invoiceError) {
      console.warn("[newebpay-order-sync] Invoice creation failed:", invoiceError);
    }

    if (!contentType.includes("application/json")) {
      const destination = order.order_channel === "pos" && posToken ? `/pos/pay/${encodeURIComponent(posToken)}` : order.user_id ? "/member/orders" : "/cart";
      const query = order.order_channel === "pos" && posToken ? "paymentStatus=paid" : order.user_id ? `merchantOrderNo=${encodeURIComponent(merchantOrderNo)}` : `guestOrder=${encodeURIComponent(merchantOrderNo)}&paymentStatus=paid`;
      return Response.redirect(`${Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://nestobi.com"}${destination}?${query}`, 303);
    }
    return jsonResponse({
      success: true,
      synced: true,
      paymentStatus: "paid",
      newebpayStatus: "success",
      tradeNo: result?.TradeNo ?? null,
      paymentType: result?.PaymentType ?? null,
    });
  } catch (error) {
    console.error("[newebpay-order-sync] Error:", error);
    // ReturnURL is opened by the customer's browser. Never expose raw callback
    // or decryption errors there; the NotifyURL webhook handles order syncing.
    const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://nestobi.com").replace(/\/$/, "");
    if (!(req.headers.get("content-type") || "").includes("application/json")) {
      return Response.redirect(`${siteUrl}/member/orders`, 303);
    }
    return jsonResponse({
      success: false,
      stage,
      error: error instanceof Error ? error.message : "Order sync failed.",
    }, 500);
  }
});
