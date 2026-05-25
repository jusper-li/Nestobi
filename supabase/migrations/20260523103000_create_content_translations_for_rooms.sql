/*
  # Content translations cache (rooms first)

  1. New table
    - `content_translations`
      - Generic cache for translated content fields
      - Uses source_hash to avoid stale/duplicate translations

  2. Security
    - Public read (for frontend rendering)
    - Public insert (for on-demand cache writes)
    - Super admin can update/delete for manual corrections
*/

CREATE TABLE IF NOT EXISTS content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field_key text NOT NULL,
  source_text text NOT NULL DEFAULT '',
  source_hash text NOT NULL,
  target_lang text NOT NULL,
  translated_text text NOT NULL DEFAULT '',
  is_manual boolean NOT NULL DEFAULT false,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, field_key, target_lang, source_hash)
);

CREATE INDEX IF NOT EXISTS idx_content_translations_lookup
  ON content_translations(entity_type, target_lang, entity_id);

CREATE INDEX IF NOT EXISTS idx_content_translations_updated_at
  ON content_translations(updated_at DESC);

ALTER TABLE content_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read content translations" ON content_translations;
CREATE POLICY "Public read content translations"
  ON content_translations
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public insert content translations" ON content_translations;
CREATE POLICY "Public insert content translations"
  ON content_translations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (entity_type = 'room');

DROP POLICY IF EXISTS "Superadmin update content translations" ON content_translations;
CREATE POLICY "Superadmin update content translations"
  ON content_translations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth ua
      WHERE ua.user_id = auth.uid() AND ua.role = 'superadmin' AND ua.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tbl_user_auth ua
      WHERE ua.user_id = auth.uid() AND ua.role = 'superadmin' AND ua.is_active = true
    )
  );

DROP POLICY IF EXISTS "Superadmin delete content translations" ON content_translations;
CREATE POLICY "Superadmin delete content translations"
  ON content_translations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tbl_user_auth ua
      WHERE ua.user_id = auth.uid() AND ua.role = 'superadmin' AND ua.is_active = true
    )
  );
