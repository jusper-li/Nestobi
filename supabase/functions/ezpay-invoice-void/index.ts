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

function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function trimText(value: unknown) {
  return String(value ?? "").trim();
}

async function sha256Hex(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function pkcs7Pad(input: Uint8Array, blockSize = 16) {
  const remainder = input.length % blockSize;
  const paddingSize = remainder === 0 ? blockSize : blockSize - remainder;
  const padded = new Uint8Array(input.length + paddingSize);
  padded.set(input, 0);
  padded.fill(paddingSize, input.length);
  return padded;
}

async function aes256CbcEncryptToHex(text: string, key: string, iv: string) {
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
    pkcs7Pad(encoder.encode(text)),
  );
  return Array.from(new Uint8Array(encrypted))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseResponseBody(text: string) {
  const parsed = safeJsonParse(text);
  if (parsed) return parsed;
  const params = new URLSearchParams(text);
  if ([...params.keys()].length > 0) return Object.fromEntries(params.entries());
  return { raw: text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const merchantId = trimText(Deno.env.get("EZPAY_INVOICE_MERCHANT_ID"));
    const hashKey = trimText(Deno.env.get("EZPAY_INVOICE_HASH_KEY"));
    const hashIV = trimText(Deno.env.get("EZPAY_INVOICE_HASH_IV"));
    const env = (Deno.env.get("EZPAY_INVOICE_ENV") || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
    const endpoint = env === "production"
      ? "https://inv.ezpay.com.tw/Api/invoice_invalid"
      : "https://cinv.ezpay.com.tw/Api/invoice_invalid";

    if (!merchantId || !hashKey || !hashIV) {
      return jsonResponse({ success: false, error: "ezPay invoice credentials are not configured." }, 500);
    }

    const { order_id, reason } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return jsonResponse({ success: false, error: "Missing order_id." }, 400);
    }

    const supabase = createServiceClient();
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle();

    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500);
    }
    if (!invoice || !invoice.invoice_number) {
      return jsonResponse({ success: false, error: "Issued invoice not found." }, 404);
    }

    const postData = {
      RespondType: "JSON",
      Version: "1.4",
      TimeStamp: String(Math.floor(Date.now() / 1000)),
      MerchantOrderNo: String(invoice.ezpay_raw_request?.postData?.MerchantOrderNo || ""),
      InvoiceNumber: String(invoice.invoice_number),
      Reason: trimText(reason) || "Cancel invoice",
    };

    const encryptedPostData = await aes256CbcEncryptToHex(new URLSearchParams(postData).toString(), hashKey, hashIV);
    const body = new URLSearchParams({
      MerchantID_: merchantId,
      PostData_: encryptedPostData,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const rawText = await response.text();
    const parsed = parseResponseBody(rawText) as Record<string, unknown>;
    const status = trimText(parsed.Status || parsed.status).toUpperCase();

    await supabase
      .from("invoices")
      .update({
        invoice_status: status === "SUCCESS" ? "cancelled" : "failed",
        ezpay_raw_response: parsed,
        error_message: status === "SUCCESS" ? null : (trimText(parsed.Message || parsed.message) || rawText || "Invoice void failed."),
      })
      .eq("order_id", order_id);

    return jsonResponse({
      success: status === "SUCCESS",
      status: parsed.Status || parsed.status || null,
      message: parsed.Message || parsed.message || null,
      result: parsed.Result || parsed.result || null,
      raw: parsed,
    }, status === "SUCCESS" ? 200 : 400);
  } catch (error) {
    console.error("[ezpay-invoice-void] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Invoice void failed.",
    }, 500);
  }
});
