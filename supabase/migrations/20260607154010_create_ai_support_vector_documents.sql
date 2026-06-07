CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.ai_support_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('room', 'product', 'article', 'store', 'faq')),
  source_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  url_path text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL DEFAULT '',
  embedding extensions.vector(1536),
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  embedded_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_support_documents_source
  ON public.ai_support_documents (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_ai_support_documents_active
  ON public.ai_support_documents (is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_support_documents_embedding_hnsw
  ON public.ai_support_documents
  USING hnsw (embedding extensions.vector_cosine_ops)
  WHERE embedding IS NOT NULL AND is_active = true;

ALTER TABLE public.ai_support_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_support_documents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_support_documents TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_ai_support_documents()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  changed_count integer := 0;
BEGIN
  WITH source_documents AS (
    SELECT
      'faq'::text AS source_type,
      faqs.id::text AS source_id,
      faqs.question AS title,
      concat_ws(E'\n',
        '類型: FAQ',
        '分類: ' || coalesce(faqs.category, ''),
        '問題: ' || coalesce(faqs.question, ''),
        '回答: ' || coalesce(faqs.answer, ''),
        '站內連結: /faq'
      ) AS content,
      '/faq'::text AS url_path,
      jsonb_build_object('category', faqs.category) AS metadata
    FROM public.faqs
    WHERE faqs.is_published = true

    UNION ALL

    SELECT
      'room'::text AS source_type,
      tbl_rooms.id::text AS source_id,
      tbl_rooms.name AS title,
      concat_ws(E'\n',
        '類型: 住宿',
        '名稱: ' || coalesce(tbl_rooms.name, ''),
        '房型: ' || coalesce(tbl_rooms.room_type, ''),
        '可住人數: ' || coalesce(tbl_rooms.capacity::text, ''),
        '每晚價格: ' || coalesce(tbl_rooms.price_per_night::text, ''),
        '地點: ' || coalesce(tbl_rooms.location, ''),
        '設施: ' || coalesce(tbl_rooms.amenities::text, ''),
        '說明: ' || regexp_replace(coalesce(tbl_rooms.description, ''), '<[^>]+>', ' ', 'g'),
        '房型連結: /rooms/' || tbl_rooms.id::text,
        '訂房連結: /booking/' || tbl_rooms.id::text
      ) AS content,
      '/rooms/' || tbl_rooms.id::text AS url_path,
      jsonb_build_object(
        'booking_url', '/booking/' || tbl_rooms.id::text,
        'room_type', tbl_rooms.room_type,
        'capacity', tbl_rooms.capacity,
        'price_per_night', tbl_rooms.price_per_night,
        'location', tbl_rooms.location
      ) AS metadata
    FROM public.tbl_rooms
    WHERE tbl_rooms.is_available = true

    UNION ALL

    SELECT
      'product'::text AS source_type,
      products.id::text AS source_id,
      products.name AS title,
      concat_ws(E'\n',
        '類型: 商品',
        '名稱: ' || coalesce(products.name, ''),
        '價格: ' || coalesce(products.price::text, ''),
        '庫存: ' || coalesce(products.stock_quantity::text, ''),
        'SKU: ' || coalesce(products.sku, ''),
        '說明: ' || regexp_replace(coalesce(products.description, ''), '<[^>]+>', ' ', 'g'),
        '商品連結: /shop/' || products.id::text
      ) AS content,
      '/shop/' || products.id::text AS url_path,
      jsonb_build_object(
        'price', products.price,
        'stock_quantity', products.stock_quantity,
        'sku', products.sku
      ) AS metadata
    FROM public.products
    WHERE products.is_active = true

    UNION ALL

    SELECT
      'article'::text AS source_type,
      blog_posts.id::text AS source_id,
      blog_posts.title AS title,
      concat_ws(E'\n',
        '類型: 文章',
        '標題: ' || coalesce(blog_posts.title, ''),
        '分類: ' || coalesce(blog_posts.category, ''),
        '標籤: ' || coalesce(blog_posts.tags::text, ''),
        '摘要: ' || coalesce(blog_posts.excerpt, ''),
        '內容: ' || regexp_replace(coalesce(blog_posts.content, ''), '<[^>]+>', ' ', 'g'),
        '文章連結: /blog/' || blog_posts.slug
      ) AS content,
      '/blog/' || blog_posts.slug AS url_path,
      jsonb_build_object(
        'slug', blog_posts.slug,
        'category', blog_posts.category,
        'tags', blog_posts.tags,
        'published_at', blog_posts.published_at
      ) AS metadata
    FROM public.blog_posts
    WHERE blog_posts.status = 'published'

    UNION ALL

    SELECT
      'store'::text AS source_type,
      store_locations.id::text AS source_id,
      store_locations.name AS title,
      concat_ws(E'\n',
        '類型: 門市',
        '名稱: ' || coalesce(store_locations.name, ''),
        '英文名稱: ' || coalesce(store_locations.name_en, ''),
        '城市: ' || coalesce(store_locations.city, ''),
        '區域: ' || coalesce(store_locations.district, ''),
        '地址: ' || coalesce(store_locations.address, ''),
        '電話: ' || coalesce(store_locations.phone, ''),
        '營業時間: ' || coalesce(store_locations.hours::text, ''),
        '站內連結: /stores'
      ) AS content,
      '/stores'::text AS url_path,
      jsonb_build_object(
        'slug', store_locations.slug,
        'city', store_locations.city,
        'district', store_locations.district,
        'address', store_locations.address,
        'phone', store_locations.phone,
        'map_url', store_locations.map_url
      ) AS metadata
    FROM public.store_locations
    WHERE store_locations.is_active = true
  ),
  upserted AS (
    INSERT INTO public.ai_support_documents (
      source_type, source_id, title, content, url_path, metadata, content_hash, is_active, updated_at
    )
    SELECT
      source_type,
      source_id,
      title,
      content,
      url_path,
      metadata,
      md5(content),
      true,
      now()
    FROM source_documents
    ON CONFLICT (source_type, source_id) DO UPDATE
    SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      url_path = EXCLUDED.url_path,
      metadata = EXCLUDED.metadata,
      content_hash = EXCLUDED.content_hash,
      is_active = true,
      embedding = CASE
        WHEN public.ai_support_documents.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL
        ELSE public.ai_support_documents.embedding
      END,
      embedded_at = CASE
        WHEN public.ai_support_documents.content_hash IS DISTINCT FROM EXCLUDED.content_hash THEN NULL
        ELSE public.ai_support_documents.embedded_at
      END,
      updated_at = now()
    WHERE
      public.ai_support_documents.title IS DISTINCT FROM EXCLUDED.title
      OR public.ai_support_documents.content IS DISTINCT FROM EXCLUDED.content
      OR public.ai_support_documents.url_path IS DISTINCT FROM EXCLUDED.url_path
      OR public.ai_support_documents.metadata IS DISTINCT FROM EXCLUDED.metadata
      OR public.ai_support_documents.is_active IS DISTINCT FROM true
    RETURNING id
  ),
  deactivated AS (
    UPDATE public.ai_support_documents AS documents
    SET is_active = false, updated_at = now()
    WHERE documents.source_type IN ('faq', 'room', 'product', 'article', 'store')
      AND documents.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM source_documents
        WHERE source_documents.source_type = documents.source_type
          AND source_documents.source_id = documents.source_id
      )
    RETURNING id
  )
  SELECT count(*) INTO changed_count
  FROM (
    SELECT id FROM upserted
    UNION ALL
    SELECT id FROM deactivated
  ) AS changed;

  RETURN changed_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_ai_support_document_embedding(
  document_id uuid,
  doc_embedding text,
  model_name text DEFAULT 'text-embedding-3-small'
)
RETURNS void
LANGUAGE sql
SET search_path = public, extensions
AS $$
  UPDATE public.ai_support_documents
  SET
    embedding = doc_embedding::extensions.vector,
    embedding_model = model_name,
    embedded_at = now(),
    updated_at = now()
  WHERE id = document_id;
$$;

CREATE OR REPLACE FUNCTION public.match_ai_support_documents(
  query_embedding text,
  match_count integer DEFAULT 12,
  min_similarity double precision DEFAULT 0.18
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id text,
  title text,
  content text,
  url_path text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT
    documents.id,
    documents.source_type,
    documents.source_id,
    documents.title,
    documents.content,
    documents.url_path,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding::extensions.vector) AS similarity
  FROM public.ai_support_documents AS documents
  WHERE documents.is_active = true
    AND documents.embedding IS NOT NULL
    AND 1 - (documents.embedding <=> query_embedding::extensions.vector) >= min_similarity
  ORDER BY documents.embedding <=> query_embedding::extensions.vector
  LIMIT greatest(1, least(match_count, 30));
$$;

REVOKE ALL ON FUNCTION public.refresh_ai_support_documents() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_ai_support_document_embedding(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_ai_support_documents(text, integer, double precision) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_ai_support_documents() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_ai_support_document_embedding(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_ai_support_documents(text, integer, double precision) TO service_role;
