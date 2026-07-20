import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { openAIModels } from "../_shared/openaiModels.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || !query.trim()) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!openaiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is not configured",
          results: [],
          suggestion: "AI 搜尋尚未完成設定，請先在 Supabase Edge Function Secrets 加入 OPENAI_API_KEY。",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug, summary, price, sale_price, stock, images, category_id")
      .eq("is_active", true)
      .limit(100);

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ results: [], suggestion: "" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productList = products.map((p: any, i: number) =>
      `${i}. ID:${p.id} | ${p.name} | ${p.summary || ""}`
    ).join("\n");

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAIModels.search(),
        messages: [
          {
            role: "system",
            content: `你是精品咖啡電商的搜尋助理。根據顧客的搜尋詞，從產品列表中找出最相關的商品。
回傳 JSON 格式：{ "ids": ["id1", "id2", ...], "suggestion": "一句話給顧客的搜尋建議或提示" }
最多回傳 12 個 id，按相關度排序，不相關的不要回傳。`,
          },
          {
            role: "user",
            content: `搜尋詞：「${query}」\n\n商品列表：\n${productList}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      throw new Error(`OpenAI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);
    const ids: string[] = parsed.ids || [];
    const suggestion: string = parsed.suggestion || "";

    const idToProduct: Record<string, any> = {};
    for (const p of products) {
      idToProduct[p.id] = p;
    }

    const results = ids
      .filter((id) => idToProduct[id])
      .map((id) => idToProduct[id]);

    return new Response(
      JSON.stringify({ results, suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: "Search failed", results: [], suggestion: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
