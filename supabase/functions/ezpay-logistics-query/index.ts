import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertAdmin, queryEzpayLogisticsForOrder } from "../_shared/ezpay-logistics.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const { adminClient } = await assertAdmin(req);
    const body = await req.json();
    const orderId = String(body?.order_id ?? body?.orderId ?? "").trim();

    if (!orderId) {
      return jsonResponse({ success: false, error: "Missing order_id." }, 400);
    }

    const result = await queryEzpayLogisticsForOrder(adminClient, orderId);
    return jsonResponse({
      success: result.success,
      logisticsStatus: result.logisticsStatus,
      logisticsNo: result.logisticsNo ?? null,
      storePrintNo: result.storePrintNo ?? null,
      error: result.error ?? null,
    });
  } catch (error) {
    console.error("[ezpay-logistics-query] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Logistics query failed.",
    }, 500);
  }
});
