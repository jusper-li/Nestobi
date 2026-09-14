import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createEzpayInvoiceForOrder } from "../_shared/ezpay-invoice.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    // NewebPay retries when Notify does not receive HTTP 200. Always ACK the
    // callback transport; processing errors are retained in logs instead.
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function okResponse() {
  return new Response("1|OK", {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}

function redirectResponse(merchantOrderNo?: string) {
  const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://nestobi.com").replace(/\/$/, "");
  const target = new URL(`${siteUrl}/member/orders`);
  if (merchantOrderNo) target.searchParams.set("merchantOrderNo", merchantOrderNo);
  target.searchParams.set("payment", "subscription");
  return Response.redirect(target.toString(), 303);
}

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function redactCallbackPayload(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const copy = { ...(value as Record<string, unknown>) };
  for (const key of ["CardNo", "CardNumber", "CVV", "HashKey", "HashIV"]) {
    if (key in copy) copy[key] = "[REDACTED]";
  }
  return copy;
}

async function aesDecrypt(hexData: string, key: string, iv: string): Promise<string> {
  const encoder = new TextEncoder();
  let normalized = String(hexData || "").trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // formData normally decodes the value already; retain the raw value when
    // a provider/proxy sends a malformed percent escape.
  }
  normalized = normalized.replace(/^['"]|['"]$/g, "").replace(/\s+/g, "");

  let encryptedBytes: Uint8Array;
  if (/^[0-9a-f]+$/i.test(normalized) && normalized.length % 2 === 0) {
    encryptedBytes = new Uint8Array(
      (normalized.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)),
    );
  } else {
    // Keep compatibility with gateways/proxies that forward Period as
    // base64 instead of the documented hexadecimal ciphertext.
    const binary = atob(normalized);
    encryptedBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  if (encryptedBytes.length === 0 || encryptedBytes.length % 16 !== 0) {
    throw new Error("Invalid NewebPay Period ciphertext length");
  }
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

async function secretFingerprint(value: string | null) {
  if (!value) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

function safeEquals(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function parseDecryptedPeriod(value: string): Record<string, unknown> {
  const text = value.replace(/^\uFEFF/, "").trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // Some NDNP integrations request RespondType=String. Accept that form
    // as well as the documented JSON response.
  }
  const params = new URLSearchParams(text);
  const result: Record<string, unknown> = {};
  for (const [key, item] of params.entries()) result[key] = item;
  if (Object.keys(result).length === 0) throw new Error("Unable to parse decrypted NewebPay Period response");
  return result;
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
  merchantOrderNo?: string,
  paymentStatus?: string,
  recipientKind?: "customer" | "vendor" | "support" | "booking" | "order" | "system",
) {
  try {
    const supabase = createServiceClient();
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
          recipientKind: recipientKind || "order",
        },
      }),
    });
  } catch (error) {
    console.warn("[newebpay-period-webhook] Failed to send confirmation email:", error);
  }
}

async function sendNotificationEmail(subject: string, message: string, recipientKind: "payment-failed" | "alert" = "payment-failed") {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "notification",
        to: "",
        data: {
          subject,
          message,
          lang: "zh-TW",
          recipientKind,
        },
      }),
    });
  } catch (error) {
    console.warn("[newebpay-period-webhook] Failed to send notification email:", error);
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
    console.warn("[newebpay-period-webhook] Failed to calculate reward points:", error);
    return 0;
  }

  return Math.max(0, Math.floor(Number(data || 0)));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const shouldRedirect = new URL(req.url).searchParams.get("redirect") === "1";
  const supabase = createServiceClient();
  let callbackLogId: string | undefined;

  try {
    const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY") ?? "";
    const hashIV = Deno.env.get("NEWEBPAY_HASH_IV") ?? "";
    const merchantId = Deno.env.get("NEWEBPAY_MERCHANT_ID") ?? "";
    console.log("[period-notify] secrets", {
      merchantIdExists: Boolean(merchantId),
      merchantIdLength: merchantId.length,
      merchantIdFingerprint: await secretFingerprint(merchantId),
      hashKeyLength: hashKey.length,
      hashIvLength: hashIV.length,
      rawMerchantIdLength: merchantId.length,
      trimmedMerchantIdLength: merchantId.trim().length,
      rawHashKeyLength: hashKey.length,
      rawHashIvLength: hashIV.length,
      hashKeyFingerprint: await secretFingerprint(hashKey),
      hashIvFingerprint: await secretFingerprint(hashIV),
      trimmedHashKeyLength: hashKey.trim().length,
      trimmedHashIvLength: hashIV.trim().length,
    });
    if (!hashKey || !hashIV) {
      return jsonResponse({ success: false, error: "NewebPay HashKey/HashIV are not configured." }, 500);
    }

    const contentType = req.headers.get("content-type") || "";
    const params = new URLSearchParams();
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") params.append(key, value);
      }
    } else {
      const body = await req.text();
      const parsed = new URLSearchParams(body);
      for (const [key, value] of parsed.entries()) params.append(key, value);
    }
    console.log("[NewebPay Subscription Notify Received]", {
      contentType,
      bodyKeys: Array.from(params.keys()),
    });
    console.log("[newebpay-notify] received", { contentType, bodyKeys: Array.from(params.keys()) });
    // NDNP periodic-payment callbacks use the encrypted `Period` field;
    // retain TradeInfo support for gateways/proxies that normalize the name.
    const tradeInfo = params.get("Period") || params.get("TradeInfo");
    const tradeSha = params.get("TradeSha");
    const callbackLog = await supabase.from("payment_callback_logs").insert({
      provider: "newebpay",
      payment_type: "period",
      raw_payload: Object.fromEntries(params.entries()),
      processed: false,
    }).select("id").maybeSingle();
    callbackLogId = callbackLog.data?.id;
    if (callbackLog.error) {
      console.warn("[newebpay-period-webhook] Failed to log callback:", callbackLog.error);
    }

    if (!tradeInfo) {
      if (shouldRedirect) return redirectResponse();
      return jsonResponse({ success: false, error: "Missing TradeInfo." }, 400);
    }

    if (tradeSha) {
      const expectedSha = await sha256Hex(`HashKey=${hashKey}&${tradeInfo}&HashIV=${hashIV}`);
      if (!safeEquals(tradeSha.toUpperCase(), expectedSha)) {
        return jsonResponse({ success: false, error: "Invalid TradeSha." }, 400);
      }
    }

    const decryptedPeriod = await aesDecrypt(tradeInfo, hashKey, hashIV);
    console.log("[newebpay-notify] decrypted", { length: decryptedPeriod.length });
    console.log("[newebpay-period-webhook] decrypted payload received", {
      length: decryptedPeriod.length,
      preview: decryptedPeriod.slice(0, 300),
    });
    const payload = parseDecryptedPeriod(decryptedPeriod);
    console.log("[newebpay-notify] payload parsed", { hasResult: Boolean(payload.Result || payload.result) });
    const result = payload.Result ?? payload;
    const tradeStatus = String(payload.Status ?? params.get("Status") ?? result.Status ?? "").toUpperCase();
    // NDNP uses MerOrderNo (the request/response field in the periodic
    // payment protocol). Keep MerchantOrderNo as a compatibility fallback for
    // gateways or proxies that normalize the field name.
    const merchantOrderNo = String(
      result.MerOrderNo ?? result.MerchantOrderNo ?? payload.MerOrderNo ?? payload.MerchantOrderNo ?? "",
    ).trim();
    const periodNo = String(result.PeriodNo || "");
    const tradeNo = String(result.TradeNo || "");
    console.log("[newebpay-period-webhook] decrypted subscription result", {
      status: tradeStatus,
      message: String(payload.Message ?? result.Message ?? ""),
      merOrderNo: merchantOrderNo,
      periodNo,
      amount: result.AlterAmt ?? result.PeriodAmt ?? null,
      periodTimes: result.PeriodTimes ?? null,
    });

    if (callbackLogId) {
      await supabase.from("payment_callback_logs").update({
        merchant_order_no: merchantOrderNo || null,
        trade_no: tradeNo || null,
        status: tradeStatus || null,
        decrypted_payload: redactCallbackPayload(payload),
      }).eq("id", callbackLogId);
    }

    if (!merchantOrderNo && !periodNo && !tradeNo) {
      return jsonResponse({ success: false, error: "Missing subscription reference." }, 400);
    }

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

    console.log("[newebpay-period-webhook] subscription reference", {
      merchantOrderNo,
      periodNo,
      orderFound: Boolean(subscription.order_id),
    });
    console.log("[newebpay-notify] order found", { merchantOrderNo, found: true });

    const now = new Date();
    const payAt = parseNewebPayDate(result.PayTime ?? result.AuthTime ?? now.toISOString());
    const gatewayTradeNo = tradeNo || null;
    const gatewayPeriodNo = periodNo || null;
    const paidAmount = Number(subscription.monthly_amount || 0);
    const cycleNo = Number(subscription.billing_cycle_count || 0) + 1;
    const totalCycles = subscription.period_times === "NE" ? null : Math.max(0, Math.floor(Number(subscription.period_times || 0)));
    const nextBillAt = nextBillingDate(now, String(subscription.period_times || "NE"));
    const subscriptionOrderNo = buildRecurringOrderNo(subscription.id, cycleNo, gatewayTradeNo);

    // A retried callback for the same periodic authorization must be a no-op.
    if (gatewayPeriodNo && subscription.newebpay_period_no === gatewayPeriodNo) {
      if (callbackLogId) await supabase.from("payment_callback_logs").update({ processed: true }).eq("id", callbackLogId);
      return shouldRedirect ? redirectResponse(merchantOrderNo) : okResponse();
    }

    let existingOrderQuery = supabase
      .from("orders")
      .select("id")
      .eq("subscription_id", subscription.id);

    if (gatewayTradeNo) {
      existingOrderQuery = existingOrderQuery.eq("newebpay_trade_no", gatewayTradeNo);
    } else if (merchantOrderNo) {
      existingOrderQuery = existingOrderQuery.eq("merchant_order_no", merchantOrderNo);
    }

    const { data: existingOrder, error: existingOrderError } = await existingOrderQuery.maybeSingle();
    if (existingOrderError) {
      console.error("[newebpay-period-webhook] Order lookup failed", {
        merchantOrderNo,
        periodNo,
        error: existingOrderError,
      });
      throw existingOrderError;
    }
    console.log("[newebpay-period-webhook] order lookup", {
      merchantOrderNo,
      periodNo,
      orderFound: Boolean(existingOrder),
    });

    if (existingOrder) {
      if (callbackLogId) await supabase.from("payment_callback_logs").update({ processed: true }).eq("id", callbackLogId);
      return shouldRedirect ? redirectResponse(merchantOrderNo) : okResponse();
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
      const { data: authUser } = await supabase.auth.admin.getUserById(subscription.user_id);

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

      // Keep the order created when the subscription started in sync with
      // the successful first charge. Otherwise that original order can stay
      // marked unpaid while only the recurring-cycle order is paid.
      if (subscription.order_id && subscription.order_id !== order.id) {
        const { error: initialOrderUpdateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            newebpay_status: "success",
            newebpay_trade_no: gatewayTradeNo,
            newebpay_auth_code: result.AuthCode ?? null,
            newebpay_card_no: result.CardNo ?? null,
            newebpay_respond_code: result.RespondCode ?? null,
            newebpay_payment_type: result.PaymentType ?? null,
            newebpay_paid_at: payAt,
            updated_at: now.toISOString(),
          })
          .eq("id", subscription.order_id);

        if (initialOrderUpdateError) {
          console.error("[newebpay-period-webhook] Initial order update failed", {
            merchantOrderNo,
            periodNo,
            error: initialOrderUpdateError,
          });
          throw initialOrderUpdateError;
        }
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

      const { error: subscriptionUpdateError } = await supabase
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
      if (subscriptionUpdateError) {
        console.error("[newebpay-period-webhook] Subscription update failed", {
          merchantOrderNo,
          periodNo,
          error: subscriptionUpdateError,
        });
        throw subscriptionUpdateError;
      }
      console.log("[newebpay-period-webhook] Subscription update succeeded", {
        merchantOrderNo,
        periodNo,
        paidPeriods: cycleNo,
      });
      console.log("[newebpay-notify] payment updated", { merchantOrderNo, paidPeriods: cycleNo });

      const displayName = String(profile?.display_name || subscription.customer_name || "");
      // Older subscriptions may not have copied customer_email. Resolve the
      // authenticated email as a safe fallback so paid subscriptions still
      // receive the order confirmation.
      const email = String(subscription.customer_email || authUser.user?.email || "");
      const language = String(profile?.preferred_language || "zh-TW");

      if (email) {
        await sendOrderEmail(email, displayName, items, paidAmount, language, subscription.merchant_order_no, "paid");
      }

      if (vendor?.contact_email) {
        await sendOrderEmail(
          String(vendor.contact_email),
          String(vendor.name || "vendor"),
          items,
          paidAmount,
          language,
          subscription.merchant_order_no,
          "paid",
          "vendor",
        );
      }

      const rewardPoints = await getRewardPoints(supabase, "subscription", paidAmount);
      if (rewardPoints > 0) {
        await supabase.from("points").insert({
          user_id: subscription.user_id,
          amount: rewardPoints,
          transaction_type: "earned",
          reference_id: order.id,
          source_type: "subscription",
          source_id: order.id,
          vendor_id: subscription.vendor_id || null,
          description: "Subscription reward points",
        });
      }

      try {
        const invoiceResult = await createEzpayInvoiceForOrder(supabase, order.id);
        if (!invoiceResult.success && invoiceResult.error) {
          console.warn("[newebpay-period-webhook] Invoice creation failed:", invoiceResult.error);
        }
      } catch (invoiceError) {
        console.warn("[newebpay-period-webhook] Invoice creation failed:", invoiceError);
      }

      if (callbackLogId) await supabase.from("payment_callback_logs").update({ processed: true }).eq("id", callbackLogId);
      console.log("[newebpay-notify] response 200");
      return shouldRedirect ? redirectResponse(merchantOrderNo) : okResponse();
    }

    const { error: failedSubscriptionUpdateError } = await supabase
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
    if (failedSubscriptionUpdateError) {
      console.error("[newebpay-period-webhook] Failed subscription update failed", {
        merchantOrderNo,
        periodNo,
        error: failedSubscriptionUpdateError,
      });
      throw failedSubscriptionUpdateError;
    }

    await sendNotificationEmail(
      `定期便付款失敗：${subscription.merchant_order_no}`,
      [
        `訂閱編號：${subscription.id}`,
        `訂單編號：${subscription.merchant_order_no}`,
        `會員 ID：${subscription.user_id}`,
        `商品 ID：${subscription.product_id}`,
        `狀態：付款失敗`,
      ].join("\n"),
      "payment-failed",
    );

    if (callbackLogId) await supabase.from("payment_callback_logs").update({ processed: true }).eq("id", callbackLogId);
    console.log("[newebpay-notify] response 200");
    return shouldRedirect ? redirectResponse(merchantOrderNo) : okResponse();
  } catch (error) {
    console.error("[newebpay-period-webhook] Error:", error);
    if (callbackLogId) {
      const message = error instanceof Error ? error.message : "Webhook processing failed.";
      const { error: logError } = await supabase
        .from("payment_callback_logs")
        .update({ error_message: message })
        .eq("id", callbackLogId);
      if (logError) console.error("[newebpay-period-webhook] Failed to record error:", logError);
    }
    if (new URL(req.url).searchParams.get("redirect") === "1") {
      return redirectResponse();
    }
    console.log("[newebpay-notify] response 200", { error: error instanceof Error ? error.message : "Webhook processing failed." });
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Webhook processing failed.",
    }, 500);
  }
});
