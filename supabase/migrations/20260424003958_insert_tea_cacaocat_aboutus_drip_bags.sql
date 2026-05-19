/*
  # Insert Tea Products, CACAOCAT Merchandise, and ABOUT US Drip Bags

  Source: https://www.dlalshop.com/categories/all-brands?page=2
  11 new products not previously in the database.
  Images are Pexels placeholders — replace with actual product images when available.

  Products:
  1.  茶根本  - 文化百科禮盒 NT$699
  2.  茶根本  - 京坪茶聚禮盒（升級版）NT$2,199
  3.  茶根本  - 京都 烘焙茶 立體茶包 NT$50~450
  4.  茶根本  - 京都 抹茶入玄米茶 立體茶包 NT$50~450
  5.  茶根本  - 坪林文山包種茶 立體茶包 NT$65~600
  6.  茶根本  - 坪林東方美人茶 立體茶包 NT$65~600
  7.  CACAOCAT - 黑貓布偶 NT$1,250
  8.  CACAOCAT - 貓貓冷水瓶 NT$350
  9.  CACAOCAT - 黑貓托特包 NT$650
  10. ABOUT US - 咖啡包 桃花朵朵配方 NT$70
  11. ABOUT US - 咖啡包 小確幸配方 NT$70
*/

DO $$
DECLARE
  v_coffee    uuid;
  v_tea       uuid;
  v_souvenir  uuid;
  v_travel    uuid;
  v_vendor    uuid := '299e21b3-7527-4504-bc13-426771ff0fc0';
BEGIN
  SELECT id INTO v_coffee   FROM categories WHERE slug = 'coffee-beans';
  SELECT id INTO v_tea      FROM categories WHERE slug = 'local-food';
  SELECT id INTO v_souvenir FROM categories WHERE slug = 'souvenirs';
  SELECT id INTO v_travel   FROM categories WHERE slug = 'travel-accessories';

  /* ── 1. 茶根本 文化百科禮盒 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    '茶根本 Tea at All - 文化百科禮盒 Culture Encyclopedia Gift Box',
    '「茶根本」是 DLAL 策展品牌，結合日本京都百年茶舖「北川半兵衛」（創立於 1861 年）與台灣坪林在地茶農「寬宇茶莊」的精品茶資源。「文化百科禮盒」是入門尺寸的台日聯名茶盒，收錄四款精品茶各 2 包（共 8 包）：北川半兵衛烘焙茶（焙茶）、北川半兵衛玄米茶、寬宇茶莊文山包種茶、寬宇茶莊東方美人茶。每包 2.5g 立體茶包，附紙提袋，適合作為精緻小禮、辦公室茶敘或收藏台日茶文化的入門選擇。',
    699,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'tea-at-all-culture-encyclopedia-gift-box',
    '台灣坪林 + 日本京都（台日聯名）',
    ARRAY['焙茶','玄米茶','文山包種茶','東方美人茶'],
    NULL,ARRAY['台灣','坪林','日本','京都','茶根本','禮盒','北川半兵衛','伴手禮','精品茶'],
    'https://www.dlalshop.com/products/tea-at-all-gift-box-teapack'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tea-at-all-gift-box-teapack');

  /* ── 2. 茶根本 京坪茶聚禮盒 NT$2,199 升級版 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    '茶根本 Tea at All - 京坪茶聚禮盒（升級版）Jingping Tea Gathering Gift Box Premium',
    '「京坪茶聚禮盒」升級版——「京」代表日本京都，「坪」代表台灣坪林，此禮盒以台日兩大茶文化為主角。升級版內容：寬宇茶莊坪林烏龍茶散葉 75g、北川半兵衛抹茶粉 40g（原裝錫罐），搭配特別設計的台日窗花造型 LED 燈飾燈罩，呈現手工工藝美感。整體以高端禮品定位，兼具實用性與藝術收藏價值。北川半兵衛創立於 1861 年（文久元年），是京都百年宇治茶批發老店；寬宇茶莊為坪林在地茶農，專精文山包種茶與東方美人茶。',
    2199,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'tea-at-all-jingping-gift-box-premium',
    '台灣坪林 + 日本京都（台日聯名）',
    ARRAY['烏龍茶散葉','抹茶粉'],
    NULL,ARRAY['台灣','坪林','日本','京都','茶根本','禮盒','北川半兵衛','LED燈飾','高端禮品','聯名'],
    'https://www.dlalshop.com/products/tea-at-all-gift-box-light'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tea-at-all-gift-box-light');

  /* ── 3. 茶根本 京都烘焙茶立體茶包 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    '茶根本 Tea at All - 京都 烘焙茶 立體茶包（北川半兵衛 Hojicha）',
    '北川半兵衛（Kitagawa Hanbee，創立 1861 年，京都祇園）百年宇治茶老鋪製作的焙茶立體茶包。焙茶（Hojicha）以高品質煎茶大火烘焙而成，散發獨特的烘焙香氣，咖啡因含量低，是老少皆宜的日本茶。北川半兵衛精選自京都府宇治、三重、滋賀、奈良的優質茶葉調配，口感圓潤醇厚，回甘悠長，與和食、中式料理、西式甜點皆相搭。2.5g 立體茶包，泡出清澈紅褐茶湯，從單包（NT$50）到多包盒裝（NT$450）彈性選購。',
    50,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'tea-at-all-kyoto-hojicha',
    '日本 京都府 宇治茶產區（Uji Tea）',
    ARRAY['烘焙香氣','醇厚','回甘悠長','低咖啡因'],
    3,ARRAY['日本','京都','焙茶','烘焙茶','茶根本','北川半兵衛','Hojicha','低咖啡因','精品茶'],
    'https://www.dlalshop.com/products/tea-at-all-box-teapack-houjicya'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tea-at-all-box-teapack-houjicya');

  /* ── 4. 茶根本 京都抹茶入玄米茶立體茶包 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    '茶根本 Tea at All - 京都 抹茶入玄米茶 立體茶包（北川半兵衛 Matcha Genmaicha）',
    '北川半兵衛（Kitagawa Hanbee，創立 1861 年，京都祇園）玄米茶加抹茶系列。玄米茶（Genmaicha）以烘炒白米或玄米混合綠茶製成，再加入京都抹茶粉提升香氣層次：炒米的溫暖堅果感、玄米茶的甘甜，與抹茶的清新草本香完美交融。獨特的鹹甜風味層次，口感厚實而滑順。2.5g 立體茶包便於攜帶，是日本家常茶的精品升級版本，也是台日茶文化入門的絕佳選擇。',
    50,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'tea-at-all-kyoto-matcha-genmaicha',
    '日本 京都府 宇治茶產區（Uji Tea）',
    ARRAY['炒米堅果香','抹茶清新','甘甜','滑順'],
    3,ARRAY['日本','京都','玄米茶','抹茶','茶根本','北川半兵衛','Genmaicha','精品茶'],
    'https://www.dlalshop.com/products/tea-at-all-box-teapack-genmaicya'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tea-at-all-box-teapack-genmaicya');

  /* ── 5. 茶根本 坪林文山包種茶立體茶包 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    '茶根本 Tea at All - 坪林文山包種茶 立體茶包（寬宇茶莊 Wenshan Pouchong）',
    '寬宇茶莊出品，來自台灣包種茶之鄉「坪林」的文山包種茶。包種茶是台灣氧化程度最低的烏龍茶（約 15–25% 氧化），保留茶葉最細膩的花香綠意。坪林為新北市山區，海拔 600–700m，清涼潮濕的氣候孕育茶葉最豐富的香氣，全台近九成包種茶產於此地。以青心烏龍品種製作，外觀條索彎曲，茶湯金黃清澈，花香悠雅如蘭，口感清爽甘甜，是品嚐台灣茶最純粹的起點。2.5g 立體茶包，單包至整盒彈性選擇。',
    65,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'tea-at-all-pinglin-pouchong',
    '台灣 新北市 坪林區（海拔 600–700m）',
    ARRAY['花香','清爽','甘甜','淡雅蘭香'],
    3,ARRAY['台灣','坪林','文山包種茶','烏龍茶','茶根本','寬宇茶莊','精品茶','台灣茶'],
    'https://www.dlalshop.com/products/tea-at-all-box-teapack-pouchong-tea'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tea-at-all-box-teapack-pouchong-tea');

  /* ── 6. 茶根本 坪林東方美人茶立體茶包 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    '茶根本 Tea at All - 坪林東方美人茶 立體茶包（寬宇茶莊 Oriental Beauty）',
    '寬宇茶莊出品的坪林東方美人茶（膨風茶），是台灣最具代表性的重發酵烏龍茶（氧化度 60–80%）。東方美人茶的獨特之處在於必須被小綠葉蟬（浮塵子）咬食，蟲咬後茶葉觸發天然酵素反應，產生無可複製的「蜜香」。相傳英國維多利亞女王品嚐此茶後，以「東方美人」命名讚嘆其魅力。茶湯橙紅亮麗，入口甜潤如蜜，果香（水蜜桃、麝香葡萄）與花香交融，尾韻悠長甘甜。不使用農藥——蟲咬是天然農法的必要條件。2.5g 立體茶包，單包至整盒彈性選擇。',
    65,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'tea-at-all-pinglin-oriental-beauty',
    '台灣 新北市 坪林區',
    ARRAY['蜜香','水蜜桃','麝香葡萄','花香','甘甜悠長'],
    3,ARRAY['台灣','坪林','東方美人茶','烏龍茶','茶根本','寬宇茶莊','精品茶','膨風茶','蜜香'],
    'https://www.dlalshop.com/products/tea-at-all-box-teapack-oriental-beauty-tea'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tea-at-all-box-teapack-oriental-beauty-tea');

  /* ── 7. CACAOCAT 黑貓布偶 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_souvenir,v_vendor,
    'CACAOCAT - 黑貓布偶 Black Cat Soft Toy',
    'CACAOCAT 是 2021 年起源自北海道的高端巧克力品牌，以貓爪印花設計的巧克力甘納許聞名，現提供 14 種口味，並以貓咪為品牌吉祥物，象徵友善、療癒與幸福。CEO 田島慎也曾經營日本全國超過 200 家麵包店，將精緻食品工藝帶入巧克力領域。品牌的一部分收益投入貓咪保護公益活動。此款黑貓布偶以 CACAOCAT 標誌性黑貓造型製作，全聚酯纖維填充，高約 21cm，手感柔軟，適合陳列收藏或作為伴手禮。',
    1250,
    'https://images.pexels.com/photos/2061057/pexels-photo-2061057.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/2061057/pexels-photo-2061057.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'cacaocat-black-cat-soft-toy',
    NULL,NULL,ARRAY['日本','北海道','CACAOCAT','貓咪','布偶','周邊商品','禮品','伴手禮'],
    'https://www.dlalshop.com/products/cacaocat-cat-soft-toy'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/cacaocat-cat-soft-toy');

  /* ── 8. CACAOCAT 貓貓冷水瓶 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_travel,v_vendor,
    'CACAOCAT - 貓貓冷水瓶 Cat Water Bottle（300ml）',
    'CACAOCAT 品牌授權冷水瓶，容量 300ml，塑膠材質。瓶身印有品牌標誌性黑貓圖案，適合冷飲使用（耐熱上限 60°C，不適合熱飲）。輕巧便攜，是旅行、日常外出的實用隨行杯，同時展示對 CACAOCAT 品牌的喜愛。CACAOCAT 以北海道高端巧克力聞名，貓咪形象的品牌設計深受粉絲喜愛，周邊商品亦成為熱門收藏品項。',
    350,
    'https://images.pexels.com/photos/2061057/pexels-photo-2061057.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/2061057/pexels-photo-2061057.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'cacaocat-cat-water-bottle',
    NULL,NULL,ARRAY['日本','北海道','CACAOCAT','水瓶','旅行','周邊商品','冷水瓶'],
    'https://www.dlalshop.com/products/cacaocat-cat-bottle'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/cacaocat-cat-bottle');

  /* ── 9. CACAOCAT 黑貓托特包 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_souvenir,v_vendor,
    'CACAOCAT - 黑貓托特包 Black Cat Canvas Tote Bag（39×29×15cm）',
    'CACAOCAT 品牌帆布托特包，39×29×15cm，帆布材質，中央印有標誌性黑貓圖案。尺寸寬敞，可輕鬆放入 A4 文件及日常物品。CACAOCAT 以北海道高端巧克力起家，2021 年創立，以貓咪作為品牌靈魂，象徵「讓世界充滿愛與幸福」。這款托特包是品牌文化的實用延伸，兼具購物袋與日常包款功能，也是喜愛 CACAOCAT 品牌者的精選收藏品。',
    650,
    'https://images.pexels.com/photos/2061057/pexels-photo-2061057.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/2061057/pexels-photo-2061057.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'cacaocat-black-cat-tote-bag',
    NULL,NULL,ARRAY['日本','北海道','CACAOCAT','托特包','帆布','周邊商品','禮品'],
    'https://www.dlalshop.com/products/cacaocat-cat-totebag'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/cacaocat-cat-totebag');

  /* ── 10. ABOUT US 桃花朵朵配方掛耳包 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_coffee,v_vendor,
    'ABOUT US - 咖啡包 桃花朵朵配方 Happiness Bloom Drip Bag',
    'ABOUT US COFFEE（日本京都伏見稻荷，2019年創立）的「桃花朵朵」掛耳包，英文名 Happiness Bloom。「桃花朵朵開」的意象呼應品牌的蝴蝶蘭（帶來幸福、盛開美好時刻）品牌精神，期許每杯咖啡都能為飲者帶來宛如桃花盛開般的愉悅瞬間。主理人澤野井泰成（Q Grader）以衣索比亞豆為品牌核心，2022 年 Coffee Collection World Discover 冠軍，淺焙為主要風格。此掛耳包風格預期帶有花香、桃子、漿果等明亮果香調性，延續 ABOUT US 一貫的精品輕盈感。',
    70,
    'https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'about-us-drip-bag-happiness-bloom',
    '配方豆（產地未公開）','淺烘焙',
    ARRAY['花香','桃子','漿果','明亮果香'],
    10,ARRAY['日本','京都','ABOUT US','掛耳包','淺烘焙','花果調','日本烘豆師'],
    'https://www.dlalshop.com/products/about-us---drip-style-blend-%22happiness-bloom%22'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/about-us---drip-style-blend-%22happiness-bloom%22');

  /* ── 11. ABOUT US 小確幸配方掛耳包 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_coffee,v_vendor,
    'ABOUT US - 咖啡包 小確幸配方 Daily Little Happiness Drip Bag',
    'ABOUT US COFFEE（日本京都伏見稻荷，2019年創立）的「小確幸」掛耳包，英文名 Daily Little Happiness。「小確幸」源自村上春樹散文，意指「微小而確切的幸福」——每天生活中隨手可及的美好瞬間。ABOUT US 的品牌哲學認為，從農民到消費者每個人都是咖啡故事的主角，「ABOUT US」而非「ABOUT ME」正是此精神的體現。此掛耳包以日常飲用為設計核心，風格圓潤均衡，以輕中焙帶出親切的甜感與溫潤口感，讓每一天的早晨或午後都能找到那份「小確幸」的咖啡幸福感。',
    70,
    'https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'about-us-drip-bag-daily-happiness',
    '配方豆（產地未公開）','淺中烘焙',
    ARRAY['圓潤均衡','甜感','溫潤口感','日常易飲'],
    10,ARRAY['日本','京都','ABOUT US','掛耳包','淺中烘焙','日常咖啡','日本烘豆師'],
    'https://www.dlalshop.com/products/about-us---drip-style-blend-%22daily-little-happiness%22'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/about-us---drip-style-blend-%22daily-little-happiness%22');

END $$;
