import { createClient } from "npm:@supabase/supabase-js@2";

type Lang = "zh-TW" | "en" | "ja" | "ko";

const normalizeLang = (raw: string | null | undefined): Lang => {
  const v = String(raw || "").trim().toLowerCase();
  if (v.startsWith("en")) return "en";
  if (v.startsWith("ja") || v.startsWith("jp")) return "ja";
  if (v.startsWith("ko") || v.startsWith("kr")) return "ko";
  return "zh-TW";
};

const pickByLang = (lang: string | null | undefined, zh: string, en: string, ja: string, ko: string): string => {
  const n = normalizeLang(lang);
  if (n === "en") return en;
  if (n === "ja") return ja;
  if (n === "ko") return ko;
  return zh;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TranslateRequest {
  key: string;
  targetLanguage: string;
  sourceText?: string;
  preserveHtml?: boolean;
}

type GoogleTranslateResponse = [
  [
    [string, string, unknown, unknown, number][] | [],
    string,
    unknown,
    unknown,
  ],
  string,
  unknown,
];

const translateWithGoogle = async (
  sourceText: string,
  targetLanguage: Lang,
  preserveHtml = false,
) => {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: targetLanguage,
    dt: "t",
    q: sourceText,
    format: preserveHtml ? "html" : "text",
  });

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  if (!response.ok) return sourceText;

  const data = (await response.json()) as GoogleTranslateResponse;
  const translatedSegments = Array.isArray(data?.[0]) ? data[0] : [];
  const translatedText = translatedSegments
    .map((segment) => segment?.[0] || "")
    .join("")
    .trim();
  return translatedText || sourceText;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { key, targetLanguage, sourceText, preserveHtml }: TranslateRequest = await req.json();
    const normalizedTargetLanguage = normalizeLang(targetLanguage);

    const { data: existing, error: fetchError } = await supabase
      .from("translations")
      .select("value")
      .eq("language_code", normalizedTargetLanguage)
      .eq("key", key)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (existing) {
      return new Response(
          JSON.stringify({ translation: existing.value, cached: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!sourceText) {
      return new Response(
        JSON.stringify({
          error: "Translation not found and no source text provided",
          translation: key
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let translatedText = await translateWithGoogle(sourceText, normalizedTargetLanguage, preserveHtml);

    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();

    const shouldTryOpenAI =
      openaiKey &&
      (!translatedText || translatedText === sourceText);

    if (shouldTryOpenAI) {
      const targetLanguageName = pickByLang(
        normalizedTargetLanguage,
        "Traditional Chinese",
        "English",
        "Japanese",
        "Korean",
      );

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: preserveHtml
                ? `You are a professional translator. Translate the visible text to ${targetLanguageName}. Keep all HTML tags, attributes, and structure unchanged. Only return the translated HTML, nothing else.`
                : `You are a professional translator. Translate the given text to ${targetLanguageName}. Only return the translated text, nothing else.`,
            },
            {
              role: "user",
              content: sourceText,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (openaiResponse.ok) {
        const openaiData = await openaiResponse.json();
        const candidate = String(openaiData?.choices?.[0]?.message?.content || '').trim();
        if (candidate && candidate !== sourceText) {
          translatedText = candidate;
        }
      }
    }

    const { error: insertError } = await supabase
      .from("translations")
      .insert({
        language_code: normalizedTargetLanguage,
        key: key,
        value: translatedText,
      });

    if (insertError) {
      console.error("Failed to save translation:", insertError);
    }

    return new Response(
      JSON.stringify({ translation: translatedText, cached: false }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Translation failed" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
