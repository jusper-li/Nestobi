import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function okResponse() {
  return new Response("1|OK", {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

async function aesDecrypt(hexData: string, key: string, iv: string): Promise<string> {
  const encoder = new TextEncoder();
  const encryptedBytes = new Uint8Array(
    (hexData.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16))
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: encoder.encode(iv) },
    cryptoKey,
    encryptedBytes
  );
  return new TextDecoder().decode(decrypted);
}

async function sha256Hex(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function safeEquals(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function parseNewebPayDate(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}+08:00`;
  }
  return new Date().toISOString();
}

function buildRecurringOrderNo(subscriptionId: string, cycleNo: number, tradeNo?: string | null) {
  const clean = subscriptionId.replaceAll("-", "").slice(0, 8);
  const tradeSuffix = String(tradeNo || Date.now().toString()).replaceAll(/[^0-9A-Za-z]/g, "").slice(-6);
  return `SB${clean}${String(cycleNo).padStart(2, "0")}${tradeSuffix}`.slice(0, 30);
}

function addMonthsClamped(input: Date, months: number) {
  const next = new Date(input.getTime());
  const day = next.getDate();
  next.setMonth(next.getMonth() + months, 1);
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, maxDay));
  return next;
}

function nextBillingDate(base: Date, planTimes: string) {
  if (planTimes === "NE") {
    return addMonthsClamped(base, 1).toISOString();
  }
  return addMonthsClamped(base, 1).toISOString();
}

async function sendOrderEmail(
  to: string,
  displayName: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  totalAmount: number,
  lang: string,
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
        },
      }),
    });
  } catch (error) {
    console.warn("[newebpay-period-webhook] Failed to send confirmation email:", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY") ?? "";
    const hashIV = Deno.env.get("NEWEBPAY_HASH_IV") ?? "";
    if (!hashKey || !hashIV) {
      return jsonResponse({ success: false, error: "NewebPay HashKey/HashIV are not configured." }, 500);
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const tradeInfo = params.get("TradeInfo");
    const tradeSha = params.get("TradeSha");

    if (!tradeInfo) {
      return jsonResponse({ success: false, error: "Missing TradeInfo." }, 400);
    }

    if (tradeSha) {
      const expectedSha = await sha256Hex(`HashKey=${hashKey}&${tradeInfo}&HashIV=${hashIV}`);
      if (!safeEquals(tradeSha.toUpperCase(), expectedSha)) {
        return jsonResponse({ success: false, error: "Invalid TradeSha." }, 400);
      }
    }

    const payload = JSON.parse(await aesDecrypt(tradeInfo, hashKey, hashIV));
    const result = payload.Result ?? payload;
    const tradeStatus = String(payload.Status ?? params.get("Status") ?? result.Status ?? "").toUpperCase();
    const merchantOrderNo = String(result.MerchantOrderNo || "");
    const periodNo = String(result.PeriodNo || "");
    const tradeNo = String(result.TradeNo || "");

    if (!merchantOrderNo && !periodNo && !tradeNo) {
      return jsonResponse({ success: false, error: "Missing subscription reference." }, 400);
    }

    const supabase = createServiceClient();
    const subscriptionQuery = supabase
      .from("product_subscriptions")
      .select(`
        id,
        user_id,
        product_id,
        vendor_id,
        order_id,
        merchant_order_no,
        newebpay_period_no,
        quantity,
        monthly_amount,
        period_times,
        billing_cycle_count,
        status,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        newebpay_status
      `)
      .or([
        merchantOrderNo ? `merchant_order_no.eq.${merchantOrderNo}` : null,
        periodNo ? `newebpay_period_no.eq.${periodNo}` : null,
      ].filter(Boolean).join(","))
      .maybeSingle();

    const { data: subscription, error: subscriptionError } = await subscriptionQuery;

    if (subscriptionError) {
      return jsonResponse({ success: false, error: subscriptionError.message }, 500);
    }

    if (!subscription) {
      return jsonResponse({ success: false, error: "Subscription not found." }, 404);
    }

    const now = new Date();
    const payAt = parseNewebPayDate(result.PayTime ?? result.AuthTime ?? now.toISOString());
    const gatewayTradeNo = tradeNo || null;
    const gatewayPeriodNo = periodNo || null;
    const paidAmount = Number(subscription.monthly_amount || 0);
    const cycleNo = Number(subscription.billing_cycle_count || 0) + 1;
    const totalCycles = subscription.period_times === "NE" ? null : Math.max(0, Math.floor(Number(subscription.period_times || 0)));
    const nextBillAt = nextBillingDate(now, String(subscription.period_times || "NE"));
    const subscriptionOrderNo = buildRecurringOrderNo(subscription.id, cycleNo, gatewayTradeNo);

    let existingOrderQuery = supabase
      .from("orders")
      .select("id")
      .eq("subscription_id", subscription.id);

    if (gatewayTradeNo) {
      existingOrderQuery = existingOrderQuery.eq("newebpay_trade_no", gatewayTradeNo);
    } else if (merchantOrderNo) {
      existingOrderQuery = existingOrderQuery.eq("merchant_order_no", merchantOrderNo);
    }

    const { data: existingOrder } = await existingOrderQuery.maybeSingle();

    if (existingOrder) {
      return okResponse();
    }

    if (tradeStatus === "SUCCESS") {
      const { data: product } = await supabase
        .from("products")
        .select("id,name,vendor_id,image_url")
        .eq("id", subscription.product_id)
        .maybeSingle();

      const { data: vendor } = subscription.vendor_id
        ? await supabase.from("vendors").select("id,name,contact_email").eq("id", subscription.vendor_id).maybeSingle()
        : { data: null };

      const { data: profile } = await supabase
        .from("tbl_mn5wgzh0")
        .select("display_name,preferred_language")
        .eq("user_id", subscription.user_id)
        .maybeSingle();

      const itemName = String(product?.name || "Coffee subscription");
      const unitPrice = paidAmount / Math.max(1, Number(subscription.quantity || 1));
      const items = [{
        name: itemName,
        quantity: Number(subscription.quantity || 1),
        price: unitPrice,
      }];

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          recurring_cycle_no: cycleNo,
          total_amount: paidAmount,
          subtotal_amount: paidAmount,
          points_discount: 0,
          status: "processing",
          payment_method: "credit_card",
          payment_status: "paid",
          newebpay_status: "success",
          merchant_order_no: subscriptionOrderNo,
          shipping_address: subscription.shipping_address || {},
          discount_code: "",
          currency: "TWD",
          newebpay_trade_no: gatewayTradeNo,
          newebpay_auth_code: result.AuthCode ?? null,
          newebpay_card_no: result.CardNo ?? null,
          newebpay_respond_code: result.RespondCode ?? null,
          newebpay_payment_type: result.PaymentType ?? null,
          newebpay_paid_at: payAt,
        })
        .select("id")
        .single();

      if (orderError || !order) {
        return jsonResponse({
          success: false,
          error: orderError?.message || "Unable to create subscription order.",
        }, 500);
      }

      await supabase.from("purchase_records").insert({
        order_id: order.id,
        user_id: subscription.user_id,
        product_id: subscription.product_id,
        quantity: Number(subscription.quantity || 1),
        unit_price: unitPrice,
        total_price: paidAmount,
        payment_method: "credit_card",
        shipping_address: subscription.shipping_address || {},
        status: "completed",
      });

      const nextStatus = totalCycles && cycleNo >= totalCycles ? "expired" : "active";

      await supabase
        .from("product_subscriptions")
        .update({
          order_id: order.id,
          newebpay_period_no: gatewayPeriodNo || subscription.newebpay_period_no,
          newebpay_trade_no: gatewayTradeNo,
          newebpay_auth_code: result.AuthCode ?? null,
          newebpay_card_no: result.CardNo ?? null,
          newebpay_payment_type: result.PaymentType ?? null,
          newebpay_respond_code: result.RespondCode ?? null,
          newebpay_status: "success",
          newebpay_paid_at: payAt,
          billing_cycle_count: cycleNo,
          started_at: subscription.started_at || payAt,
          last_billed_at: payAt,
          next_bill_at: nextStatus === "expired" ? null : nextBillAt,
          status: nextStatus,
          ended_at: nextStatus === "expired" ? payAt : null,
          expires_at: nextStatus === "expired" ? payAt : null,
          updated_at: now.toISOString(),
        })
        .eq("id", subscription.id);

      const displayName = String(profile?.display_name || subscription.customer_name || "");
      const email = String(subscription.customer_email || "");
      const language = String(profile?.preferred_language || "zh-TW");

      if (email) {
        await sendOrderEmail(email, displayName, items, paidAmount, language);
      }

      if (vendor?.contact_email) {
        await sendOrderEmail(String(vendor.contact_email), String(vendor.name || "vendor"), items, paidAmount, language);
      }

      return okResponse();
    }

    await supabase
      .from("product_subscriptions")
      .update({
        newebpay_period_no: gatewayPeriodNo || subscription.newebpay_period_no,
        newebpay_trade_no: gatewayTradeNo,
        newebpay_auth_code: result.AuthCode ?? null,
        newebpay_card_no: result.CardNo ?? null,
        newebpay_payment_type: result.PaymentType ?? null,
        newebpay_respond_code: result.RespondCode ?? null,
        newebpay_status: "failed",
        status: subscription.status === "active" ? "paused" : "cancelled",
        updated_at: now.toISOString(),
      })
      .eq("id", subscription.id);

    return okResponse();
  } catch (error) {
    console.error("[newebpay-period-webhook] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Webhook processing failed.",
    }, 500);
  }
});
