/*
  # Fix Homepage Sections Content Mismatch

  ## Problem
  The homepage frontend and backoffice admin were showing different data because
  several sections were missing key content fields in the database:

  1. Hero section: missing `main_title` and `label` fields
     - Frontend defaults to 'y & m' when main_title is absent
     - Admin form shows empty field, confusing admins
  
  2. Products section: missing `label`, `number`, `submenu` fields
     - Admin form showed empty values for these fields

  ## Changes
  - Hero section: add `main_title: 'y & m'` and `label: '首頁'` to content
  - Products section: add `label`, `number` fields to content so admin form
    shows what the frontend actually renders
*/

-- Fix hero section: add missing main_title and label fields
UPDATE homepage_sections
SET content = content || jsonb_build_object(
  'main_title', 'y & m',
  'label', '首頁'
)
WHERE section_type = 'hero'
  AND (content->>'main_title' IS NULL OR content->>'main_title' = '')
  AND (content->>'label' IS NULL OR content->>'label' = '');

-- Fix products section: add missing label, number, submenu fields
UPDATE homepage_sections
SET content = content || jsonb_build_object(
  'label', COALESCE(content->>'title', title),
  'number', '02'
)
WHERE section_type = 'products'
  AND (content->>'label' IS NULL OR content->>'label' = '')
  AND (content->>'number' IS NULL OR content->>'number' = '');
