/*
  # Insert Canaan Kenya Kirinyaga Kaguyu Factory product

  Source: https://www.dlalshop.com/products/canaan-kenya-kirinyaga

  Uses INSERT … WHERE NOT EXISTS for idempotent scrape-style insert (keyed on source_url).
  Images are Pexels stock placeholders — replace with actual CDN URLs when available.
*/

INSERT INTO products (
  category_id, vendor_id, name, description, price,
  image_url, images, stock_quantity, is_active, sku,
  origin, roast_level, processing_method, altitude,
  variety, flavor_notes, weight_grams, tags, source_url, roast_date
)
SELECT
  c.id,
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  'Canaan - 肯亞 麒麟亞加 Kaguyu Factory',
  '產自肯亞麒麟亞加（Kirinyaga）的 Kaguyu Factory 精品咖啡豆，採用全水洗處理，海拔 1,500–1,600 公尺種植。精選 SL28、SL34、Ruiru 11 及 Batian 四大品種，由 Canaan 咖啡精心中烘焙，呈現明亮的黑醋栗、紅醋栗與紅頻果果香層次，酸質細膩，尾韻悠長。若需研磨服務請於訂單備註說明（研磨後將拆開密封包裝）。',
  600,
  'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200',
  '["https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
  50, true, 'canaan-kenya-kirinyaga',
  '肯亞 麒麟亞加（Kirinyaga）', '中烘焙', '全水洗', '1,500–1,600m',
  ARRAY['SL28', 'SL34', 'Ruiru 11', 'Batian'],
  ARRAY['黑醋栗', '紅醋栗', '紅頻果'],
  100,
  ARRAY['肯亞', '非洲', '精品咖啡', '單品咖啡', 'Canaan', '中烘焙', '全水洗'],
  'https://www.dlalshop.com/products/canaan-kenya-kirinyaga',
  '2026-02-20'
FROM categories c
WHERE c.slug = 'coffee-beans'
  AND NOT EXISTS (
    SELECT 1 FROM products WHERE source_url = 'https://www.dlalshop.com/products/canaan-kenya-kirinyaga'
  );
