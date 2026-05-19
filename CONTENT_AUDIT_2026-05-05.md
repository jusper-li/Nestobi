# Nestobi Content Audit - 2026-05-05

## Scope

Checked production Supabase project `nestobi-prod` (`qthciyizquumeufrujyp`) against these reference pages:

- DLAL: https://www.dlalshop.com/products/landmade-gift-blend-drip-bag
- Vocus: https://vocus.cc/salon/65ac03d7fd89780001938530/room/coffeeshopinjapan/%20%20%20%20%E3%80%90%E6%B2%96%E7%B9%A9%E3%80%91
- Kei.Cafe K5: https://kei.cafe/K5

## Copyright-Safe Handling

The requested "complete copy" of third-party photos and article text was not performed. Those assets may be protected by copyright unless Nestobi has explicit rights. The production database was updated with factual data, original summaries, and source links instead.

Images currently remain legal placeholder / externally linked images already present in the system. Official photos should be downloaded and uploaded only after the user confirms image rights or provides authorized files.

## Updates Applied

Migration applied:

- `correct_public_content_source_facts_20260505`

Changes:

- Added `blog_posts.source_url`.
- Corrected LANDMADE Gift Blend facts:
  - price: `75`
  - roast level: `深烘焙`
  - flavor notes: `巧克力`, `甜感`
  - best-before fact preserved in tags: `最佳賞味期限 2027/02/12`
  - source URL saved.
- Corrected Kei.Cafe K5 / 根本家 facts:
  - max guests: `18`
  - rooms: `5`
  - parking: `8`
  - license: `宜蘭合法民宿 2591 號`
  - address: `宜蘭縣三星鄉大義八路 590 號`
  - LINE: `@kkhome`
  - features: open kitchen, large wood dining table, lawn, electric mahjong, SONY 4K TV, Mien Dou Fu beds, TOTO bathroom, pet-friendly.
- Rewrote three blog posts as original summaries with source links:
  - `kei-cafe-k5-gemben-villa-guide`
  - `landmade-gift-blend-drip-bag-note`
  - `okinawa-coffee-trip-inspiration`

## Current Production Counts

- Hotels: 5
- Rooms: 9
- Products: 7
- Blog posts: 3
- FAQs: 4

## Image Status

Current database image fields have no blanks:

- `hotels.image_url`: no missing values
- `tbl_rooms.image_url`: no missing values
- `products.image_url`: no missing values
- `blog_posts.cover_image_url`: no missing values

Official source-site photos are pending authorization before upload.
