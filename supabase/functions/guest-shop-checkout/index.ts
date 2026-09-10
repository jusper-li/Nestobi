import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
type PaymentMethod = "CREDIT" | "WEBATM" | "ATM" | "CVS" | "BARCODE";
const validMethods = new Set<PaymentMethod>(["CREDIT", "WEBATM", "ATM", "CVS", "BARCODE"]);
const service = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const sha256 = async (value: string) => { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes)).map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase(); };
const encrypt = async (value: string, key: string, iv: string) => { const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "AES-CBC" }, false, ["encrypt"]); const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv: new TextEncoder().encode(iv) }, cryptoKey, new TextEncoder().encode(value)); return Array.from(new Uint8Array(encrypted)).map(v => v.toString(16).padStart(2, "0")).join(""); };
const flags = (method: PaymentMethod) => ({ CREDIT: method === "CREDIT" ? "1" : "0", WEBATM: method === "WEBATM" ? "1" : "0", VACC: method === "ATM" ? "1" : "0", CVS: method === "CVS" ? "1" : "0", BARCODE: method === "BARCODE" ? "1" : "0", UNIONPAY: "0", APPLEPAY: "0", ANDROIDPAY: "0" });
const siteUrl = (req: Request) => Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || req.headers.get("Origin") || "https://nestobi.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const guestToken = String(body.guestCheckoutToken || "").trim(); const name = String(body.name || "").trim(); const phone = String(body.phone || "").trim(); const email = String(body.email || "").trim().toLowerCase(); const address = String(body.address || "").trim();
    const items = Array.isArray(body.items) ? body.items.map((item: any) => ({ product_id: String(item.productId || item.product_id || ""), quantity: Math.floor(Number(item.quantity || 0)) })).filter((item: any) => item.product_id && item.quantity > 0) : [];
    const method = String(body.paymentMethod || "CREDIT").toUpperCase() as PaymentMethod; const points = Math.floor(Number(body.pointsToUse || 0));
    if (!guestToken || !name || !phone || !email || !address || items.length === 0) return json({ success: false, error: "請完整填寫訂購資訊。" }, 400);
    if (!validMethods.has(method)) return json({ success: false, error: "Unsupported payment method." }, 400);
    const merchantOrderNo = `NG${Date.now().toString().slice(-12)}${crypto.randomUUID().replaceAll("-", "").slice(0, 6)}`;
    const db = service();
    const { data: checkout, error } = await db.rpc("create_guest_shop_checkout_order", { p_merchant_order_no: merchantOrderNo, p_guest_checkout_token: guestToken, p_shipping_name: name, p_shipping_phone: phone, p_shipping_email: email, p_shipping_address: address, p_items: items, p_point_session_id: body.pointSessionId || null, p_points_to_use: points });
    if (error || !checkout?.success) return json({ success: false, error: error?.message || checkout?.error || "Checkout failed." }, 400);
    const base = siteUrl(req).replace(/\/$/, ""); const returnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/newebpay-order-sync`; const clientBackUrl = `${base}/cart?guestOrder=${encodeURIComponent(merchantOrderNo)}`;
    if (Number(checkout.total_amount || 0) === 0) {
      const { error: captureError } = await db.rpc("capture_member_points", { p_order_id: checkout.order_id });
      if (captureError) return json({ success: false, error: "Point capture failed." }, 500);
      return json({ success: true, mode: "points", orderId: checkout.order_id, merchantOrderNo, clientBackUrl });
    }
    const merchantId = Deno.env.get("NEWEBPAY_MERCHANT_ID"); const hashKey = Deno.env.get("NEWEBPAY_HASH_KEY"); const hashIV = Deno.env.get("NEWEBPAY_HASH_IV");
    if (!merchantId || !hashKey || !hashIV) return json({ success: false, error: "NewebPay credentials are not configured." }, 500);
    const names = (checkout.items || []).map((item: any) => String(item.name || "")).filter(Boolean).slice(0, 3).join(", ") || "Nestobi shop purchase";
    const params = new URLSearchParams({ MerchantID: merchantId, RespondType: "JSON", TimeStamp: String(Math.floor(Date.now() / 1000)), Version: "2.3", MerchantOrderNo: merchantOrderNo, Amt: String(Math.round(Number(checkout.total_amount))), ItemDesc: names, Email: email, LoginType: "0", NotifyURL: `${Deno.env.get("SUPABASE_URL")}/functions/v1/newebpay-mpg-webhook`, ReturnURL: returnUrl, ClientBackURL: clientBackUrl, ...flags(method) });
    const tradeInfo = await encrypt(params.toString(), hashKey, hashIV); const tradeSha = await sha256(`HashKey=${hashKey}&${tradeInfo}&HashIV=${hashIV}`);
    return json({ success: true, mode: "newebpay", orderId: checkout.order_id, merchantOrderNo, paymentUrl: Deno.env.get("NEWEBPAY_MPG_URL") || "https://core.newebpay.com/MPG/mpg_gateway", merchantId, tradeInfo, tradeSha, version: "2.3", returnUrl, clientBackUrl });
  } catch (error) { console.error("[guest-shop-checkout]", error); return json({ success: false, error: error instanceof Error ? error.message : "Checkout failed." }, 500); }
});
