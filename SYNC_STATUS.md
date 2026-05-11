# Nestobi Sync Status

Last sync: 2026-05-11 10:11 Asia/Taipei

## Production

- Netlify site: https://nestobi.netlify.app
- Netlify deploy id: `6a013a9b2ddfc9091c4a10ca`
- Deploy state: `ready`
- Built bundle verified: `assets/index-Dc_PMurr.js`
- Supabase project URL: `https://qthciyizquumeufrujyp.supabase.co`

## Latest Fix

- Changed frontend login to use `secure-login` instead of direct browser `supabase.auth.signInWithPassword()`.
- Localhost now calls `https://nestobi.netlify.app/.netlify/functions/secure-login` for login.
- Updated `secure-login` to support CORS for `http://localhost:5174` and Netlify deploy previews.
- Verified CORS preflight from localhost returns 204 with `access-control-allow-origin: http://localhost:5174`.
- Verified secure login POST from localhost origin returns 200 with a session for the superadmin account.
- Restarted the local Vite dev server on `http://localhost:5174`.
- Verified local `AuthContext.tsx` no longer contains `signInWithPassword` and uses `getSecureLoginUrl`.

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
