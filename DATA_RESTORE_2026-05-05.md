# Data Restore - 2026-05-05

## Source

- Bolt project bundle: `.netlify-dist-deploy/assets/index-NCsQYNuK.js`
- Old Supabase project ref discovered from bundle: `njcpnxytnhiecfcyceaf`
- Target Supabase project: `nestobi-prod` (`qthciyizquumeufrujyp`)

## Restored Public Content

The current production database public content was replaced with the recoverable Bolt data:

| Table | Restored rows |
| --- | ---: |
| `vendors` | 1 |
| `hotels` | 5 |
| `tbl_rooms` | 18 |
| `categories` | 6 |
| `products` | 52 |
| `blog_posts` | 46 |
| `faqs` | 14 |
| `blog_categories` | 5 |
| `static_pages` | 4 |
| `site_settings` | 1 |
| `room_inventory_items` | 0 |
| `tbl_room_day_prices` | 0 |

## Notes

- Old `vendors.user_id` values referenced users that do not exist in the new Supabase Auth project, so vendor ownership was restored with `user_id = null` to keep public vendor, hotel, room, and product relationships valid.
- Public image fields were checked after import: hotels, rooms, products, and blog posts all have zero missing primary image fields.
- Login accounts were created or repaired in the new Supabase project:
  - `k286336@gmail.com`: `user`
  - `superadmin@nestobi.com`: `superadmin`

## Verification

- Public REST checks show active/published counts:
  - active hotels: 5
  - available rooms: 18
  - active products: 52
  - published blog posts: 46
  - published FAQs: 14
- `npm run typecheck`: passed
- `npm run build`: passed
- Local route checks returned HTTP 200 for `/`, `/rooms`, `/shop`, `/blog`, and `/superadmin`.
