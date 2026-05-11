# Nestobi Sync Status

Last sync: 2026-05-11 09:58 Asia/Taipei

## Production

- Netlify site: https://nestobi.netlify.app
- Netlify deploy id: `6a013787f3932685cc38f7b9`
- Deploy state: `ready`
- Built bundle verified: `assets/index-DvQMhZs6.js`
- Supabase project URL: `https://qthciyizquumeufrujyp.supabase.co`

## Latest Fix

- Restored superadmin sidebar labels that had been corrupted into mojibake.
- Verified the production bundle contains `商品管理`, `商品分類管理`, and `超級管理後台`.
- Verified the old garbled sidebar marker is no longer present in the production bundle.

## Netlify Public List Check

- products: 64 from Supabase
- categories: 85 from Supabase
- rooms: 16 from Supabase
- blog-posts: 146 from Supabase
- blog-categories: 40 from Supabase

## Supabase Public Data Check

- products: 64
- categories: 85
- blog_posts: 147 including the internal `system-store-locations` row
- blog_categories: 40
- tbl_rooms: 16
- site_settings: 1
- store location fallback row: present
- store_locations table: not exposed/found in REST schema; frontend currently uses the `system-store-locations` fallback row.

## Local Verification

- TypeScript check: passed
- Vite production build: passed
- Production routes `/`, `/shop`, `/blog`, `/rooms`: HTTP 200 with latest bundle
- Netlify deploy validation: no secret scan matches
