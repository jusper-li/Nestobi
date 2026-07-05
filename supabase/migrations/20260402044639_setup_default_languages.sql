/*
  # Setup Default Languages

  Creates default language entries for Traditional Chinese and English
*/

INSERT INTO languages (code, name, is_default, is_active)
VALUES
  ('zh-TW', '繁體中文', true, true),
  ('en', 'English', false, true)
ON CONFLICT (code) DO NOTHING;