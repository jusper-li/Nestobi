/*
  Seed current y&m Coffee catalog items referenced from https://www.ynm.com.tw/products.
  This keeps fresh Supabase environments aligned with the known public storefront catalog.
*/

INSERT INTO categories (name, slug, description, sort_order, is_active)
VALUES
  ('頂級精品咖啡豆', 'beans', '世界烘豆冠軍與台灣精品莊園咖啡豆', 10, true),
  ('頂級精品濾掛', 'drip-coffee', '冠軍配方與藝術聯名精品濾掛咖啡', 20, true),
  ('藝術聯名禮盒', 'gift-boxes', '精品咖啡、巧克力與藝術聯名禮盒', 30, true),
  ('咖啡沖泡器具', 'brew-tools', '居家手沖與精品咖啡沖泡器具', 40, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

UPDATE products
SET is_active = false,
    is_hidden = true,
    updated_at = now()
WHERE slug IN (
  'huo-gang-2026-money-gift-box',
  'reserved-for-you-zuo-drip-single'
);

WITH catalog_items (
  category_slug,
  name,
  slug,
  summary,
  description,
  price,
  sale_price,
  stock,
  sku,
  specifications,
  is_featured
) AS (
  VALUES
    (
      'gift-boxes',
      'Reserved for You｜限量珍藏系列 花囍田咖啡莊園 × WCE 烘豆冠軍 × 藝術家霍剛 跨界聯名之作',
      'reserved-for-you-huasitian-huo-limited',
      '花囍田咖啡莊園、WCE 烘豆冠軍與藝術家霍剛跨界合作的限量珍藏系列。',
      '以台灣精品莊園咖啡為核心，結合冠軍烘豆技術與霍剛藝術聯名視覺，適合收藏、贈禮與精品咖啡品飲。',
      1600,
      1280,
      12,
      'YNM-GIFT-HUASITIAN-HUO',
      '[{"name":"系列","value":"Reserved for You 限量珍藏系列"},{"name":"莊園","value":"花囍田咖啡莊園"},{"name":"聯名","value":"WCE 烘豆冠軍、藝術家霍剛"}]'::jsonb,
      true
    ),
    (
      'gift-boxes',
      'Reserved for You｜限量珍藏系列 阿里山鄒築園 × 2025 WCE TCRC 烘豆冠軍 × 吳偉丞陶藝家 跨界聯名之作',
      'reserved-for-you-zuo-wce-wu-limited',
      '阿里山鄒築園、2025 WCE TCRC 烘豆冠軍與吳偉丞陶藝家的限量珍藏聯名。',
      '以台灣阿里山精品咖啡為主軸，結合冠軍烘焙與陶藝家跨界創作，呈現兼具風味與收藏性的禮贈選擇。',
      1280,
      NULL,
      18,
      'YNM-GIFT-ZUO-WU-LIMITED',
      '[{"name":"系列","value":"Reserved for You 限量珍藏系列"},{"name":"產區","value":"台灣阿里山"},{"name":"聯名","value":"鄒築園、2025 WCE TCRC 烘豆冠軍、吳偉丞陶藝家"}]'::jsonb,
      true
    ),
    (
      'beans',
      'Reserved for you｜阿里山鄒築園 x 2025 WCE TCRC 烘豆冠軍 x 吳偉丞陶藝家跨界聯名',
      'reserved-for-you-zuo-champion-beans',
      '阿里山鄒築園與冠軍烘豆師合作的限量精品咖啡豆。',
      '台灣高山精品咖啡批次，結合賽事級烘焙技術與藝術聯名收藏感，適合手沖與精品咖啡愛好者。',
      1880,
      NULL,
      0,
      'YNM-BEAN-ZUO-001',
      '[{"name":"重量","value":"依原廠包裝標示"},{"name":"產區","value":"台灣阿里山"},{"name":"特色","value":"限量競標批次、藝術家跨界聯名"}]'::jsonb,
      true
    ),
    (
      'gift-boxes',
      'y ＆ m｜ORIGIN 冠軍精品咖啡巧克力禮盒',
      'champion-coffee-chocolate-koyama-gift-box',
      '精品咖啡風味與 ORIGIN 巧克力搭配的冠軍精品咖啡巧克力禮盒。',
      '以精品咖啡香氣與巧克力風味層次打造的高質感禮盒，適合節慶、企業與日常贈禮。',
      1280,
      1080,
      18,
      'YNM-GIFT-CHOC-KOYAMA',
      '[{"name":"內容物","value":"精品濾掛咖啡、精品咖啡巧克力"},{"name":"巧克力","value":"100% 黑金、70% 咖啡、40% 拿鐵等口味選項"},{"name":"包裝","value":"ORIGIN 冠軍精品咖啡巧克力禮盒"}]'::jsonb,
      true
    ),
    (
      'drip-coffee',
      'The One and Only｜世界烘豆冠軍 獨家精品配方濾掛咖啡<霍剛藝術聯名系列>',
      'the-one-and-only-huo-gang-drip',
      '耶加雪菲水洗與日曬黃金比例調配，帶杏桃、蘋果與柑橘層次。',
      '世界烘豆冠軍團隊打造的獨家精品配方，以霍剛藝術聯名包裝呈現，適合日常沖泡與精品濾掛收藏。',
      120,
      NULL,
      80,
      'YNM-DRIP-ONE-HUO',
      '[{"name":"內容物","value":"精品濾掛咖啡 12g / 包"},{"name":"風味","value":"杏桃乾、蘋果、柑橘、伯爵茶尾韻"},{"name":"系列","value":"霍剛藝術聯名系列"}]'::jsonb,
      true
    ),
    (
      'gift-boxes',
      'y ＆ m｜ORIGIN 冠軍精品咖啡巧克力禮盒',
      'champion-coffee-chocolate-huo-gang-gift-box',
      '冠軍精品咖啡與 ORIGIN 巧克力風味結合的經典禮盒。',
      '以精品咖啡巧克力為主角的經典禮盒版本，適合想送出穩重、精緻風味的顧客。',
      1280,
      NULL,
      20,
      'YNM-GIFT-CHOC-HUO',
      '[{"name":"內容物","value":"精品咖啡巧克力與冠軍咖啡元素"},{"name":"巧克力","value":"100% 黑金、70% 咖啡、40% 拿鐵等風味"},{"name":"保存","value":"建議冷藏保存，常溫避免高於 26°C"}]'::jsonb,
      true
    ),
    (
      'gift-boxes',
      'Reserved for You｜限量珍藏系列',
      'huo-gang-art-drip-coffee-gift-box',
      'Reserved for You 限量珍藏系列的精品咖啡禮盒。',
      '以珍藏系列包裝與精品咖啡內容呈現，適合重要節日、企業禮賓與值得被好好款待的人。',
      1280,
      NULL,
      24,
      'YNM-GIFT-ART-HUO',
      '[{"name":"系列","value":"霍剛藝術聯名系列"},{"name":"內容物","value":"精品濾掛咖啡禮盒"},{"name":"附贈","value":"y & m 禮盒提袋"}]'::jsonb,
      true
    ),
    (
      'beans',
      'The One and Only｜世界烘豆冠軍 獨家精品配方豆',
      'the-one-and-only-champion-blend-beans',
      '世界盃烘豆冠軍團隊打造的耶加雪菲淺焙果香精品配方豆。',
      '以水洗與日曬處理法的黃金比例結合，呈現杏桃乾、蘋果、柑橘與伯爵茶般尾韻。',
      880,
      NULL,
      28,
      'YNM-BEAN-ONE-ONLY',
      '[{"name":"重量","value":"200g"},{"name":"焙度","value":"淺焙果香"},{"name":"風味","value":"杏桃乾、蘋果、柑橘、伯爵茶"}]'::jsonb,
      true
    ),
    (
      'drip-coffee',
      'The One & Only 世界烘豆冠軍 獨家精品配方 - 15入手工帆布袋組<霍剛藝術聯名系列>',
      'the-one-and-only-15-drip-canvas-set',
      '15 入精品濾掛搭配手工帆布袋，兼具日常飲用與送禮質感。',
      '以世界烘豆冠軍獨家配方濾掛為主體，搭配霍剛藝術聯名包裝與手工帆布袋組。',
      1800,
      1580,
      16,
      'YNM-DRIP-CANVAS-15',
      '[{"name":"內容物","value":"精品濾掛咖啡 15 入"},{"name":"配件","value":"手工帆布袋"},{"name":"系列","value":"霍剛藝術聯名系列"}]'::jsonb,
      true
    ),
    (
      'beans',
      'Reserved for you｜國際賽事COE獲獎競標批次 阿里山璟隆咖啡莊園 藝伎日曬',
      'reserved-for-you-jinglong-geisha-natural',
      'COE 獲獎競標批次的阿里山璟隆藝伎日曬咖啡豆，目前售完。',
      '台灣阿里山璟隆咖啡莊園藝伎日曬批次，屬競賽級限量咖啡，適合收藏與精品手沖愛好者關注補貨。',
      1980,
      NULL,
      0,
      'YNM-BEAN-JINGLONG-GEISHA',
      '[{"name":"產區","value":"台灣阿里山"},{"name":"品種","value":"藝伎"},{"name":"處理法","value":"日曬"}]'::jsonb,
      false
    ),
    (
      'brew-tools',
      'y & m 咖啡器具手沖組',
      'ynm-pourover-brewing-set',
      '為精品咖啡入門與日常手沖打造的 y & m 沖泡器具組。',
      '包含手沖所需核心器具，適合搭配 y & m 精品咖啡豆與濾掛禮盒，建立完整居家咖啡體驗。',
      1280,
      NULL,
      10,
      'YNM-TOOLS-POUROVER',
      '[{"name":"類型","value":"咖啡沖泡器具"},{"name":"適用","value":"居家手沖、禮品搭配"},{"name":"建議搭配","value":"The One and Only 精品配方豆"}]'::jsonb,
      false
    ),
    (
      'gift-boxes',
      '精品咖啡信籤禮物<霍剛藝術聯名系列>',
      'huo-gang-coffee-letter-gift',
      '把精品咖啡做成可傳遞心意的信籤式禮物。',
      '以霍剛藝術聯名包裝承載精品濾掛咖啡，輕量、精緻，適合小型謝禮與日常祝福。',
      840,
      760,
      22,
      'YNM-GIFT-LETTER-HUO',
      '[{"name":"系列","value":"霍剛藝術聯名系列"},{"name":"形式","value":"信籤式精品咖啡禮物"},{"name":"用途","value":"小型贈禮、企業活動、日常心意"}]'::jsonb,
      false
    )
)
INSERT INTO products (
  category_id,
  name,
  slug,
  summary,
  description,
  content,
  price,
  sale_price,
  cost_price,
  member_price,
  stock,
  sku,
  images,
  specifications,
  is_active,
  is_featured,
  is_hidden,
  seo_title,
  seo_description,
  seo_keywords,
  published_at
)
SELECT
  categories.id,
  catalog_items.name,
  catalog_items.slug,
  catalog_items.summary,
  catalog_items.description,
  '',
  catalog_items.price,
  catalog_items.sale_price,
  0,
  NULL,
  catalog_items.stock,
  catalog_items.sku,
  CASE catalog_items.slug
    WHEN 'reserved-for-you-huasitian-huo-limited' THEN '["/product-images/reserved-for-you-huasitian-huo-limited-1.jpg","/product-images/reserved-for-you-huasitian-huo-limited-2.jpg"]'::jsonb
    WHEN 'reserved-for-you-zuo-wce-wu-limited' THEN '["/product-images/reserved-for-you-zuo-wce-wu-limited-1.jpg","/product-images/reserved-for-you-zuo-wce-wu-limited-2.jpg"]'::jsonb
    WHEN 'reserved-for-you-zuo-champion-beans' THEN '["/product-images/reserved-for-you-zuo-champion-beans-1.jpg","/product-images/reserved-for-you-zuo-champion-beans-2.jpg"]'::jsonb
    WHEN 'champion-coffee-chocolate-koyama-gift-box' THEN '["/product-images/champion-coffee-chocolate-koyama-gift-box-1.jpg","/product-images/champion-coffee-chocolate-koyama-gift-box-2.jpg"]'::jsonb
    WHEN 'the-one-and-only-huo-gang-drip' THEN '["/product-images/the-one-and-only-huo-gang-drip-1.jpg","/product-images/the-one-and-only-huo-gang-drip-2.jpg"]'::jsonb
    WHEN 'champion-coffee-chocolate-huo-gang-gift-box' THEN '["/product-images/champion-coffee-chocolate-huo-gang-gift-box-1.jpg","/product-images/champion-coffee-chocolate-huo-gang-gift-box-2.jpg"]'::jsonb
    WHEN 'huo-gang-art-drip-coffee-gift-box' THEN '["/product-images/huo-gang-art-drip-coffee-gift-box-1.jpg","/product-images/huo-gang-art-drip-coffee-gift-box-2.jpg"]'::jsonb
    WHEN 'the-one-and-only-champion-blend-beans' THEN '["/product-images/the-one-and-only-champion-blend-beans-1.jpg","/product-images/the-one-and-only-champion-blend-beans-2.jpg"]'::jsonb
    WHEN 'the-one-and-only-15-drip-canvas-set' THEN '["/product-images/the-one-and-only-15-drip-canvas-set-1.jpg","/product-images/the-one-and-only-15-drip-canvas-set-2.jpg"]'::jsonb
    WHEN 'reserved-for-you-jinglong-geisha-natural' THEN '["/product-images/reserved-for-you-jinglong-geisha-natural-1.jpg","/product-images/reserved-for-you-jinglong-geisha-natural-2.jpg"]'::jsonb
    WHEN 'ynm-pourover-brewing-set' THEN '["/product-images/ynm-pourover-brewing-set-1.jpg","/product-images/ynm-pourover-brewing-set-2.jpg"]'::jsonb
    WHEN 'huo-gang-coffee-letter-gift' THEN '["/product-images/huo-gang-coffee-letter-gift-1.jpg","/product-images/huo-gang-coffee-letter-gift-2.jpg"]'::jsonb
    ELSE '[]'::jsonb
  END,
  catalog_items.specifications,
  true,
  catalog_items.is_featured,
  false,
  catalog_items.name || '｜Sonpin',
  catalog_items.summary,
  'y&m Coffee,精品咖啡,冠軍烘豆,藝術聯名,濾掛咖啡,咖啡豆,咖啡禮盒',
  now()
FROM catalog_items
JOIN categories ON categories.slug = catalog_items.category_slug
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  sale_price = EXCLUDED.sale_price,
  stock = EXCLUDED.stock,
  sku = EXCLUDED.sku,
  specifications = EXCLUDED.specifications,
  is_active = true,
  is_featured = EXCLUDED.is_featured,
  is_hidden = false,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  seo_keywords = EXCLUDED.seo_keywords,
  updated_at = now();
