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

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const checkInRaw = body?.checkIn ?? body?.check_in;
    const checkOutRaw = body?.checkOut ?? body?.check_out;
    const guests = Math.max(1, Math.min(30, Number(body?.guests || 1)));
    const checkIn = parseDate(checkInRaw);
    const checkOut = parseDate(checkOutRaw);

    if (!checkIn || !checkOut) {
      return jsonResponse({ error: "入住與退房日期格式需為 YYYY-MM-DD。" }, 400);
    }
    if (checkOut <= checkIn) {
      return jsonResponse({ error: "退房日期必須晚於入住日期。" }, 400);
    }

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
    if (nights > 60) {
      return jsonResponse({ error: "一次最多查詢 60 晚。" }, 400);
    }

    const supabase = createServiceClient();
    const { data: rooms, error: roomsError } = await supabase
      .from("tbl_rooms")
      .select("id")
      .eq("is_available", true)
      .gte("capacity", guests);
    if (roomsError) throw roomsError;

    const candidateIds = new Set((rooms || []).map((room) => String(room.id)));
    if (candidateIds.size === 0) {
      return jsonResponse({ availableRoomIds: [], total: 0 });
    }

    const { data: overlaps, error: overlapError } = await supabase
      .from("tbl_bookings")
      .select("room_id")
      .lt("check_in_date", String(checkOutRaw))
      .gt("check_out_date", String(checkInRaw))
      .in("status", ["pending", "confirmed"]);
    if (overlapError) throw overlapError;

    for (const booking of overlaps || []) {
      if (booking.room_id) candidateIds.delete(String(booking.room_id));
    }

    const availableRoomIds = Array.from(candidateIds);
    return jsonResponse({ availableRoomIds, total: availableRoomIds.length });
  } catch (error) {
    console.error("[room-availability-search] Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Availability search failed." }, 500);
  }
});
