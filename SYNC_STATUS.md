# Nestobi Sync Status

Last sync: 2026-05-11 10:06 Asia/Taipei

## Production

- Netlify site: https://nestobi.netlify.app
- Netlify deploy id: `6a013994513ca06268f35b75`
- Deploy state: `ready`
- Built bundle verified: `assets/index-CMYD_Uq0.js`
- Supabase project URL: `https://qthciyizquumeufrujyp.supabase.co`

## Latest Fix

- Restarted the local Vite dev server on `http://localhost:5174` to clear stale HMR failures.
- Verified the local login page returns HTTP 200 and no current HMR syntax errors remain.
- Verified Supabase Auth accepts the superadmin account through the project API.
- Wrapped local Supabase login network failures so the UI shows the generic login error instead of raw `TypeError: Failed to fetch`.
- Restored superadmin sidebar labels that had been corrupted into mojibake.
- Verified the production bundle contains `商品管理`, `商品分類管理`, and `超級管理後台`.

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
- Local `/auth/login?redirect=%2Fsuperadmin`: HTTP 200
- Production login route loads latest bundle
- Production `public-list?resource=products`: HTTP 200, 64 items from Supabase
- Netlify deploy validation: no secret scan matches
