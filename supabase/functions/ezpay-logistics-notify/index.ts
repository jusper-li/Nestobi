import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createServiceClient, handleEzpayLogisticsNotify, parseResponseBody } from "../_shared/ezpay-logistics.ts";

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

async function readPayload(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await req.json()) as Record<string, unknown>;
  }

  const text = await req.text();
  const parsed = parseResponseBody(text);
  return (parsed && typeof parsed === "object" ? parsed : { raw: text }) as Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const payload = await readPayload(req);
    const supabase = await createServiceClient();
    const result = await handleEzpayLogisticsNotify(supabase, payload);

    return jsonResponse({
      success: result.success,
      targetOrderId: result.targetOrderId ?? null,
      status: result.status ?? null,
      error: result.error ?? null,
    });
  } catch (error) {
    console.error("[ezpay-logistics-notify] Error:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Logistics notify failed.",
    }, 500);
  }
});
