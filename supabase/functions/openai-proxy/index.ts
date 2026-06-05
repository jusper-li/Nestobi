import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const secretCache = new Map<string, string>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

async function chatCompletion(options: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: "json_object" };
}) {
  const apiKey = await getSecret("OPENAI_API_KEY");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "gpt-4o-mini",
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1200,
      messages: options.messages,
      response_format: options.response_format,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "OpenAI request failed");
  return data.choices?.[0]?.message?.content ?? "";
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("AI returned invalid JSON");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "translate") {
      const result = await chatCompletion({
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content:
              `Translate from ${body.sourceLang || "auto"} to ${body.targetLang || "zh-TW"}. Return only the translated text.`,
          },
          { role: "user", content: String(body.text || "") },
        ],
      });
      return json({ result });
    }

    if (action === "chat") {
      const incoming = Array.isArray(body.messages) ? body.messages : [];
      const isZhTW = !body.language || body.language === "zh-TW";
      const system = isZhTW
        ? "你是 Nestobi 旅遊平台的 AI 客服助理。請用繁體中文清楚回答，協助使用者處理訂房、購物、點數、會員與行程規劃問題。若需要人工處理，請明確告知下一步。"
        : "You are the AI customer service assistant for Nestobi, a travel platform. Answer clearly and helpfully.";
      const result = await chatCompletion({
        temperature: 0.6,
        max_tokens: 800,
        messages: [
          { role: "system", content: system },
          ...incoming
            .filter((m: { role?: string; content?: string }) => m.role === "user" || m.role === "assistant")
            .map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: String(m.content || "") })),
        ],
      });
      return json({ result });
    }

    if (action === "itinerary") {
      const resultText = await chatCompletion({
        model: "gpt-4o",
        temperature: 0.65,
        max_tokens: 4500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              [
                "You are a senior travel planner for Nestobi.",
                "Build practical, place-aware, time-aware itineraries. Avoid generic filler.",
                "Use the requested language only.",
                "Every activity must include a real-feeling title, a concise reason why it fits, and enough detail to be useful.",
                "Respect budget, group size, trip length, interests, and pacing. Include meals, transit/pacing notes, and booking tips.",
                'Return valid JSON only with this shape: {"intro":"string","days":[{"day":1,"date":"string","theme":"string","activities":[{"time":"09:00","title":"string","description":"string"}],"dining":"string","tip":"string"}]}.',
              ].join("\n"),
          },
          {
            role: "user",
            content:
              [
                `Destination: ${body.destination || "unspecified"}`,
                `Trip length: ${body.days || 1} day(s)`,
                `Start date: ${body.startDate || "flexible"}`,
                `End date: ${body.endDate || "flexible"}`,
                `Group size: ${body.groupSize || 2}`,
                `Budget: ${body.budget || "standard"}`,
                `Interests: ${(body.interests || []).join(", ") || "general sightseeing"}`,
                `Language: ${body.language || "zh-TW"}`,
                "Make the plan immediately usable, not a placeholder template.",
              ].join("\n"),
          },
        ],
      });
      return json({ result: parseJson(resultText) });
    }

    if (action === "room-search") {
      const resultText = await chatCompletion({
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Analyze a room search query. Return JSON: {"room_types":[],"min_capacity":null,"max_capacity":null,"max_price":null,"amenity_keywords":[],"location_keywords":[],"name_keywords":[],"summary":"搜尋條件摘要"}. Room types: single,double,suite,deluxe,family,villa.',
          },
          { role: "user", content: String(body.query || "") },
        ],
      });
      return json({ result: parseJson(resultText) });
    }

    if (action === "product-search") {
      const resultText = await chatCompletion({
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Analyze a shop search query. Return JSON: {"category_slugs":[],"max_price":null,"origin_keywords":[],"flavor_keywords":[],"processing_keywords":[],"roast_keywords":[],"name_keywords":[],"summary":"搜尋條件摘要"}. Category slugs include coffee-beans, local-food, travel-accessories, souvenirs, outdoor-gear, cultural-art.',
          },
          { role: "user", content: String(body.query || "") },
        ],
      });
      return json({ result: parseJson(resultText) });
    }

    if (action === "blog-search") {
      const resultText = await chatCompletion({
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Analyze a coffee/travel blog search query. Return JSON: {"categories":[],"keywords":[],"summary":"搜尋條件摘要"}. Use concise Traditional Chinese keywords.',
          },
          { role: "user", content: String(body.query || "") },
        ],
      });
      return json({ result: parseJson(resultText) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
