/*
  # Insert Craftsman's Recipe Category Products

  Source: https://www.dlalshop.com/categories/craftsmans-recipe
  14 new products — data gathered via page fetch + cross-referenced web searches.
  Images are Pexels placeholders — replace with actual product images when available.

  Products:
  1.  LANDMADE   - 咖啡掛耳包（感心配方）Gift Blend Drip Bag
  2.  LANDMADE   - 咖啡掛耳包（甜美配方）Sweet Blend Drip Bag
  3.  LIWEI      - 李維配方豆 LIWEI Blend
  4.  LIWEI      - 東京配方豆 Tokyo Blend
  5.  ITUKA      - 台灣焙煎所 森之音配方 Forest Sound Blend
  6.  WAKOYA     - 金賞摩卡配方豆 Gold Medal Mocha Blend
  7.  WAKOYA     - 男子氣概配方豆 Odokomae Blend
  8.  Weekenders - 歌劇院配方豆 Opera Blend
  9.  TOKADO     - 豆香洞配方豆 TOKADO Blend
  10. Marumi     - 珈福配方豆 Happiness Blend
  11. Marumi     - 丸美配方豆 Marumi Blend
  12. MAME POLEPOLE - 兄弟配方豆 Ethiopian Brothers Blend
  13. MAME POLEPOLE - Gajumaru 配方豆 Gajumaru Blend
  14. Cerrado    - 2nd 配方豆 Coffee Blend 2nd
*/

DO $$
DECLARE
  v_cat    uuid;
  v_vendor uuid := '299e21b3-7527-4504-bc13-426771ff0fc0';
BEGIN
  SELECT id INTO v_cat FROM categories WHERE slug = 'coffee-beans';

  /* ── 1. LANDMADE Gift Blend Drip Bag ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'LANDMADE - 咖啡掛耳包（感心配方）Gift Blend',
    'LANDMADE 是日本神戶（港島, 中央區）的精品咖啡烘焙所，由上野真人（Masato Ueno）主理，以讓更多人接觸美味咖啡為使命，同時推動咖啡公益計畫。「感心配方」以深烘焙手法帶出濃郁巧克力的香甜感，搭配掛耳包的便利沖煮方式，適合作為禮物或日常饋贈——如其名，每一杯都讓人感動、感謝。成分組合未公開，適合偏好深焙甘甜口感的咖啡愛好者。',
    75,
    'https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'landmade-gift-blend-drip-bag',
    '配方豆（產地未公開）','深烘焙','未公開',
    ARRAY['巧克力','甜感'],
    10,ARRAY['日本','神戶','配方豆','掛耳包','LANDMADE','深烘焙','禮品','伴手禮'],
    'https://www.dlalshop.com/products/landmade-gift-blend-drip-bag'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/landmade-gift-blend-drip-bag');

  /* ── 2. LANDMADE Sweet Blend Drip Bag ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'LANDMADE - 咖啡掛耳包（甜美配方）Sweet Blend',
    'LANDMADE 精品咖啡烘焙所（日本神戶）的「甜美配方」掛耳包，以中烘焙呈現明亮果香系風格。草莓的甜酸、檸檬的清新酸質、白葡萄的輕盈果汁感，在杯中交織出活潑愉悅的飲用體驗。成分組合未公開，但風味輪廓清晰偏向淺中焙水果調，適合習慣手沖或喜愛花果系咖啡的飲者，掛耳包形式隨時隨地皆可輕鬆享用。',
    75,
    'https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'landmade-sweet-blend-drip-bag',
    '配方豆（產地未公開）','中烘焙','未公開',
    ARRAY['草莓','檸檬','白葡萄','果汁感'],
    10,ARRAY['日本','神戶','配方豆','掛耳包','LANDMADE','中烘焙','水果調'],
    'https://www.dlalshop.com/products/landmade-sweet-blend-drip-bag'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/landmade-sweet-blend-drip-bag');

  /* ── 3. LIWEI 李維配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'LIWEI - 李維配方豆 LIWEI Blend',
    'LIWEI Coffee Stand 是由台灣拿鐵藝術冠軍李維軒（2022 大阪拿鐵藝術錦標賽冠軍、2019 Verve Throwdown 冠軍）於 2020 年在東京高田馬場創立的自品牌咖啡烘焙所。李維軒親自挑豆、烘焙每一批豆款，配方精心調配為在家沖泡也能呈現咖啡館水準的口感。「李維配方豆」是招牌 Blend，也是品牌知名「黑拿鐵」（濃縮咖啡 + 台灣竹炭粉 + 奶泡）的基底豆。中深焙帶出果香的甜潤、焦糖牛奶的醇厚感，以及可可的深度，口感飽滿、層次豐富，是日常每天享用也不厭倦的配方風格。品牌組成未公開。',
    430,
    'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'liwei-liwei-blend',
    '配方豆（產地未公開）','中深焙','未公開',
    ARRAY['果香','焦糖牛奶','可可'],
    NULL,ARRAY['日本','東京','配方豆','LIWEI','中深焙','拿鐵藝術冠軍'],
    'https://www.dlalshop.com/products/liwei-liwei-blend',
    '2024-04-17'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/liwei-liwei-blend');

  /* ── 4. LIWEI 東京配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'LIWEI - 東京配方豆 Tokyo Blend',
    'LIWEI Coffee Stand（東京高田馬場）的「東京配方豆」是較高階的淺烘焙配方，風格鮮明區別於招牌的李維配方。創辦人李維軒以台灣出身、日本精品咖啡師的雙重視角調配，呈現充滿東京摩登感的花果系組合：百香果的熱帶果酸、水蜜桃的柔軟果甜，以及隱隱透出的桂花香氣——如同在東京街角品嚐一杯充滿細緻香氣的精品咖啡。淺烘焙凸顯豆款原始的清透果感，適合手沖，風味輪廓清亮細膩。品牌組成未公開。',
    510,
    'https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'liwei-tokyo-blend',
    '配方豆（產地未公開）','淺烘焙','未公開',
    ARRAY['百香果','桃子','桂花香'],
    NULL,ARRAY['日本','東京','配方豆','LIWEI','淺烘焙','花果調'],
    'https://www.dlalshop.com/products/liwei-tokyo-blend',
    '2024-07-10'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/liwei-tokyo-blend');

  /* ── 5. ITUKA 森之音配方 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'ITUKA 台灣焙煎所 - 森之音配方 Forest Sound Blend',
    'ITUKA（いつか珈琲屋）是日本神奈川縣平塚市的精品咖啡烘焙所，創立於 2004 年。前任首席烘豆師近藤圭（Kei Kondo）為 2016 年日本咖啡烘焙錦標賽（JCRC）冠軍，並在 2017 年世界咖啡烘焙錦標賽取得第 7 名，現由青山雄大（Yudai Aoyama）接手主理。使用 Fujiroyal R-105 5kg 半熱風烘豆機，常備 15 種以上豆款。「森之音配方」以哥倫比亞與衣索比亞雙產區搭配，中深焙帶出莓果香氣與柑橘明亮感，焦糖的溫潤甜意與牛奶巧克力的絲滑口感交融，是一款平衡而豐富的每日飲用配方。',
    620,
    'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'ituka-forest-sound-blend',
    '哥倫比亞 + 衣索比亞（兩產地配方）','中深焙','未公開',
    ARRAY['莓果香','柑橘','焦糖','牛奶巧克力'],
    NULL,ARRAY['日本','神奈川','配方豆','ITUKA','台灣焙煎所','中深焙','日本烘豆師','JCRC冠軍'],
    'https://www.dlalshop.com/products/ituka-forest-sound-blend',
    '2025-01-17'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/ituka-forest-sound-blend');

  /* ── 6. WAKOYA 金賞摩卡配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'WAKOYA 和珈屋 - 金賞摩卡配方豆 Gold Medal Mocha Blend',
    'WAKOYA（和珈屋）2013 年以此款配方豆在 ICT Asia（International Cafe Tasting Competition Asia）奪得金獎，是日本唯一獲獎的八個參賽國中脫穎而出的作品。WAKOYA 由兩位 Q Grader 資格持有者夫妻檔小林美和與小林慎也共同主理，2015 年日本烘豆大賽亞軍，2023 年巴拿馬烘豆大賽雙料冠軍。金賞摩卡配方以中烘焙呈現摩卡系的細膩花香為起點，清新柳橙果味引領入口，多汁的口感帶著扎實甜感，再轉入桃子與李子等核果調性，尾韻如飲清雅檸檬茶。杯感層次豐富且優雅，是 WAKOYA 人氣配方第二名。',
    670,
    'https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'wakoya-gold-medal-mocha-blend',
    '配方豆（產地未公開）','中烘焙','未公開',
    ARRAY['柳橙','花香','石頭水果','桃子','李子','檸檬茶'],
    NULL,ARRAY['日本','福井','配方豆','WAKOYA','和珈屋','中烘焙','摩卡配方','ICT金賞','日本烘豆師'],
    'https://www.dlalshop.com/products/wakaya-coffee-gold-medal-mocha-blend'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/wakaya-coffee-gold-medal-mocha-blend');

  /* ── 7. WAKOYA 男子氣概配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'WAKOYA 和珈屋 - 男子氣概配方豆 Odokomae Blend（男前ブレンド）',
    'WAKOYA（和珈屋）五大人氣配方第五名——「男前ブレンド」（男子氣概配方）。以中深焙帶出咖啡最雄渾的面貌：濃厚的巧克力感沉穩而飽滿，甜感在苦韻中緩緩浮現，整體風格平衡大方。如 WAKOYA 所描述：「這恰到好處的苦韻太棒了！」搭配濃郁巧克力甜食享用尤佳。對於習慣喝深焙咖啡的飲者，此款配方能在保有紮實苦韻之餘，帶來優雅的甜感層次。WAKOYA 創立於日本福井縣，由小林美和與小林慎也兩位 Q Grader 主理，2015 年日本烘豆大賽亞軍，2023 年巴拿馬烘豆大賽雙料冠軍。',
    530,
    'https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'wakoya-odokomae-blend',
    '配方豆（產地未公開）','中深焙','未公開',
    ARRAY['濃厚巧克力','甜感','平衡苦韻'],
    100,ARRAY['日本','福井','配方豆','WAKOYA','和珈屋','中深焙','男前ブレンド','深沉苦韻'],
    'https://www.dlalshop.com/products/wakaya-odokomae-blend',
    '2025-01-19'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/wakaya-odokomae-blend');

  /* ── 8. Weekenders 歌劇院配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'Weekenders Coffee - 歌劇院配方豆 Opera Blend',
    'Weekenders Coffee 是 2005 年由金子真宏（Masahiro Kaneko）與妻子亞由美（Ayumi）共同創立於日本京都的精品咖啡烘焙所，店址位於百年京都町家內，是全球精品咖啡愛好者的朝聖地之一，亦被列為世界前 50 大精品烘焙所。金子親自前往咖啡產地與農場主交流，深入理解豆款個性後方決定烘焙方式。「歌劇院配方豆」以法式甜點「Opera 蛋糕」（以濃郁巧克力與杏仁海綿蛋糕堆疊的經典法式甜點）為靈感：衣索比亞 40%、哥倫比亞 30%、肯亞 30% 三產地深烘焙，交織出黑巧克力的濃郁苦甘、奶油般的口感質地，以及冷卻後逐層釋放的複雜深度，猶如品嚐一塊精緻 Opera 蛋糕的層次體驗。',
    470,
    'https://images.pexels.com/photos/4109766/pexels-photo-4109766.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/4109766/pexels-photo-4109766.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'weekenders-opera-blend',
    '衣索比亞 40% + 哥倫比亞 30% + 肯亞 30%（三產地配方）',
    '深烘焙','未公開',
    ARRAY['黑巧克力','濃厚','奶油感','苦甘平衡'],
    200,ARRAY['日本','京都','配方豆','Weekenders','深烘焙','世界前50大烘焙所'],
    'https://www.dlalshop.com/products/weekenders-opera-blend'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/weekenders-opera-blend');

  /* ── 9. TOKADO 豆香洞配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url,roast_date)
  SELECT v_cat,v_vendor,
    'TOKADO - 豆香洞配方豆 TOKADO Blend',
    'TOKADO（豆香洞コーヒー）是日本福岡縣大野城市的傳奇精品咖啡烘焙所，由後藤直紀（Naoki Goto）於 2008 年創立。後藤師承東京 Café Bach 傳奇名師田口護，並於 2013 年成為迄今唯一的日本世界咖啡烘焙錦標賽（WCRC）冠軍，同時曾以此款豆出現在日本知名電視節目「松子不知道的世界」中大受關注。TOKADO 常備 9 款精心挑選的豆款，分別以不同火候獨立烘焙。「豆香洞配方豆」是品牌招牌配方，酸、甜、苦、香的絕妙平衡讓人百喝不厭；入口有優雅的芬芳香氣，風味清晰、層次豐富，是後藤多年烘焙工藝的精髓結晶，也是 TOKADO 最具代表性的作品。',
    1230,
    'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'tokado-tokado-blend',
    '配方豆（產地未公開）','中深焙','未公開',
    ARRAY['酸甜苦香完美綜合','優雅香氣','風味清晰','百喝不厭'],
    NULL,ARRAY['日本','福岡','配方豆','TOKADO','豆香洞','中深焙','世界烘豆冠軍','日本烘豆師'],
    'https://www.dlalshop.com/products/tokado-tokado-blend-1',
    '2025-08-16'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tokado-tokado-blend-1');

  /* ── 10. Marumi 珈福配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'Marumi Coffee 丸美 - 珈福配方豆 Happiness Blend（珈福ブレンド）',
    '丸美珈琲店（Marumi Coffee）是 2006 年成立於日本北海道札幌的精品咖啡烘焙所，主理人後藤榮二郎（Gotō Eijirō）為北海道第一位 CQI Q Grader，2013 年日本咖啡烘焙錦標賽冠軍、2014 年世界咖啡烘焙錦標賽第六名、2009 年世界杯測錦標賽季軍。每年親赴產地與農場主直接交流，以 Loring S35 Kestrel 35kg 烘豆機進行精準溫控，讓每款豆的甜感與香氣發揮至最大值。「珈福配方」名稱直接取自「咖啡（珈琲）帶來幸福（福）」的理念，後藤認為「咖啡存在的目的就是讓人幸福，每一杯都要帶來真心的微笑。」此款以衣索比亞、哥斯大黎加、宏都拉斯三產地調配，淺中焙帶出華麗的花果香氣，搭配醇厚的口感基底與細膩的水果微酸，適合品嚐咖啡的多元層次。',
    500,
    'https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/4109766/pexels-photo-4109766.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'marumi-happiness-blend',
    '衣索比亞 + 哥斯大黎加 + 宏都拉斯（三產地配方）',
    '淺中焙','未公開',
    ARRAY['華麗香氣','醇厚','水果微酸'],
    NULL,ARRAY['日本','北海道','札幌','配方豆','Marumi','丸美','淺中焙','JCRC冠軍','日本烘豆師'],
    'https://www.dlalshop.com/products/marumi-coffee-happiness-blend'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/marumi-coffee-happiness-blend');

  /* ── 11. Marumi 丸美配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'Marumi Coffee 丸美 - 丸美配方豆 Marumi Blend（丸美ブレンド）',
    '丸美珈琲店（Marumi Coffee，日本北海道札幌，2006年創立）的招牌配方豆。主理人後藤榮二郎以瓜地馬拉、哥斯大黎加、宏都拉斯三產地調配出圓潤均衡的中烘焙日常配方，如其品牌名「丸美」——「丸」代表圓滿完整，「美」代表美好。口感醇厚飽滿，風味平衡不偏激，每天飲用也不會感到厭倦。後藤的烘焙哲學著重在每款豆的甜感、香氣與細緻酸質的精準平衡，讓咖啡的美好觸手可及，獻給每一個尋求日常幸福感的咖啡愛好者。2013 年日本烘豆冠軍後藤榮二郎親自把關品質。',
    500,
    'https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'marumi-marumi-blend',
    '瓜地馬拉 + 哥斯大黎加 + 宏都拉斯（三產地配方）',
    '中烘焙','未公開',
    ARRAY['圓潤','醇厚','平衡','百喝不厭'],
    NULL,ARRAY['日本','北海道','札幌','配方豆','Marumi','丸美','中烘焙','日常配方','JCRC冠軍'],
    'https://www.dlalshop.com/products/marumi-coffee-marumi-blend'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/marumi-coffee-marumi-blend');

  /* ── 12. MAME POLEPOLE 兄弟配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    variety,flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'MAME POLEPOLE - 招牌衣索比亞 兄弟配方豆 Ethiopian Brothers Blend',
    'MAME POLEPOLE（豆ポレポレ）是 2012 年由中村義幸（Yoshiyuki Nakamura）在沖繩創立的精品咖啡烘焙所。品牌名結合日文「豆（Mame）」與史瓦希利語「Pole Pole（慢慢地）」，融合沖繩悠緩的時間感與咖啡發源地非洲的精神。中村 Q Grader 資格持有，更是日本咖啡烘豆錦標賽（JCRC）2017 年及 2022 年雙料冠軍，2018 年世界烘豆錦標賽亞軍，2023 年第四名。「兄弟配方豆」是 MAME POLEPOLE 的招牌衣索比亞 Blend——以深烘與淺烘的衣索比亞豆混調，讓兩種烘焙程度的個性互補共鳴：深焙帶來深度與甜潤，淺焙帶來明亮果香與清透感。全水洗處理，呈現柳橙、橘子的鮮活柑橘感，搭配紅茶的清雅韻味、牛奶巧克力的溫潤甜感，以及草莓的甜酸尾韻，是轉向精品咖啡的絕佳入門選擇。',
    650,
    'https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/2318745/pexels-photo-2318745.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'mame-polepole-ethiopian-brothers-blend',
    '衣索比亞（Ethiopia，深焙+淺焙混調）',
    '中烘焙','水洗',
    ARRAY['Heirloom','衣索比亞原生種'],
    ARRAY['柳橙','橘子','紅茶','牛奶巧克力','草莓'],
    NULL,ARRAY['日本','沖繩','配方豆','MAME POLEPOLE','豆ポレポレ','中烘焙','衣索比亞','JCRC雙料冠軍','水洗'],
    'https://www.dlalshop.com/products/mame-polepole-ethiopian-brothers-blend'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/mame-polepole-ethiopian-brothers-blend');

  /* ── 13. MAME POLEPOLE Gajumaru 配方豆 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'MAME POLEPOLE - 招牌 Gajumaru 配方豆 Gajumaru Blend（ガジュマルブレンド）',
    'MAME POLEPOLE（豆ポレポレ，沖繩，2012年）以店門前那棵具有象徵意義的「Gajumaru」（ガジュマル，榕樹）命名此款招牌深焙配方。榕樹在沖繩文化中象徵守護與社群，是老店的精神圖騰。以印尼與巴西的豆款為基底深烘焙，呈現月桂葉的草本香氣、辛香料的複雜層次、深邃的巧克力感，以及雪松木的清爽尾韻——是 MAME POLEPOLE 整個產品線中烘焙最深的配方，也是中村推薦給初訪、偏好深焙苦韻的客人的首選。香氣豐富、風格獨特，充分展現深烘焙的大氣魄。',
    580,
    'https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'mame-polepole-gajumaru-blend',
    '印尼 + 巴西（兩產地配方）',
    '深烘焙','未公開',
    ARRAY['月桂','辛香料','巧克力','雪松'],
    NULL,ARRAY['日本','沖繩','配方豆','MAME POLEPOLE','豆ポレポレ','深烘焙','印尼','巴西','JCRC雙料冠軍'],
    'https://www.dlalshop.com/products/mame-polepole-gajumaru-blend'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/mame-polepole-gajumaru-blend');

  /* ── 14. Cerrado Coffee Blend 2nd ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_cat,v_vendor,
    'Cerrado - 2nd 配方豆 Coffee Blend 2nd',
    'Cerrado 咖啡（沖繩，1986年創立，2015年轉型精品烘焙零售）第二款配方豆。2nd 配方專為「不偏好深焙」的飲者設計，是 Cerrado 烘豆師末吉成仁在深焙 Blend 1st 之外開創的中烘焙路線。以衣索比亞、哥倫比亞、宏都拉斯、巴西四大產區調配，中烘焙保留各產區的原始甜感與個性：入口純淨清透，口感滑順溫潤，隨溫度冷卻仍保持美味一致性——這是此款最獨特之處，適合慢慢品飲、感受風味如何隨溫度演變。末吉的理念是「只要多一點技巧，咖啡就能變得無比美味」，2nd 配方正是這個哲學的日常實踐。',
    490,
    'https://images.pexels.com/photos/4109766/pexels-photo-4109766.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/4109766/pexels-photo-4109766.jpeg?auto=compress&cs=tinysrgb&w=1200","https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'cerrado-coffee-blend-2nd',
    '衣索比亞 + 哥倫比亞 + 宏都拉斯 + 巴西（四產地配方）',
    '中烘焙','未公開',
    ARRAY['純淨','口感滑順溫潤','冷卻仍保持美味'],
    NULL,ARRAY['日本','沖繩','配方豆','Cerrado','中烘焙','四產地配方','日常配方'],
    'https://www.dlalshop.com/products/cerrado-coffee-blend-the-2nd'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/cerrado-coffee-blend-the-2nd');

END $$;
