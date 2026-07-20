# OpenAI 模型設定

Nestobi 的 OpenAI 呼叫集中由 Supabase Edge Function 環境變數控制，避免模型名稱散落在程式碼中。

## Supabase Edge Function Secrets

- `OPENAI_CHAT_MODEL`: 一般聊天、客服與通用文字任務。
- `OPENAI_TRANSLATION_MODEL`: 翻譯任務。
- `OPENAI_SEARCH_MODEL`: AI 搜尋與推薦。
- `OPENAI_ADVANCED_MODEL`: 進階文字推理與結構化輸出預設模型。
- `OPENAI_EXTRACTION_MODEL`: 商品、房型、文章等資料擷取。
- `OPENAI_VISION_MODEL`: 圖片辨識與圖片上架解析。
- `OPENAI_PAGE_BUILDER_MODEL`: 商品頁文案與版面產生。
- `OPENAI_EMBEDDING_MODEL`: 向量 embedding。

## 目前生產設定

- 一般、翻譯、搜尋、商品頁產生：`gpt-4o-mini`
- 進階擷取、圖片解析：`gpt-4o`
- 向量 embedding：`text-embedding-3-small`

## 更新原則

1. 先確認 OpenAI 官方模型文件與目前專案權限。
2. 優先改 Supabase secrets，不直接改前端或多支 Function。
3. 若新模型需要不同 API 格式，先改 shared model/config 與對應 Function，再部署測試。
4. 不要讓前端直接呼叫 OpenAI API，也不要在前端暴露 `OPENAI_API_KEY`。
