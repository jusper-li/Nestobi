CREATE OR REPLACE FUNCTION public.backfill_ai_support_document_embeddings(batch_size integer DEFAULT 24)
RETURNS TABLE(processed integer, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  openai_key text;
  v_embedding_model text := 'text-embedding-3-small';
  document_record record;
  embedding_response jsonb;
  embedding_values text;
  processed_count integer := 0;
  safe_batch_size integer := greatest(1, least(coalesce(batch_size, 24), 96));
BEGIN
  SELECT secrets.value
  INTO openai_key
  FROM public.app_secrets AS secrets
  WHERE secrets.key = 'OPENAI_API_KEY'
  LIMIT 1;

  SELECT coalesce(nullif(trim(secrets.value), ''), v_embedding_model)
  INTO v_embedding_model
  FROM public.app_secrets AS secrets
  WHERE secrets.key = 'OPENAI_EMBEDDING_MODEL'
  LIMIT 1;

  IF openai_key IS NULL OR length(openai_key) = 0 THEN
    RAISE EXCEPTION 'OPENAI_API_KEY is not configured';
  END IF;

  PERFORM public.refresh_ai_support_documents();

  FOR document_record IN
    SELECT id, content
    FROM public.ai_support_documents
    WHERE is_active = true
      AND embedding IS NULL
    ORDER BY updated_at DESC
    LIMIT safe_batch_size
  LOOP
    SELECT content::jsonb
    INTO embedding_response
    FROM extensions.http((
      'POST',
      'https://api.openai.com/v1/embeddings',
      ARRAY[
        extensions.http_header('Authorization', 'Bearer ' || openai_key),
        extensions.http_header('Content-Type', 'application/json')
      ],
      'application/json',
      jsonb_build_object(
        'model', v_embedding_model,
        'input', left(document_record.content, 12000)
      )::text
    )::extensions.http_request);

    embedding_values := embedding_response #>> '{data,0,embedding}';

    IF embedding_values IS NOT NULL THEN
      UPDATE public.ai_support_documents
      SET
        embedding = embedding_values::extensions.vector,
        embedding_model = v_embedding_model,
        embedded_at = now()
      WHERE id = document_record.id;

      processed_count := processed_count + 1;
    END IF;
  END LOOP;

  SELECT count(*)
  INTO remaining
  FROM public.ai_support_documents
  WHERE is_active = true
    AND embedding IS NULL;

  processed := processed_count;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_ai_support_document_embeddings(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_ai_support_document_embeddings(integer) TO service_role;
