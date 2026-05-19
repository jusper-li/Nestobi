/*
  # Insert Featured Goods — Batch Product Upload

  Source category: https://www.dlalshop.com/categories/featured-goods
  Data gathered via page fetch + cross-referenced web searches.
  Images are Pexels placeholders — replace with actual product images when available.

  Products (12):
  1.  LANDMADE       - Spring Blend (春風配方)
  2.  GLITCH         - Kenya Kiambu Handage AA (肯亞 Kiambu Handage AA)
  3.  LIWEI          - Venezuela EL Recreo (委內瑞拉 EL Recreo)
  4.  GLITCH         - China Dehong Yuan Yi Yuan (雲南 Dehong Yuan Yi Yuan)
  5.  WAKOYA         - Ethiopia Ron (衣索比亞 Ron)
  6.  WAKOYA         - Ethiopia Japanese Sake (衣索比亞 Japaness Sake)
  7.  WAKOYA         - Brazil Vanilla (巴西 Vanilla)
  8.  LUMI UMI       - Taiwan Alishan (台灣阿里山 香香久溢)
  9.  ABOUT US       - Ecuador Finca La Marquesa (厄瓜多 Finca La Marquesa)
  10. DLAL           - Taiwan Northern Peace Woodland Drip Bag (台灣 北平山林咖啡掛耳)
  11. TOKADO         - Ethiopia Haire Selassie (衣索比亞 Haire Selassie)
  12. TOKADO         - Haiti Malebranche (海地 Malebranche)
  13. LiLo           - East Timor Asico (東帝汶 Asico)
*/

DO $$
DECLARE
  v_cat uuid;
  v_vendor uuid := '299e21b3-7527-4504-bc13-426771ff0fc0';
BEGIN
  SELECT id INTO v_cat FROM categories WHERE slug = 'coffee-beans';

  /* ── 1. LANDMADE Spring Blend ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'LANDMADE - 春風配方 Spring Blend',
    'LANDMADE 是日本神戶（Port Island, 中央區）的精品咖啡烘焙所，由上野真人（Masato Ueno）主理。以「讓更多人接觸到美味咖啡」為使命，同時推動咖啡捐贈給醫院病童的公益計畫。春風配方（Spring Blend）以柑橘、桃子、紅茶與黑糖的層次風味喚醒春日感受，為其季節限定配方系列之一。品牌不公開配方豆款組合，保留創作神秘感。',
    600,'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'landmade-spring-blend',
    '日本神戶 LANDMADE（配方豆，產地未公開）','中烘焙','未公開',NULL,NULL,
    ARRAY['柑橘','桃子','紅茶','黑糖'],
    100,ARRAY['日本','神戶','配方豆','中烘焙','LANDMADE','季節限定'],
    'https://www.dlalshop.com/products/landmade-spring-blend'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/landmade-spring-blend');

  /* ── 2. GLITCH Kenya Kiambu Handage AA ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'GLITCH - 肯亞 Kiambu Handage AA',
    'GLITCH Coffee & Roasters（東京，2015年創立）精選肯亞 Kiambu 郡 Handage 處理站豆款，由 Riitho 合作社營運。處理站名稱源自史瓦希利語「Ndege」（大鳥），因附近直升機停機坪而得名。坐落於海拔 1,700–1,800m 的紅色火山土壤上，緩慢的咖啡果成熟賦予明亮酸質與複雜風味。採手工挑選後去果皮，以乾淨的河水與雨水濕式發酵 12–16 小時，再於非洲架高曬床日曬 14–20 天。杯中呈現葡萄柚與番茄般的明亮酸質，清澈甜感中帶有葡萄乾般的深度。',
    620,'https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'glitch-kenya-kiambu-handage-aa',
    '肯亞 Kiambu 郡 Handage 處理站（Kenya Kiambu Handage）','淺烘焙','全水洗','1,700–1,800m',
    ARRAY['SL28','SL34','Ruiru 11','Batian'],
    ARRAY['番茄','葡萄柚','紅石榴','葡萄乾','果汁感','風味平衡'],
    100,ARRAY['肯亞','非洲','精品咖啡','單品咖啡','GLITCH','淺烘焙','全水洗','AA'],
    'https://www.dlalshop.com/products/glitch-coffee-and-roasters-kenya-kiambu-handage-aa'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku='glitch-kenya-kiambu-handage-aa');

  /* ── 3. LIWEI Venezuela EL Recreo ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'LIWEI - 委內瑞拉 EL Recreo',
    'LIWEI 是台灣拿鐵藝術冠軍李維軒（2022 大阪拿鐵藝術錦標賽冠軍）的自創品牌，理念為「咖啡是每天都能分享的小確幸」。EL Recreo 莊園（Hacienda El Recreo）位於委內瑞拉西部 Carabobo 州 Montalbán，創立於 1843 年，2015–2016 年由 Ricardo 與 Haydee 重新整頓為精品咖啡農場。莊園海拔 1,000–1,600m，擁有 13 種咖啡品種，是委內瑞拉首批精品出口農場之一。日曬處理呈現可可果肉的甜潤感，李子般的果酸與牛奶巧克力的圓潤尾韻，層次豐富、口感飽滿。',
    530,'https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'liwei-venezuela-el-recreo',
    '委內瑞拉 Carabobo 州 Hacienda EL Recreo（Venezuela Carabobo）','中烘焙','日曬','1,000–1,600m',
    NULL,
    ARRAY['可可果肉','李子','牛奶巧克力'],
    100,ARRAY['委內瑞拉','南美洲','精品咖啡','單品咖啡','LIWEI','中烘焙','日曬'],
    'https://www.dlalshop.com/products/liwei-venezuela-el-recreo'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/liwei-venezuela-el-recreo');

  /* ── 4. GLITCH China Dehong Yuan Yi Yuan ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'GLITCH - 雲南 Dehong Yuan Yi Yuan',
    'GLITCH Coffee & Roasters 精選中國雲南德宏（Dehong）袁宜園咖啡農場豆款。農場四面環山，形成獨特的盆地微氣候，海拔 1,400–1,580m。此批次採用與德宏熱帶作物研究所共同開發的創新發酵工藝：去除果皮後，將果皮放回裝水的桶中，與帶黏膜的帶殼豆一同加入咖啡專用酵母，發酵 150 小時後直接曬乾，不經水洗。不同於傳統蜜處理，此工藝使豆子充分吸收果皮酵素，賦予獨特的荔枝甜感、水蜜桃果香，以及如茉莉花茶般的清雅茶韻，口感滑順細膩。',
    700,'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'glitch-china-dehong-yuan-yi-yuan',
    '中國 雲南 德宏 袁宜園（China Yunnan Dehong Yuan Yi Yuan）','淺烘焙','酵母發酵蜜處理','1,400–1,580m',
    ARRAY['Catimor P4'],
    ARRAY['烏龍茶','荔枝','水蜜桃','茶感','滑順'],
    100,ARRAY['中國','雲南','亞洲','精品咖啡','單品咖啡','GLITCH','淺烘焙','蜜處理','酵母發酵'],
    'https://www.dlalshop.com/products/glitch-coffee-and-roasters-china-dehong-yuan-yi-yuan'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/glitch-coffee-and-roasters-china-dehong-yuan-yi-yuan');

  /* ── 5. WAKOYA Ethiopia Ron ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'WAKOYA 和珈屋 - 衣索比亞 Ron（萊姆酒浸漬）',
    'WAKOYA（和珈屋）是日本福井縣精品烘豆名家，由兩位 Q Grader 資格持有者夫妻檔小林美和與小林慎也共同主理，2015 年日本烘豆大賽亞軍，2023 年巴拿馬烘豆大賽雙料冠軍。其「浸漬系列」是當代精品咖啡界最受矚目的風味創新：將咖啡豆浸泡於特定液體中，讓豆子充分吸收香氣。Ron 系列以西班牙文 Ron（萊姆酒）命名，衣索比亞豆基底於萊姆酒中浸漬後烘焙，呈現萊姆酒的甜潤香氣、焦糖深度、巧克力醇厚感，以及草莓般的果香尾韻，口感圓滑飽滿。',
    950,'https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'wakoya-ethiopia-ron',
    '衣索比亞（Ethiopia）','中烘焙','萊姆酒浸漬（Ron Maceration）',NULL,NULL,
    ARRAY['萊姆酒','焦糖','巧克力','草莓','滑順'],
    100,ARRAY['衣索比亞','非洲','精品咖啡','單品咖啡','WAKOYA','和珈屋','中烘焙','浸漬系列','日本烘豆師'],
    'https://www.dlalshop.com/products/wakaya-coffee-ethiopia-japaness-ron',
    '2025-04-19'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/wakaya-coffee-ethiopia-japaness-ron');

  /* ── 6. WAKOYA Ethiopia Japanese Sake ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'WAKOYA 和珈屋 - 衣索比亞 Japanese Sake（清酒浸漬）',
    'WAKOYA（和珈屋）浸漬系列之清酒版本。將衣索比亞咖啡豆浸泡於日本清酒（Seishu）中，賦予豆子獨特的清酒芳香。杯中呈現清酒的細膩花果香、草莓的酸甜、熱帶水果的多汁感，以及牛奶巧克力與可可的溫潤尾韻。東西方飲食文化的跨界融合，為精品咖啡帶來獨一無二的和風體驗。WAKOYA 以「種子到杯子」的品質把關為核心，每年親赴咖啡產地拜訪農場，確保風味溯源可靠。',
    950,'https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'wakoya-ethiopia-japanese-sake',
    '衣索比亞（Ethiopia）','中烘焙','清酒浸漬（Japanese Sake Maceration）',NULL,NULL,
    ARRAY['清酒','草莓','熱帶水果','牛奶巧克力','可可'],
    100,ARRAY['衣索比亞','非洲','精品咖啡','單品咖啡','WAKOYA','和珈屋','中烘焙','浸漬系列','清酒','日本烘豆師'],
    'https://www.dlalshop.com/products/wakaya-coffee-ethiopia-japaness-sake',
    '2025-04-19'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/wakaya-coffee-ethiopia-japaness-sake');

  /* ── 7. WAKOYA Brazil Vanilla ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'WAKOYA 和珈屋 - 巴西 Vanilla（香草浸漬）',
    'WAKOYA（和珈屋）浸漬系列之香草版本。以巴西咖啡豆為基底，浸漬於天然香草精中，完整保留香草濃郁的甜香。圓潤的甜杏仁香氣、滑順的牛奶巧克力感，搭配黑糖的溫暖甜意，尾韻甘甜持久。適合喜愛甜感飽滿、低酸質且帶有風味層次的咖啡愛好者。整體風格輕鬆易入口，同時保有精品咖啡的工藝深度。',
    830,'https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'wakoya-brazil-vanilla',
    '巴西（Brazil）','中烘焙','香草浸漬（Vanilla Maceration）',NULL,NULL,
    ARRAY['香草','甜杏仁','牛奶巧克力','黑糖','尾韻甘甜'],
    100,ARRAY['巴西','南美洲','精品咖啡','WAKOYA','和珈屋','中烘焙','浸漬系列','香草','日本烘豆師'],
    'https://www.dlalshop.com/products/wakaya-coffee-brazil-vanilla',
    '2025-04-19'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/wakaya-coffee-brazil-vanilla');

  /* ── 8. LUMI UMI Taiwan Alishan ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'LUMI UMI - 台灣阿里山 香香久溢（森明美穗烘豆）',
    'LUMI UMI 品牌與日本烘豆師森明美穗（Miho Morimori）的客座烘豆合作款。「香香久溢」之名喚起綿延不絕的花果芬芳。豆源取自台灣阿里山精品咖啡產區，採用日曬處理，以 Typica 與 SL34 雙品種調配，呈現熱帶水果（鳳梨、百香果）、西瓜的清新多汁感，以及棕色香料與花香的複雜尾韻。阿里山產區以高山霧氣、日夜溫差大著稱，賦予咖啡豆天然的甜感與明亮酸質。淺焙忠實呈現產區風土，適合手沖萃取。',
    790,'https://images.pexels.com/photos/4109766/pexels-photo-4109766.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/4109766/pexels-photo-4109766.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'lumiumi-taiwan-alishan',
    '台灣 阿里山（Taiwan Alishan）','淺烘焙','日曬','1,200–1,500m（阿里山產區）',
    ARRAY['Typica','SL34'],
    ARRAY['鳳梨','百香果','西瓜','棕色香料','花香'],
    100,ARRAY['台灣','阿里山','精品咖啡','單品咖啡','LUMI UMI','淺烘焙','日曬','台灣在地'],
    'https://www.dlalshop.com/products/lumiumi-taiwan-alishan-n-miho',
    '2025-11-07'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/lumiumi-taiwan-alishan-n-miho');

  /* ── 9. ABOUT US Ecuador Finca La Marquesa ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'ABOUT US - 厄瓜多 Finca La Marquesa（Geisha CO2 Maceration）',
    'ABOUT US COFFEE 是日本京都伏見稻荷附近的精品咖啡烘焙所，品牌理念以「我們」取代「我」——從農民到消費者，每個環節都是主角。此款取自厄瓜多 Loja 省 Vilcabamba 谷地 Finca La Marquesa 莊園的 Geisha 品種，以 CO2 封閉式碳酸浸漬法（Carbonic Maceration）處理 72–96 小時。莊園坐落於 Podocarpus 國家自然保護區旁，火山土壤搭配獨特微氣候，賦予 Geisha 豐沛的花果風味。CO2 浸漬進一步放大 Geisha 標誌性的花香複雜度，呈現芭樂、鳳梨、葡萄酒感、李子與蜂蜜的多層次風味。',
    780,'https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'about-us-ecuador-finca-la-marquesa',
    '厄瓜多 Loja Vilcabamba Finca La Marquesa（Ecuador Loja）','淺烘焙','CO2 碳酸浸漬處理（Carbonic Maceration）','1,500–1,800m',
    ARRAY['Geisha'],
    ARRAY['花香','芭樂','鳳梨','葡萄酒感','李子','蜂蜜'],
    NULL,ARRAY['厄瓜多','南美洲','精品咖啡','單品咖啡','ABOUT US','淺烘焙','Geisha','CO2浸漬','日本烘豆師','京都'],
    'https://www.dlalshop.com/products/about-us-ecuador-finca-la-marquesa',
    '2025-10-28'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/about-us-ecuador-finca-la-marquesa');

  /* ── 10. DLAL Taiwan Northern Peace Woodland Drip Bag ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'DLAL - 台灣 北平山林咖啡掛耳（根本在旅行）',
    '「根本在旅行」（Drink Like A Local）是 DLAL 的在地台灣咖啡精選系列，以掛耳包形式讓旅行中的咖啡體驗唾手可得。北平山林（Northern Peace Woodland）農場位於新竹縣新埔鎮，海拔僅 230m，採用創新的低溫有氧日曬法（低溫有氧日曬法）保留細緻風味。SL34 品種在此低海拔下透過精心的後製處理，呈現烏梅的煙燻甜韻、柑橘的明亮果酸、蔗糖般的溫潤甜感，以及核桃的堅果尾韻。掛耳包形式方便攜帶，讓旅途中也能品嚐台灣在地精品咖啡。多件組合享優惠，單包 NT$85，整盒 NT$800。',
    85,'https://images.pexels.com/photos/6205503/pexels-photo-6205503.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/6205503/pexels-photo-6205503.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'dlal-taiwan-northpeace-woodland-drip-bag',
    '台灣 新竹縣 新埔鎮 北平山林（Taiwan Hsinchu Xinpu）','淺中烘焙','低溫有氧日曬','230m',
    ARRAY['SL34'],
    ARRAY['烏梅','柑橘','蔗糖','核桃'],
    10,ARRAY['台灣','新竹','精品咖啡','掛耳包','DLAL','根本在旅行','在地咖啡','伴手禮','旅遊咖啡'],
    'https://www.dlalshop.com/products/drink-like-a-local-taiwan-the-northpeace-woodland'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/drink-like-a-local-taiwan-the-northpeace-woodland');

  /* ── 11. TOKADO Ethiopia Haire Selassie ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'TOKADO - 衣索比亞 Haire Selassie（水洗）',
    'TOKADO 是日本福岡的傳奇烘焙所，由後藤直樹（Naoki Goto）主理——他是日本唯一的世界咖啡烘豆錦標賽冠軍（World Coffee Roasting Championship），也是東京知名咖啡選品店 Koffee Mameya 四大指定日本烘豆師之一。「Haire Selassie」以衣索比亞末代皇帝海爾・塞拉西一世命名，致敬咖啡發源地的深厚歷史。水洗處理帶出衣索比亞咖啡特有的清透花香與水果酸質，紅酒般的深邃感與飽滿甜意令人難忘。後藤直樹的烘焙工藝以精準火候著稱，充分展現產區個性。',
    1390,'https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'tokado-ethiopia-haire-selassie',
    '衣索比亞（Ethiopia）','淺中烘焙','水洗',NULL,NULL,
    ARRAY['花香','熱帶水果','莓果','紅酒','飽滿甜味'],
    NULL,ARRAY['衣索比亞','非洲','精品咖啡','單品咖啡','TOKADO','淺中烘焙','水洗','日本烘豆師','世界冠軍'],
    'https://www.dlalshop.com/products/tokado-ethiopia-haire-selassie',
    '2025-04-01'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tokado-ethiopia-haire-selassie');

  /* ── 12. TOKADO Haiti Malebranche ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'TOKADO - 海地 Malebranche（水洗 Typica）',
    'TOKADO 後藤直樹精選的罕見海地單品豆。Malebranche 批次來自海地 Thiotte 高地——海地最受推崇的咖啡微產區之一，火山土壤搭配海拔約 1,400m，孕育出品質卓越的 Typica 品種。Typica 是咖啡的原生種之一，以細膩、純淨著稱。水洗處理進一步突顯其清淡茶感、烤麵包的溫暖香氣、白葡萄的微甜與青草的清新感，整體風格輕盈優雅、餘韻綿長。海地精品咖啡出口量極少，此款是難得一見的珍稀產區体験。',
    1470,'https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'tokado-haiti-malebranche',
    '海地 Thiotte Malebranche（Haiti Thiotte）','淺烘焙','水洗','1,400m',
    ARRAY['Typica','鐵比卡'],
    ARRAY['茶感','烤麵包','白葡萄','青草','清淡口感'],
    NULL,ARRAY['海地','中美洲','精品咖啡','單品咖啡','TOKADO','淺烘焙','水洗','Typica','罕見產區','日本烘豆師','世界冠軍'],
    'https://www.dlalshop.com/products/tokado-haiti-malebranche',
    '2025-08-16'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tokado-haiti-malebranche');

  /* ── 13. LiLo East Timor Asico ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,stock_quantity,is_active,sku,origin,roast_level,processing_method,altitude,variety,flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'LiLo - 東帝汶 Asico（深烘焙 Hybrid Timor）',
    'LiLo Coffee Roasters 是 2014 年成立於大阪美國村的精品咖啡烘焙所，首席烘豆師中村圭太（Keita Nakamura）以「靜靜燃燒的火焰般的力量」為品牌核心精神。Asico 豆來自東帝汶 Ermera 縣 Letefoho 鄉 Asico 村的小農，是東帝汶頂級咖啡產區。Hybrid Timor 品種（阿拉比卡與羅布斯塔的自然雜交種）以耐病性與獨特風味著稱，深烘焙帶出其純粹力量：黑巧克力的濃郁、太妃糖的甜潤、核桃的堅果香，以及冷卻後逐漸展開的紅葡萄複雜感。建議以義式濃縮、手沖、冷萃或 Kinto 器具沖泡。200g 裝。',
    530,'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'lilo-east-timor-asico',
    '東帝汶 Ermera 縣 Letefoho 鄉 Asico 村（East Timor Ermera Letefoho Asico）','深烘焙','水洗','1,450m',
    ARRAY['Hybrid Timor','帝汶混血'],
    ARRAY['黑巧克力','太妃糖','核桃','紅葡萄'],
    200,ARRAY['東帝汶','亞洲','精品咖啡','單品咖啡','LiLo','深烘焙','水洗','Hybrid Timor','大阪','日本烘豆師'],
    'https://www.dlalshop.com/products/lilo-coffee-roasters-east-timor-asico',
    '2025-05-15'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/lilo-coffee-roasters-east-timor-asico');

END $$;
