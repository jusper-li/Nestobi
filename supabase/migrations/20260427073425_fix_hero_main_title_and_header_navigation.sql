/*
  # Fix Hero main_title and Header Navigation Sync

  ## Problems Found
  1. Hero section has main_title = "" (empty string), so frontend defaults to 'y & m'
     but admin form shows empty field — visible mismatch
  
  2. Header navigation in site_settings has stale anchors (#about, #contact)
     that point to sections which do NOT exist in homepage_sections.
     Actual sections are: hero, products, subscription, corporate, journal.

  ## Changes
  1. Set hero content.main_title = 'y & m' to match what frontend displays
  2. Update site_settings header navigation to correctly reflect actual sections
*/

-- Fix 1: Set hero main_title to actual displayed value
UPDATE homepage_sections
SET content = content || '{"main_title": "y & m"}'::jsonb
WHERE section_type = 'hero';

-- Fix 2: Update header navigation to match actual homepage sections
UPDATE site_settings
SET setting_value = setting_value || jsonb_build_object(
  'navigation', '[
    {"href": "/", "label": "首頁"},
    {"href": "#products", "label": "精選商品"},
    {"href": "#subscription", "label": "月票訂閱"},
    {"href": "#corporate", "label": "企業禮賓"},
    {"href": "#journal", "label": "旅行筆記"},
    {"href": "/shop", "label": "禮盒商城"}
  ]'::jsonb
)
WHERE setting_key = 'header';
