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
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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
    return 0;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const credentials = await getNewebPayCredentials();
    if (!credentials.merchantId || !credentials.hashKey || !credentials.hashIV) {
      return jsonResponse({ success: false, error: "NewebPay credentials are not configured." }, 500);
    }

    const contentType = req.headers.get("content-type") || "";
    let merchantOrderNo: string | null = null;
    let jsonUserId: string | null = null;

    if (contentType.includes("application/json")) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return jsonResponse({ success: false, error: "Authentication required." }, 401);
      }
      const authClient = createAuthClient(authHeader);
      const { data: { user }, error: userError } = await authClient.auth.getUser();
      if (userError || !user) {
        return jsonResponse({ success: false, error: "Invalid or expired session." }, 401);
      }
      jsonUserId = user.id;
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

    const supabase = createServiceClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, subtotal_amount, points_discount, merchant_order_no, payment_status, newebpay_status, newebpay_payment_type")
      .eq("merchant_order_no", merchantOrderNo)
      .maybeSingle();

    if (orderError) {
      return jsonResponse({ success: false, error: orderError.message }, 500);
    }

    if (!order) {
      return jsonResponse({ success: false, error: "Order not found." }, 404);
    }

    if (jsonUserId && order.user_id !== jsonUserId && !(await isElevatedUser(supabase, jsonUserId))) {
      return jsonResponse({ success: false, error: "Forbidden." }, 403);
    }

    if (String(order.payment_status || "").toLowerCase() === "paid" && String(order.newebpay_status || "").toLowerCase() === "success") {
      try {
        const invoiceResult = await createEzpayInvoiceForOrder(supabase, order.id);
        if (!invoiceResult.success && invoiceResult.error) {
          console.warn("[newebpay-order-sync] Invoice creation failed:", invoiceResult.error);
        }
      } catch (invoiceError) {
        console.warn("[newebpay-order-sync] Invoice creation failed:", invoiceError);
      }

      if (!contentType.includes("application/json")) {
        return Response.redirect(`${Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://nestobi.com"}/member/orders?merchantOrderNo=${encodeURIComponent(merchantOrderNo)}`, 303);
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

    const response = await fetch(getQueryUrl(credentials.mpgUrl), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    });

    const raw = await response.text();
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

    if (!isPaid) {
      if (!contentType.includes("application/json")) {
        return Response.redirect(`${Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://nestobi.com"}/member/orders?merchantOrderNo=${encodeURIComponent(merchantOrderNo)}`, 303);
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

    await supabase
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
          user_id: order.user_id,
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
      return Response.redirect(`${Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://nestobi.com"}/member/orders?merchantOrderNo=${encodeURIComponent(merchantOrderNo)}`, 303);
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
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Order sync failed.",
    }, 500);
  }
});
