import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type KnowledgeItem = {
  question?: string | null;
  answer?: string | null;
  keywords?: string[] | string | null;
};

type HistoryItem = {
  sender_type: "user" | "bot" | "admin";
  message: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sseResponse(reply: string, headers: Record<string, string> = {}) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: reply })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        ...headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    },
  );
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function findKnowledgeMatch(message: string, knowledge: KnowledgeItem[]) {
  const normalized = message.toLowerCase();

  for (const item of knowledge) {
    const keywords = Array.isArray(item.keywords)
      ? item.keywords
      : typeof item.keywords === "string"
        ? item.keywords.split(/[,，\s]+/).filter(Boolean)
        : [];

    const haystack = [item.question, ...keywords].filter(Boolean).join(" ").toLowerCase();
    if (haystack && haystack.split(/\s+/).some((token) => token && normalized.includes(token))) {
      return item.answer?.trim() || null;
    }
  }

  return null;
}

function fallbackReply(message: string, knowledge: KnowledgeItem[]) {
  const normalized = message.toLowerCase();
  const matchedAnswer = findKnowledgeMatch(message, knowledge);

  if (matchedAnswer) {
    return `${matchedAnswer}\n\n目前 AI 深度回覆正在維護中，我先用客服知識庫協助您；若需要專人協助，也可以到「聯絡我們」留下需求。`;
  }

  if (hasAny(normalized, ["配送", "運送", "出貨", "到貨", "shipping", "delivery"])) {
    return "我們一般會在付款完成後安排出貨，常見配送時間約 1-3 個工作天，實際時間會依物流與訂單內容調整。若是禮盒急件，建議先到「聯絡我們」留下需求，我們會協助確認。";
  }

  if (hasAny(normalized, ["禮盒", "送禮", "gift", "推薦", "父親", "母親", "企業"])) {
    return "如果是送禮，我會建議先看「禮盒商城」中的冠軍精品咖啡、濾掛禮盒與聯名系列。想要穩重質感可選冠軍精品；想要方便沖煮可選濾掛；企業大量送禮可透過「聯絡我們」洽詢。";
  }

  if (hasAny(normalized, ["付款", "刷卡", "轉帳", "payment", "發票"])) {
    return "目前網站結帳流程會依頁面顯示的付款方式完成訂單。若您有轉帳、發票或企業採購需求，請在訂單備註或「聯絡我們」留下資訊，我們會再協助確認。";
  }

  if (hasAny(normalized, ["退貨", "退款", "換貨", "return", "refund"])) {
    return "咖啡與食品類商品會依保存狀態與包裝完整性處理退換貨。若商品有破損、錯寄或其他異常，請保留照片並透過「聯絡我們」提供訂單資訊。";
  }

  return "您好，我是 Sonpin 的 AI 客服助理。現在深度 AI 回覆正在維護中，我仍可以先協助您查詢送禮、配送、付款與商品推薦。您也可以直接前往「禮盒商城」瀏覽商品，或到「聯絡我們」留下需求。";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const { message, session_id } = await req.json();

    if (!message || !session_id) {
      return jsonResponse({ error: "message and session_id are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();

    let knowledge: KnowledgeItem[] = [];
    let history: HistoryItem[] = [];

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const [{ data: kbData }, { data: historyData }] = await Promise.all([
        supabase
          .from("knowledge_base")
          .select("question, answer, keywords")
          .eq("is_active", true)
          .order("priority", { ascending: false })
          .limit(60),
        supabase
          .from("chat_messages")
          .select("sender_type, message")
          .eq("session_id", session_id)
          .order("created_at", { ascending: true })
          .limit(12),
      ]);

      knowledge = (kbData || []) as KnowledgeItem[];
      history = (historyData || []) as HistoryItem[];
    }

    if (!openaiKey) {
      return sseResponse(fallbackReply(message, knowledge), {
        "X-AI-Mode": "fallback-missing-openai-key",
      });
    }

    const kbContext = knowledge.length
      ? knowledge.map((item) => `Q: ${item.question || ""}\nA: ${item.answer || ""}`).join("\n\n")
      : "目前沒有額外知識庫資料。";

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      {
        role: "system",
        content:
          "你是 Sonpin 的 AI 客服助理「小 M」。請使用繁體中文，以溫暖、簡潔、專業的語氣回答。優先協助商品推薦、禮盒選購、配送、付款、退換貨與品牌資訊。回答盡量在 150 字內；若不確定，請引導使用者前往聯絡我們。\n\n客服知識庫：\n" +
          kbContext,
      },
    ];

    for (const item of history) {
      messages.push({
        role: item.sender_type === "user" ? "user" : "assistant",
        content: item.message,
      });
    }

    messages.push({ role: "user", content: message });

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.6,
        max_tokens: 350,
        stream: true,
      }),
    });

    if (!openaiRes.ok || !openaiRes.body) {
      console.error("OpenAI chat request failed", openaiRes.status, await openaiRes.text());
      return sseResponse(fallbackReply(message, knowledge), {
        "X-AI-Mode": "fallback-openai-error",
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          const reader = openaiRes.body!.getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();

                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content ?? "";
                  if (delta) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                  }
                } catch {
                  // Ignore partial or non-JSON event chunks from the upstream stream.
                }
              }
            }
          } catch (error) {
            console.error("AI chat stream failed", error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: fallbackReply(message, knowledge) })}\n\n`),
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } finally {
            controller.close();
          }
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      },
    );
  } catch (error) {
    console.error("AI chat error:", error);
    return sseResponse("AI 客服暫時忙碌中，請稍後再試，或透過「聯絡我們」留下需求，我們會盡快協助您。", {
      "X-AI-Mode": "fallback-function-error",
    });
  }
});
