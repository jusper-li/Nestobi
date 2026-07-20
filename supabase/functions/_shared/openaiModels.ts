const fallbackChatModel = "gpt-4o-mini";
const fallbackAdvancedModel = "gpt-4o";
const fallbackEmbeddingModel = "text-embedding-3-small";

const env = (name: string) => Deno.env.get(name)?.trim() || "";

export const openAIModels = {
  chat: () => env("OPENAI_CHAT_MODEL") || fallbackChatModel,
  translation: () => env("OPENAI_TRANSLATION_MODEL") || env("OPENAI_CHAT_MODEL") || fallbackChatModel,
  search: () => env("OPENAI_SEARCH_MODEL") || env("OPENAI_CHAT_MODEL") || fallbackChatModel,
  extraction: () => env("OPENAI_EXTRACTION_MODEL") || env("OPENAI_ADVANCED_MODEL") || fallbackAdvancedModel,
  vision: () => env("OPENAI_VISION_MODEL") || env("OPENAI_ADVANCED_MODEL") || fallbackAdvancedModel,
  pageBuilder: () => env("OPENAI_PAGE_BUILDER_MODEL") || env("OPENAI_CHAT_MODEL") || fallbackChatModel,
  embedding: () => env("OPENAI_EMBEDDING_MODEL") || fallbackEmbeddingModel,
};
