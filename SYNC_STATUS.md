# Nestobi Sync Status

Last sync: 2026-05-11 09:50 Asia/Taipei

## Production

- Netlify site: https://nestobi.netlify.app
- Netlify deploy id: `6a0134f888b9f93644df0c55`
- Deploy state: `ready`
- Built bundle verified: `assets/index-SOTyE-Jx.js`
- Supabase project URL: `https://qthciyizquumeufrujyp.supabase.co`

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
