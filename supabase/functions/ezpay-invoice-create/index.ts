import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createEzpayInvoiceForOrder } from "../_shared/ezpay-invoice.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return jsonResponse({ success: false, error: "Missing order_id." }, 400);
    }

    const supabase = createServiceClient();
    const result = await createEzpayInvoiceForOrder(supabase, order_id);

    return jsonResponse({
      success: result.success,
      invoiceStatus: result.invoiceStatus,
      invoiceNumber: result.invoiceNumber ?? null,
      invoiceRandomNumber: result.invoiceRandomNumber ?? null,
      invoiceDate: result.invoiceDate ?? null,
      existing: result.existing ?? false,
      error: result.error ?? null,
    });
  } catch (error) {
    console.error("[ezpay-invoice-create] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Invoice creation failed.",
    }, 500);
  }
});
