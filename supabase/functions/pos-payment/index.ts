import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
type PaymentMethod = "CREDIT" | "WEBATM" | "ATM" | "CVS" | "BARCODE";
const methods = new Set<PaymentMethod>(["CREDIT", "WEBATM", "ATM", "CVS", "BARCODE"]);
const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
};
const encrypt = async (value: string, key: string, iv: string) => {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "AES-CBC" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv: new TextEncoder().encode(iv) }, cryptoKey, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(encrypted)).map((v) => v.toString(16).padStart(2, "0")).join("");
};
const flags = (method: PaymentMethod) => ({ CREDIT: method === "CREDIT" ? "1" : "0", WEBATM: method === "WEBATM" ? "1" : "0", VACC: method === "ATM" ? "1" : "0", CVS: method === "CVS" ? "1" : "0", BARCODE: method === "BARCODE" ? "1" : "0", UNIONPAY: "0", APPLEPAY: "0", ANDROIDPAY: "0" });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.paymentToken || "").trim();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const points = Math.max(0, Math.floor(Number(body.pointsToUse || 0)));
    const method = String(body.paymentMethod || "CREDIT").toUpperCase() as PaymentMethod;
    if (!token || !name || !phone || !email || !methods.has(method)) return json({ success: false, error: "請完整填寫付款資料。" }, 400);
    const service = db();
    const { data: order, error: orderError } = await service.rpc("get_pos_order", { p_payment_token: token });
    if (orderError || !order?.success || order.paymentStatus !== "unpaid") return json({ success: false, error: orderError?.message || "POS 訂單已完成或已失效。" }, 400);
    let total = Number(order.totalAmount || 0);
    let pointsDiscount = Number(order.pointsDiscount || 0);
    if (points > 0) {
      const { data: reserved, error } = await service.rpc("reserve_guest_points_for_pos_order", {
        p_payment_token: token,
        p_session_id: body.pointSessionId || null,
        p_points: points,
        p_name: name,
        p_phone: phone,
        p_email: email,
      });
      if (error || !reserved?.success) return json({ success: false, error: error?.message || "點數折抵失敗。" }, 400);
      total = Number(reserved.totalAmount || 0);
      pointsDiscount = Number(reserved.pointsDiscount || points);
    } else {
      const { error } = await service.from("orders").update({ shipping_address: { name, phone, email, address: "" }, payment_method: method.toLowerCase(), updated_at: new Date().toISOString() }).eq("pos_payment_token_hash", await sha256(token)).eq("order_channel", "pos").eq("payment_status", "unpaid");
      if (error) return json({ success: false, error: error.message }, 400);
      await service.from("purchase_records").update({ payment_method: method.toLowerCase(), shipping_address: { name, phone, email } }).eq("order_id", order.orderId);
    }
    if (total <= 0) {
      const { error: captureError } = await service.rpc("capture_member_points", { p_order_id: order.orderId });
      if (captureError) return json({ success: false, error: "點數扣款失敗。" }, 500);
      await service.from("orders").update({ status: "processing", payment_status: "paid", newebpay_status: "not_required", updated_at: new Date().toISOString() }).eq("id", order.orderId);
      await service.from("purchase_records").update({ status: "completed" }).eq("order_id", order.orderId);
      return json({ success: true, mode: "points", orderId: order.orderId, totalAmount: 0, pointsDiscount });
    }
    const merchantId = Deno.env.get("NEWEBPAY_MERCHANT_ID");
    const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY");
    const hashIV = Deno.env.get("NEWEBPAY_HASH_IV");
    if (!merchantId || !hashKey || !hashIV) return json({ success: false, error: "NewebPay credentials are not configured." }, 500);
    const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || req.headers.get("Origin") || "https://nestobi.com").replace(/\/$/, "");
    const returnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/newebpay-order-sync?posToken=${encodeURIComponent(token)}`;
    const clientBackUrl = `${siteUrl}/pos/pay/${encodeURIComponent(token)}`;
    const merchantOrderNo = String(order.merchantOrderNo);
    const params = new URLSearchParams({ MerchantID: merchantId, RespondType: "JSON", TimeStamp: String(Math.floor(Date.now() / 1000)), Version: "2.3", MerchantOrderNo: merchantOrderNo, Amt: String(Math.round(total)), ItemDesc: (order.items || []).map((item: any) => `${item.name} x${item.quantity}`).slice(0, 3).join(", ") || "Nestobi POS purchase", Email: email, LoginType: "0", NotifyURL: `${Deno.env.get("SUPABASE_URL")}/functions/v1/newebpay-mpg-webhook`, ReturnURL: returnUrl, ClientBackURL: clientBackUrl, ...flags(method) });
    const tradeInfo = await encrypt(params.toString(), hashKey, hashIV);
    const tradeSha = await sha256(`HashKey=${hashKey}&${tradeInfo}&HashIV=${hashIV}`);
    await service.from("orders").update({ payment_method: points > 0 ? "points_credit_card" : method.toLowerCase(), points_discount: pointsDiscount, total_amount: total, updated_at: new Date().toISOString() }).eq("id", order.orderId).eq("payment_status", "unpaid");
    return json({ success: true, mode: "newebpay", orderId: order.orderId, paymentUrl: Deno.env.get("NEWEBPAY_MPG_URL") || "https://core.newebpay.com/MPG/mpg_gateway", merchantId, tradeInfo, tradeSha, version: "2.3", returnUrl, clientBackUrl, totalAmount: total });
  } catch (error) {
    console.error("[pos-payment]", error);
    return json({ success: false, error: error instanceof Error ? error.message : "付款失敗。" }, 500);
  }
});
