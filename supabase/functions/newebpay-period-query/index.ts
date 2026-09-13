import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, Apikey, X-Client-Info" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const service = () => createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
const authClient = (header: string) => createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_ANON_KEY") || "", { global: { headers: { Authorization: header } } });

async function encryptHex(value: string, key: string, iv: string) {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "AES-CBC" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv: new TextEncoder().encode(iv) }, cryptoKey, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(encrypted)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function decryptHex(value: string, key: string, iv: string) {
  const bytes = new Uint8Array((value.match(/.{1,2}/g) || []).map(byte => parseInt(byte, 16)));
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "AES-CBC" }, false, ["decrypt"]);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-CBC", iv: new TextEncoder().encode(iv) }, cryptoKey, bytes));
}

async function elevated(db: ReturnType<typeof service>, userId: string) {
  const { data } = await db.from("tbl_user_auth").select("role").eq("user_id", userId).maybeSingle();
  return data?.role === "admin" || data?.role === "superadmin";
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  try {
    const merchantId = Deno.env.get("NEWEBPAY_MERCHANT_ID") || "";
    const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY") || "";
    const hashIV = Deno.env.get("NEWEBPAY_HASH_IV") || "";
    console.log("[newebpay-period-query] environment", {
      merchantIdExists: Boolean(merchantId),
      hashKeyExists: Boolean(hashKey),
      hashIvExists: Boolean(hashIV),
    });
    if (!merchantId || !hashKey || !hashIV) return json({ success: false, error: "Missing NewebPay environment configuration" }, 500);
    const header = req.headers.get("Authorization");
    if (!header) return json({ success: false, error: "Authentication required." }, 401);
    const { data: { user } } = await authClient(header).auth.getUser();
    if (!user) return json({ success: false, error: "Invalid session." }, 401);
    const body = await req.json().catch(() => ({}));
    console.log({ bodyKeys: Object.keys(body ?? {}), merchantOrderNo: body?.merchantOrderNo ?? null });
    const subscriptionId = String(body.subscriptionId || "").trim();
    const requestedMerchantOrderNo = String(body.merchantOrderNo || "").trim();
    if (!subscriptionId && !requestedMerchantOrderNo) return json({ success: false, error: "merchantOrderNo is required" }, 400);
    const db = service();
    let subscriptionQuery = db.from("product_subscriptions").select("id,user_id,vendor_id,merchant_order_no,newebpay_period_no,monthly_amount,billing_cycle_count,status,period_times,order_id");
    subscriptionQuery = subscriptionId ? subscriptionQuery.eq("id", subscriptionId) : subscriptionQuery.eq("merchant_order_no", requestedMerchantOrderNo);
    const { data: subscription, error: subscriptionError } = await subscriptionQuery.maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription) return json({ success: false, error: "Subscription not found." }, 404);
    const isOwner = subscription.user_id === user.id || (subscription.vendor_id && (await db.from("vendors").select("id").eq("id", subscription.vendor_id).eq("user_id", user.id).maybeSingle()).data);
    if (!isOwner && !(await elevated(db, user.id))) return json({ success: false, error: "Forbidden." }, 403);
    const requestData = new URLSearchParams({ RespondType: "JSON", Version: "1.0", TimeStamp: String(Math.floor(Date.now() / 1000)), MerOrderNo: subscription.merchant_order_no || "" });
    if (subscription.newebpay_period_no) requestData.set("PeriodNo", subscription.newebpay_period_no);
    const endpoint = "https://core.newebpay.com/MPG/period/query";
    console.log({ endpoint, merchantOrderNo: subscription.merchant_order_no, requestReady: true });
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ MerchantID_: merchantId, PostData_: await encryptHex(requestData.toString(), hashKey, hashIV) }).toString() });
    const raw = await response.text();
    const safePreview = raw.slice(0, 500).replace(/(CardNo|CardNumber|CVV|HashKey|HashIV)\s*[:=]\s*[^,&\s}]+/gi, "$1=[REDACTED]");
    console.log({ httpStatus: response.status, ok: response.ok, responsePreview: safePreview });
    let gatewayResponse: any = null;
    const encrypted = (() => {
      try {
        const parsed = JSON.parse(raw);
        gatewayResponse = parsed;
        return String(parsed.Period || parsed.period || "").trim();
      } catch {
        const form = new URLSearchParams(raw);
        const value = String(form.get("Period") || form.get("period") || "").trim();
        return value || (/^[0-9a-f]+$/i.test(raw.trim()) ? raw.trim() : "");
      }
    })();
    if (!response.ok) return json({ success: false, provider: "newebpay", providerHttpStatus: response.status, providerResponse: safePreview }, 502);
    if (!encrypted) return json({ success: false, provider: "newebpay", error: "NewebPay response did not include Period.", providerCode: gatewayResponse?.Status || gatewayResponse?.status || null, providerMessage: gatewayResponse?.Message || gatewayResponse?.message || safePreview }, 502);
    const payload = JSON.parse(await decryptHex(encrypted, hashKey, hashIV));
    console.log("[newebpay-period-query] decrypt success", { merchantOrderNo: subscription.merchant_order_no, periodPresent: Boolean(payload) });
    const result = payload.Result || payload.result || {};
    const queryStatus = String(payload.Status || payload.status || "").toUpperCase();
    const alreadyTimes = Math.max(0, Number(result.AlreadyTimes || 0));
    const mandateStatus = String(result.Status ?? "");
    const nextStatus = mandateStatus === "1" ? "active" : mandateStatus === "4" ? "expired" : mandateStatus === "5" ? "paused" : mandateStatus === "3" ? "cancelled" : mandateStatus === "2" ? "cancelled" : subscription.status;
    const update = { newebpay_period_no: result.PeriodNo || subscription.newebpay_period_no, billing_cycle_count: alreadyTimes, status: nextStatus, newebpay_status: queryStatus === "SUCCESS" ? "success" : queryStatus.toLowerCase(), next_bill_at: result.NextAuthDate ? new Date(result.NextAuthDate).toISOString() : null, updated_at: new Date().toISOString() };
    const { data: updated, error: updateError } = await db.from("product_subscriptions").update(update).eq("id", subscription.id).select("id,billing_cycle_count,status,newebpay_status,next_bill_at").single();
    if (updateError) throw updateError;
    if (alreadyTimes > 0) {
      let orderUpdate = db.from("orders").update({ payment_status: "paid", newebpay_status: "success", payment_method: "newebpay_subscription", updated_at: new Date().toISOString() });
      orderUpdate = subscription.order_id ? orderUpdate.eq("id", subscription.order_id) : orderUpdate.eq("subscription_id", subscription.id);
      const { error: orderError } = await orderUpdate;
      if (orderError) throw orderError;
    }
    return json({ success: true, queryStatus, result: { merOrderNo: result.MerOrderNo || result.MerchantOrderNo || null, periodNo: result.PeriodNo || null, mandateStatus, alreadyTimes, totalTimes: result.TotalTimes || null, nextAuthDate: result.NextAuthDate || null }, updated });
  } catch (error) {
    console.error("[newebpay-period-query] Error", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Periodic query failed." }, 500);
  }
});
