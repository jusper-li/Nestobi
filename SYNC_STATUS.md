# Nestobi Sync Status

Last sync: 2026-05-11 10:15 Asia/Taipei

## Production

- Netlify site: https://nestobi.netlify.app
- Netlify deploy id: `6a013b8f268dda4f2f869833`
- Deploy state: `ready`
- Built bundle verified: `assets/index-wijiU_ed.js`
- Supabase project URL: `https://qthciyizquumeufrujyp.supabase.co`

## Latest Fix

- Added Vite dev proxy for `/.netlify/functions/*` to `https://nestobi.netlify.app`.
- Added Vite dev proxy for `/supabase/*` to `https://qthciyizquumeufrujyp.supabase.co/*`.
- Changed local Supabase client URL to `window.location.origin + '/supabase'` on localhost.
- Changed login to use same-origin `/.netlify/functions/secure-login` in both local and production.
- Restarted the local Vite dev server on `http://localhost:5174`.
- Verified local proxied categories request returns HTTP 200 with 85 categories.
- Verified local proxied secure login returns HTTP 200 with a session for the superadmin account.

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
- Netlify deploy validation: no secret scan matches
