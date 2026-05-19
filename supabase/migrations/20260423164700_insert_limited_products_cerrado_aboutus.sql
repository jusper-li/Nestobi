/*
  # Insert Limited Category Products

  Source: https://www.dlalshop.com/categories/limited
  Data gathered via page fetch + cross-referenced web searches.
  Images are Pexels placeholders — replace with actual product images when available.

  Products (2):
  1. Cerrado       - 春季櫻花配方 Spring Season Limited
  2. ABOUT US      - 季節配方豆 夢見草配方（Yumemigusa Blend）
*/

DO $$
DECLARE
  v_cat uuid;
  v_vendor uuid := '299e21b3-7527-4504-bc13-426771ff0fc0';
BEGIN
  SELECT id INTO v_cat FROM categories WHERE slug = 'coffee-beans';

  /* ── 1. Cerrado Spring Season Limited ── */
  INSERT INTO products (
    category_id, vendor_id, name, description, price,
    image_url, images, stock_quantity, is_active, sku,
    origin, roast_level, processing_method, altitude,
    variety, flavor_notes, weight_grams, tags, source_url
  )
  SELECT
    v_cat, v_vendor,
    'Cerrado - 春季櫻花配方 Spring Season Limited',
    'Cerrado 咖啡創立於 1986 年，發源於沖繩，由第二代烘豆師末吉成仁（Narihito Sueyoshi）主理。品牌以巴西 Cerrado 莽原命名，2015 年轉型為精品豆烘焙零售，末吉本人親自挑豆、烘焙並接待每位顧客。品牌亦在沖繩種植咖啡，每年推出極限量在地豆。此春季限定配方以「春花」為主題，調和三產區精華：
・衣索比亞 Sidamo LOGITA CWS G-1（海拔約 2,000–2,100m，水洗，海爾盧姆品種，帶花香與桃子調性）
・哥斯大黎加 JUAN PABLO WH（白蜜處理，保留適度甜感與乾淨杯感）
・肯亞 KARIAINI AB（水洗，莓果果醬、明亮酸質）
三產區交織出春日盛開的花香、如飲花茶的輕盈感，搭配紅茶基底的溫潤，口感滑順，尾韻深長如春光不散。期間限定，售完不補。',
    570,
    'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0, true, 'cerrado-spring-season-limited',
    '衣索比亞 Sidamo + 哥斯大黎加 + 肯亞（三產地配方）',
    '淺烘焙',
    '混合（水洗 + 白蜜處理 White Honey）',
    '衣索比亞約 2,000–2,100m（其餘產地未公開）',
    ARRAY['Heirloom（衣索比亞）'],
    ARRAY['花香', '櫻花', '梅花', '紅茶', '杯感乾淨', '口感滑順', '尾韻深長'],
    NULL,
    ARRAY['沖繩', '日本', '配方豆', '期間限定', 'Cerrado', '淺烘焙', '春季限定', '衣索比亞', '哥斯大黎加', '肯亞'],
    'https://www.dlalshop.com/products/cerrado-spring-season-limited'
  WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE source_url = 'https://www.dlalshop.com/products/cerrado-spring-season-limited'
  );

  /* ── 2. ABOUT US Yumemigusa Blend ── */
  INSERT INTO products (
    category_id, vendor_id, name, description, price,
    image_url, images, stock_quantity, is_active, sku,
    origin, roast_level, processing_method, altitude,
    variety, flavor_notes, weight_grams, tags, source_url, roast_date
  )
  SELECT
    v_cat, v_vendor,
    'ABOUT US - 季節配方豆 夢見草配方（Yumemigusa Blend）',
    '「夢見草」（Yumemigusa）是日本古典詩歌中對櫻花的雅稱，取其如夢似幻、轉瞬即逝的春日意境。ABOUT US COFFEE 是日本京都伏見稻荷神社附近的精品咖啡烘焙所，由澤野井泰成（Yasunari Sawanoi）於 2019 年創立。澤野井擁有 CQI Q Grader 資格，並以衣索比亞豆在 2022 年 Coffee Collection World Discover 獲得冠軍，亦是日本 JBC 與 JBrC 認證感官裁判。品牌名選擇「ABOUT US」而非「ABOUT ME」，意在強調從農民到消費者每個環節的每個人都是咖啡故事的主角。此款夢見草春季限定配方以衣索比亞與瓜地馬拉為基底，衣索比亞帶來如伯爵茶香的細膩花香，瓜地馬拉提供蜂蜜甜感與圓潤口感，綠茶般的收尾輕盈清新。整體風格明亮順口，如春日賞花時徐徐而來的暖風，期間限定，售完不候。',
    540,
    'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0, true, 'about-us-yumemigusa-blend',
    '衣索比亞 + 瓜地馬拉（兩產地配方）',
    '淺中烘焙',
    '未公開',
    NULL,
    NULL,
    ARRAY['櫻花', '伯爵茶', '香檸', '明亮順口', '蜂蜜', '綠茶'],
    NULL,
    ARRAY['日本', '京都', '配方豆', '期間限定', 'ABOUT US', '淺中烘焙', '春季限定', '衣索比亞', '瓜地馬拉', '日本烘豆師'],
    'https://www.dlalshop.com/products/about-us---season-limited-%E3%80%8Cyumemigusa-blend%E3%80%8D',
    '2025-04-15'
  WHERE NOT EXISTS (
    SELECT 1 FROM products
    WHERE source_url = 'https://www.dlalshop.com/products/about-us---season-limited-%E3%80%8Cyumemigusa-blend%E3%80%8D'
  );

END $$;
