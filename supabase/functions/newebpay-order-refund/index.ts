import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NewebPayCredentials {
  merchantId: string | null;
  hashKey: string | null;
  hashIV: string | null;
  refundUrl: string | null;
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
    { global: { headers: { Authorization: authHeader } } },
  );
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
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

async function getNewebPayCredentials(): Promise<NewebPayCredentials> {
  const merchantId = Deno.env.get("NEWEBPAY_MERCHANT_ID") ?? null;
  const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY") ?? null;
  const hashIV = Deno.env.get("NEWEBPAY_HASH_IV") ?? null;
  const configuredRefundUrl = Deno.env.get("NEWEBPAY_CREDIT_REFUND_URL") ?? Deno.env.get("NEWEBPAY_CREDIT_CLOSE_URL") ?? null;
  const mpgUrl = Deno.env.get("NEWEBPAY_MPG_URL") ?? null;
  const refundUrl = configuredRefundUrl
    || (mpgUrl?.includes("ccore")
      ? "https://ccore.newebpay.com/API/CreditCard/Close"
      : "https://core.newebpay.com/API/CreditCard/Close");

  return { merchantId, hashKey, hashIV, refundUrl };
}

async function aesEncrypt(data: string, key: string, iv: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: encoder.encode(iv) },
    cryptoKey,
    encoder.encode(data),
  );
  return Array.from(new Uint8Array(encrypted))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function refundCreditCard(
  credentials: NewebPayCredentials,
  merchantOrderNo: string,
  amount: number,
) {
  if (!credentials.merchantId || !credentials.hashKey || !credentials.hashIV) {
    throw new Error("NewebPay HashKey/HashIV are not configured.");
  }

  const postData = new URLSearchParams({
    RespondType: "JSON",
    Version: "1.1",
    Amt: String(Math.max(0, Math.floor(amount))),
    MerchantOrderNo: merchantOrderNo,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    IndexType: "1",
    CloseType: "2",
  }).toString();

  const encryptedPostData = await aesEncrypt(postData, credentials.hashKey, credentials.hashIV);
  const body = new URLSearchParams({
    MerchantID_: credentials.merchantId,
    PostData_: encryptedPostData,
    Version: "1.1",
  });

  const response = await fetch(credentials.refundUrl || "https://core.newebpay.com/API/CreditCard/Close", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    },
    body,
  });

  const rawText = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    payload = { raw: rawText };
  }

  const status = String((payload.Status ?? payload.status ?? (payload.Result as Record<string, unknown> | undefined)?.Status ?? "")).toUpperCase();
  if (!response.ok || (status && status !== "SUCCESS")) {
    const message = String(
      payload.Message
      ?? payload.message
      ?? (payload.Result as Record<string, unknown> | undefined)?.Message
      ?? rawText
      ?? "NewebPay refund failed.",
    );
    throw new Error(message);
  }

  return payload;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed." }, 405);
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

    const supabase = createServiceClient();
    const elevated = await isElevatedUser(supabase, user.id);
    let vendorId: string | null = null;
    if (!elevated) {
      const { data: vendor, error: vendorError } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (vendorError) {
        return jsonResponse({ success: false, error: vendorError.message }, 500);
      }

      vendorId = vendor?.id || null;
      if (!vendorId) {
        return jsonResponse({ success: false, error: "Forbidden." }, 403);
      }
    }

    const body = await req.json() as { orderId?: string };
    const orderId = String(body.orderId || "").trim();
    if (!orderId) {
      return jsonResponse({ success: false, error: "Missing orderId." }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,user_id,total_amount,points_discount,status,payment_status,payment_method,merchant_order_no,newebpay_status,purchase_records(id,product_id,products(vendor_id))")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      return jsonResponse({ success: false, error: orderError.message }, 500);
    }

    if (!order) {
      return jsonResponse({ success: false, error: "Order not found." }, 404);
    }

    const currentPaymentStatus = String(order.payment_status || "unpaid");
    const currentStatus = String(order.status || "pending");

    if (currentPaymentStatus === "refunded") {
      return jsonResponse({
        success: true,
        message: "Order already refunded.",
        orderStatus: currentStatus,
        paymentStatus: currentPaymentStatus,
      });
    }

    if (!elevated && vendorId) {
      const vendorIds = new Set(
        (order.purchase_records || [])
          .map((record: { products?: { vendor_id?: string | null } | null }) => record.products?.vendor_id)
          .filter((value: string | null | undefined): value is string => Boolean(value)),
      );

      if (vendorIds.size === 0 || vendorIds.size > 1 || !vendorIds.has(vendorId)) {
        return jsonResponse({ success: false, error: "Forbidden." }, 403);
      }
    }

    const pointsDiscount = Math.max(0, Math.floor(Number(order.points_discount || 0)));
    const orderAmount = Math.max(0, Math.floor(Number(order.total_amount || 0)));
    const paymentMethod = String(order.payment_method || "");
    const usesNewebPay = orderAmount > 0 && ["credit_card", "points_credit_card"].includes(paymentMethod) && String(order.newebpay_status || "") === "success";

    if (usesNewebPay && !String(order.merchant_order_no || "").trim()) {
      return jsonResponse({ success: false, error: "Missing merchant order number." }, 400);
    }

    const credentials = await getNewebPayCredentials();
    let refundResult: Record<string, unknown> | null = null;

    if (usesNewebPay) {
      refundResult = await refundCreditCard(
        credentials,
        String(order.merchant_order_no || "").trim(),
        orderAmount,
      );
    }

    if (pointsDiscount > 0) {
      const { data: existingPoints } = await supabase
        .from("points")
        .select("id")
        .eq("source_type", "order")
        .eq("source_id", order.id)
        .eq("transaction_type", "earned")
        .eq("amount", pointsDiscount)
        .ilike("description", "Order refund points reversal%");

      if (!existingPoints || existingPoints.length === 0) {
        const { error: pointError } = await supabase.from("points").insert({
          user_id: order.user_id,
          amount: pointsDiscount,
          transaction_type: "earned",
          reference_id: order.id,
          source_type: "order",
          source_id: order.id,
          description: "Order refund points reversal",
        });
        if (pointError) {
          return jsonResponse({ success: false, error: pointError.message }, 500);
        }
      }
    }

    const nextPaymentStatus = orderAmount > 0 || pointsDiscount > 0 ? "refunded" : currentPaymentStatus;
    const { error: orderUpdateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: nextPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (orderUpdateError) {
      return jsonResponse({ success: false, error: orderUpdateError.message }, 500);
    }

    const { error: recordUpdateError } = await supabase
      .from("purchase_records")
      .update({
        status: nextPaymentStatus === "refunded" ? "refunded" : "cancelled",
      })
      .eq("order_id", order.id);

    if (recordUpdateError) {
      return jsonResponse({ success: false, error: recordUpdateError.message }, 500);
    }

    return jsonResponse({
      success: true,
      orderId: order.id,
      orderStatus: "cancelled",
      paymentStatus: nextPaymentStatus,
      refundedAmount: usesNewebPay ? orderAmount : 0,
      refundResult,
    });
  } catch (error) {
    console.error("[newebpay-order-refund] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Refund processing failed.",
    }, 500);
  }
});
