import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NewebPayCredentials {
  hashKey: string | null;
  hashIV: string | null;
}

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

async function getNewebPayCredentials(): Promise<NewebPayCredentials> {
  const envCredentials = {
    hashKey: Deno.env.get("NEWEBPAY_HASH_KEY") ?? null,
    hashIV: Deno.env.get("NEWEBPAY_HASH_IV") ?? null,
  };

  return {
    hashKey: envCredentials.hashKey,
    hashIV: envCredentials.hashIV,
  };
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

async function sendOrderEmail(to: string, displayName: string, items: Array<{ name: string; quantity: number; price: number }>, totalAmount: number) {
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
        },
      }),
    });
  } catch (error) {
    console.warn("[newebpay-mpg-webhook] Failed to send confirmation email:", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const credentials = await getNewebPayCredentials();
    if (!credentials.hashKey || !credentials.hashIV) {
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
      const expectedSha = await sha256Hex(`HashKey=${credentials.hashKey}&${tradeInfo}&HashIV=${credentials.hashIV}`);
      if (!safeEquals(tradeSha.toUpperCase(), expectedSha)) {
        return jsonResponse({ success: false, error: "Invalid TradeSha." }, 400);
      }
    }

    const payload = JSON.parse(await aesDecrypt(tradeInfo, credentials.hashKey, credentials.hashIV));
    const result = payload.Result ?? payload;
    const merchantOrderNo = result.MerchantOrderNo;
    const tradeStatus = payload.Status ?? params.get("Status") ?? result.Status;

    if (!merchantOrderNo) {
      return jsonResponse({ success: false, error: "Missing MerchantOrderNo." }, 400);
    }

    const supabase = createServiceClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, subtotal_amount, points_discount, merchant_order_no, newebpay_status")
      .eq("merchant_order_no", merchantOrderNo)
      .maybeSingle();

    if (orderError) {
      return jsonResponse({ success: false, error: orderError.message }, 500);
    }

    if (!order) {
      return jsonResponse({ success: false, error: "Order not found." }, 404);
    }

    if (tradeStatus === "SUCCESS") {
      if (order.newebpay_status === "success") {
        return okResponse();
      }

      await supabase
        .from("orders")
        .update({
          status: "processing",
          payment_status: "paid",
          newebpay_status: "success",
          newebpay_trade_no: result.TradeNo ?? null,
          newebpay_auth_code: result.AuthCode ?? null,
          newebpay_card_no: result.CardNo ?? null,
          newebpay_respond_code: result.RespondCode ?? null,
          newebpay_payment_type: result.PaymentType ?? null,
          newebpay_paid_at: parseNewebPayDate(result.PayTime ?? result.AuthTime),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      await supabase
        .from("purchase_records")
        .update({ status: "completed" })
        .eq("order_id", order.id);

      const earnedPoints = Math.floor(Number(order.total_amount || 0) / 100) * 5;
      if (earnedPoints > 0) {
        await supabase.from("points").insert({
          user_id: order.user_id,
          amount: earnedPoints,
          transaction_type: "earn",
          reference_id: order.id,
          source_type: "order",
          source_id: order.id,
          description: "Shop purchase points reward",
        });
      }

      const [profileRes, itemsRes] = await Promise.all([
        supabase.from("tbl_mn5wgzh0").select("display_name").eq("user_id", order.user_id).maybeSingle(),
        supabase.from("purchase_records").select("quantity,unit_price,products(name)").eq("order_id", order.id),
      ]);

      const authUser = await supabase.auth.admin.getUserById(order.user_id);
      const displayName = String(profileRes.data?.display_name || authUser.data.user?.email || "");
      const email = authUser.data.user?.email || "";
      const items = (itemsRes.data || []).map((item: any) => ({
        name: String(item.products?.name || ""),
        quantity: Number(item.quantity || 0),
        price: Number(item.unit_price || 0),
      }));

      if (email) {
        await sendOrderEmail(email, displayName, items, Number(order.total_amount || 0));
      }

      return okResponse();
    }

    if (order.newebpay_status === "failed") {
      return okResponse();
    }

    await supabase
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "unpaid",
        newebpay_status: "failed",
        newebpay_trade_no: result.TradeNo ?? null,
        newebpay_auth_code: result.AuthCode ?? null,
        newebpay_card_no: result.CardNo ?? null,
        newebpay_respond_code: result.RespondCode ?? null,
        newebpay_payment_type: result.PaymentType ?? null,
        newebpay_paid_at: parseNewebPayDate(result.PayTime ?? result.AuthTime),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    await supabase
      .from("purchase_records")
      .update({ status: "cancelled" })
      .eq("order_id", order.id);

    if (Number(order.points_discount || 0) > 0) {
      await supabase.from("points").insert({
        user_id: order.user_id,
        amount: Number(order.points_discount || 0),
        transaction_type: "earn",
        reference_id: order.id,
        source_type: "order",
        source_id: order.id,
        description: "NewebPay payment failed refund",
      });
    }

    return okResponse();
  } catch (error) {
    console.error("[newebpay-mpg-webhook] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Webhook processing failed.",
    }, 500);
  }
});
