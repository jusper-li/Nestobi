/*
  # Insert GLITCH - Colombia Huila Monteblanco Tropical Washed

  Source: https://www.dlalshop.com/products/glitch-coffee-and-roasters-colombia-huila-monteblanco-tropical-washed-1
  Cross-referenced: Glitch Coffee official shop, Coffee Stage HK, web search results

  Product details:
  - Roaster:    GLITCH Coffee & Roasters (Tokyo, est. 2015, Asia Top-50 2019)
  - Origin:     哥倫比亞 惠拉（Colombia, Huila）
  - Farm:       Finca Monteblanco
  - Producer:   Rodrigo Sanchez（第三代農場主）
  - Variety:    Purple Caturra（紫色卡圖拉）
  - Altitude:   1,730m
  - Processing: Tropical Washed（熱帶水洗）
                以鳳梨、百香果、柳橙、芒果、panela（傳統哥倫比亞未精製糖）及酵母發酵
  - Flavor:     鳳梨、水蜜桃、柳橙、香甜、辛香
  - Roast:      淺烘焙
  - Weight:     150g
  - Price:      NT$780（頁面動態載入，價格為估算值，請於後台確認）
  - Vendor:     澄宜有限公司 (id: 299e21b3-7527-4504-bc13-426771ff0fc0)
  - Category:   咖啡豆 (coffee-beans)

  Images: Pexels placeholders — replace with actual product images when available.
*/

INSERT INTO products (
  category_id, vendor_id, name, description, price,
  image_url, images, stock_quantity, is_active, sku,
  origin, roast_level, processing_method, altitude,
  variety, flavor_notes, weight_grams, tags, source_url
)
SELECT
  c.id,
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  'GLITCH - 哥倫比亞 惠拉 蒙特布蘭科 Tropical Washed',
  'GLITCH Coffee & Roasters（東京，2015年創立，榮獲《The Big 7 Travel》2019年亞洲前50大咖啡館第24名）精心挑選的哥倫比亞 Huila 產區 Monteblanco 莊園豆。由第三代農場主 Rodrigo Sanchez 主理，以創新發酵工藝著稱。此批次採用 Tropical Washed（熱帶水洗）處理：以鳳梨、百香果、柳橙、芒果、panela（哥倫比亞傳統未精製糖）及酵母進行發酵，萃取果實酵素後再處理咖啡豆。利用紫色卡圖拉（Purple Caturra）品種本身高糖分與微生物活性，歷經多年研究實驗，呈現鳳梨、水蜜桃的多汁果感，帶有柳橙甜感與隱約辛香尾韻。淺烘焙保留產區風土特色，層次豐富、餘韻悠長。',
  780,
  'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200',
  '["https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
  30, true, 'glitch-colombia-huila-monteblanco-tropical-washed',
  '哥倫比亞 惠拉 蒙特布蘭科（Colombia Huila, Finca Monteblanco）',
  '淺烘焙',
  'Tropical Washed（熱帶水洗）',
  '1,730m',
  ARRAY['Purple Caturra', '紫色卡圖拉'],
  ARRAY['鳳梨', '水蜜桃', '柳橙', '香甜', '辛香'],
  150,
  ARRAY['哥倫比亞', '南美洲', '精品咖啡', '單品咖啡', 'GLITCH', '淺烘焙', '熱帶水洗', 'Monteblanco', 'Rodrigo Sanchez', '日本烘豆師'],
  'https://www.dlalshop.com/products/glitch-coffee-and-roasters-colombia-huila-monteblanco-tropical-washed-1'
FROM categories c
WHERE c.slug = 'coffee-beans'
  AND NOT EXISTS (
    SELECT 1 FROM products
    WHERE source_url = 'https://www.dlalshop.com/products/glitch-coffee-and-roasters-colombia-huila-monteblanco-tropical-washed-1'
  );
