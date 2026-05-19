import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};
const secretCache = new Map<string, string>();

async function getSecret(name: string): Promise<string> {
  const envValue = Deno.env.get(name);
  if (envValue) return envValue;
  const cached = secretCache.get(name);
  if (cached) return cached;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error(`${name} is not configured`);

  const res = await fetch(
    `${supabaseUrl}/rest/v1/app_secrets?key=eq.${encodeURIComponent(name)}&select=value&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
  if (!res.ok) throw new Error(`${name} is not configured`);
  const rows = await res.json();
  const value = rows?.[0]?.value;
  if (!value) throw new Error(`${name} is not configured`);
  secretCache.set(name, value);
  return value;
}

/* ─── Command mode: free-text → structured data ─────────────────────────── */
const COMMAND_PROMPT = (text: string) => `
You are a data extraction assistant for Nestobi, a travel and hospitality platform.
Analyze the following text (which may be in Chinese or English) and:
1. Determine the intent: "product", "hotel", or "room"
2. Extract ALL relevant fields

Return ONLY a valid JSON object with this exact structure:

{
  "intent": "product" | "hotel" | "room",
  "confidence": 0.0-1.0,
  "data": {
    /* === PRODUCT FIELDS (when intent = "product") === */
    "name": "string — full product name",
    "description": "string — detailed description in Traditional Chinese",
    "price": 0,
    "stock_quantity": 0,
    "is_active": true,
    "sku": "string | null",
    "origin": "string | null — origin country/region",
    "roast_level": "string | null — e.g. 淺烘焙/中烘焙/中深焙/深烘焙",
    "processing_method": "string | null — e.g. 水洗/日曬/蜜處理",
    "altitude": "string | null — e.g. 1800-2000m",
    "variety": ["string array — coffee variety/cultivar names"],
    "flavor_notes": ["string array — tasting notes, each as a short phrase"],
    "weight_grams": null,
    "tags": ["string array — brand, country, region, category keywords"],
    "source_url": "string | null",
    "roast_date": "YYYY-MM-DD | null",
    "category_slug": "one of: coffee-beans / local-food / travel-accessories / souvenirs / outdoor-gear / cultural-art",

    /* === HOTEL FIELDS (when intent = "hotel") === */
    "name": "string — hotel/guesthouse name",
    "description": "string — detailed description in Traditional Chinese",
    "address": "string | null",
    "city": "string | null — city name",
    "phone": "string | null",
    "email": "string | null",
    "star_rating": 3,
    "line_id": "string | null",
    "facebook": "string | null — Facebook page URL",
    "checkin_time": "15:00",
    "checkout_time": "11:00",
    "deposit_amount": 0,
    "pet_friendly": false,
    "registration_number": "string | null",
    "image_url": "string | null",
    "is_active": true,

    /* === ROOM FIELDS (when intent = "room") === */
    "name": "string — room name",
    "description": "string — detailed description in Traditional Chinese",
    "room_type": "one of: single / double / suite / deluxe / family / villa",
    "capacity": 2,
    "min_capacity": 1,
    "price_per_night": 0,
    "weekend_price": 0,
    "floor": "string | null — e.g. 2F",
    "location": "string | null — city or address",
    "amenities": ["string array in Traditional Chinese — e.g. WiFi、停車場、早餐、獨立衛浴、冷氣、電視"],
    "images": [],
    "hotel_name": "string | null — name of the hotel this room belongs to",
    "is_available": true
  }
}

Rules:
- Output ONLY the JSON object, no markdown, no extra text
- For arrays, always return arrays (empty [] if none found)
- For Traditional Chinese text fields (description, amenities), write in Traditional Chinese
- For category_slug, make your best guess based on product type:
  * Coffee beans/drip bags → coffee-beans
  * Tea, food products → local-food
  * Bags, bottles, accessories → travel-accessories
  * Plush toys, souvenirs → souvenirs
  * Camping, outdoor gear → outdoor-gear
  * Art, ceramics, handcrafts → cultural-art
- For star_rating: guesthouse/B&B/民宿 = 3, boutique = 4, luxury = 5, hostel = 2
- If a field is not mentioned, use the default value shown above
- For hotel checkin/checkout use 24-hour format "HH:MM"
- For roast_date use "YYYY-MM-DD" format, null if not specified

Text to analyze:
${text}
`;

/* ─── Text prompts for legacy modes ─────────────────────────────────────── */
const ROOM_TEXT_PROMPT = (content: string) => `
You are a data extraction assistant. Extract room/accommodation listing information from the following content.
Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "name": "string",
  "description": "string",
  "room_type": "single"|"double"|"suite"|"deluxe"|"family"|"villa",
  "capacity": 2,
  "min_capacity": 1,
  "price_per_night": 0,
  "weekend_price": 0,
  "floor": "string",
  "location": "string",
  "image_url": null,
  "amenities": ["string"]
}
For price_per_night extract the numeric value in TWD (NT$). If USD, multiply by 30.
For amenities list key features like "WiFi", "停車場", "早餐", "冷氣", "獨立衛浴" etc.
Respond in Traditional Chinese where appropriate for text fields.

Content:
${content.slice(0, 6000)}
`;

const PRODUCT_TEXT_PROMPT = (content: string) => `
You are a data extraction assistant. Extract product listing information from the following content.
Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "name": "string",
  "description": "string",
  "price": 0,
  "stock_quantity": 1,
  "image_url": null,
  "sku": null,
  "origin": null,
  "roast_level": null,
  "processing_method": null,
  "flavor_notes": [],
  "tags": []
}
For price extract the numeric value in TWD (NT$). If USD, multiply by 30.
Respond in Traditional Chinese where appropriate for text fields.

Content:
${content.slice(0, 6000)}
`;

/* ─── Vision prompts ────────────────────────────────────────────────────── */
const ROOM_VISION_PROMPT = `
You are a data extraction assistant. Extract room/accommodation listing information from this image.
Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "name": "string",
  "description": "string",
  "room_type": "single"|"double"|"suite"|"deluxe"|"family"|"villa",
  "capacity": 2,
  "min_capacity": 1,
  "price_per_night": 0,
  "weekend_price": 0,
  "floor": "string",
  "location": "string",
  "image_url": null,
  "amenities": []
}
Respond in Traditional Chinese where appropriate.
`;

const PRODUCT_VISION_PROMPT = `
You are a data extraction assistant. Extract product listing information from this image.
Return ONLY a valid JSON object with these fields (use null for missing values):
{
  "name": "string",
  "description": "string",
  "price": 0,
  "stock_quantity": 1,
  "image_url": null,
  "sku": null,
  "origin": null,
  "roast_level": null,
  "flavor_notes": [],
  "tags": []
}
Respond in Traditional Chinese where appropriate.
`;

/* ─── OpenAI helpers ────────────────────────────────────────────────────── */
async function callOpenAIText(apiKey: string, prompt: string): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callOpenAIVision(
  apiKey: string,
  prompt: string,
  base64Image: string,
  mimeType: string,
): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "high",
            },
          },
        ],
      }],
      temperature: 0.2,
      response_format: { type: "json_object" },
      max_tokens: 1000,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

/* ─── Auth helper ───────────────────────────────────────────────────────── */
async function authenticate(req: Request, supabaseUrl: string, serviceRoleKey: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) return null;

  const { data: auth } = await createClient(supabaseUrl, serviceRoleKey)
    .from("tbl_user_auth")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const allowedRoles = ["vendor", "admin", "superadmin"];
  if (!auth || !allowedRoles.includes(auth.role)) return null;
  return { user, role: auth.role };
}

/* ─── Main handler ──────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openaiKey = await getSecret("OPENAI_API_KEY");

    const caller = await authenticate(req, supabaseUrl, serviceRoleKey, anonKey);
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { type, mode, content, mime_type, filename } = body;

    if (!mode || !content) {
      return json({ error: "mode, content 為必填" }, 400);
    }

    /* ── COMMAND mode ── */
    if (mode === "command") {
      const result = await callOpenAIText(openaiKey, COMMAND_PROMPT(content));
      return json({ result });
    }

    /* ── Legacy text / image / file modes ── */
    if (!type) return json({ error: "type 為必填" }, 400);
    if (type !== "room" && type !== "product") {
      return json({ error: "type 必須為 room 或 product" }, 400);
    }

    let result: any;

    if (mode === "image") {
      const prompt = type === "room" ? ROOM_VISION_PROMPT : PRODUCT_VISION_PROMPT;
      result = await callOpenAIVision(openaiKey, prompt, content, mime_type || "image/jpeg");
    } else if (mode === "file") {
      let textContent: string;
      try {
        const bytes = Uint8Array.from(atob(content), (c) => c.charCodeAt(0));
        textContent = new TextDecoder("utf-8").decode(bytes);
      } catch {
        return json({ error: "檔案解碼失敗，請確認檔案格式" }, 422);
      }
      const ext = (filename || "").split(".").pop()?.toLowerCase();
      if (ext === "json") {
        try { textContent = JSON.stringify(JSON.parse(textContent), null, 2); } catch { /* use as-is */ }
      }
      const prompt = type === "room" ? ROOM_TEXT_PROMPT(textContent) : PRODUCT_TEXT_PROMPT(textContent);
      result = await callOpenAIText(openaiKey, prompt);
    } else {
      // plain text
      const prompt = type === "room" ? ROOM_TEXT_PROMPT(content) : PRODUCT_TEXT_PROMPT(content);
      result = await callOpenAIText(openaiKey, prompt);
    }

    return json({ result });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
