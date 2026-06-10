/*
  Extend site_settings so all contact/company/social data can be managed from one place.
*/

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS company_no text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS headquarters_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_line text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_youtube text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_x text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_tiktok text NOT NULL DEFAULT '';

UPDATE site_settings
SET
  contact_phone = '02-27565663',
  contact_email = 'service@dlalshop.com',
  company_no = '83122492',
  company_name = '若水金禾餐飲股份有限公司',
  headquarters_address = '台北市信義區忠孝東路四段553巷22弄4-1號',
  social_facebook = 'https://www.facebook.com/DLALinTaiwan',
  social_instagram = 'https://www.instagram.com/drink_like_a_local/',
  social_line = 'https://line.me/R/ti/p/@992kypjr',
  social_youtube = 'https://www.youtube.com/@dlal_travel',
  social_x = 'https://x.com/DLALTaiwan',
  social_twitter = 'https://x.com/DLALTaiwan',
  social_tiktok = 'https://www.tiktok.com/@dlal.tw',
  updated_at = now()
WHERE is_active = true;
