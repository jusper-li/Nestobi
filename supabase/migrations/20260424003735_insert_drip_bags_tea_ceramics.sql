/*
  # Insert Drip Bags, Tea Products, and Ceramic Art Cups

  Source: https://www.dlalshop.com/categories/all-brands (page 1, missing items)
  Data gathered via page fetch + cross-referenced web searches.
  Images are Pexels placeholders — replace with actual product images when available.

  Products (10):
  1.  WAKOYA    - 咖啡掛耳包（金賞摩卡配方）Gold Medal Mocha Drip Bag
  2.  WAKOYA    - 咖啡掛耳包（和珈屋配方）WAKOYA Blend Drip Bag
  3.  LiLo      - 咖啡掛耳包（黑色深烘焙）Dark Roast Drip Bag
  4.  LiLo      - 咖啡掛耳包（紅色中烘焙）Medium Roast Drip Bag
  5.  LiLo      - 咖啡掛耳包（藍色淺烘焙）Light Roast Drip Bag
  6.  茶根本    - 南投 杉林溪 輕焙烏龍茶
  7.  Rootopia  - 手沖精品茶禮盒
  8.  茶根本    - 京坪茶聚禮盒（袋茶Ver.）NT$1,799
  9.  今村能章  - 陶藝厚金裏濃縮杯 宍 Shishi
  10. 今村能章  - 陶藝人臉金裏小杯 墨 Sumi
*/

DO $$
DECLARE
  v_coffee  uuid;
  v_tea     uuid;
  v_art     uuid;
  v_vendor  uuid := '299e21b3-7527-4504-bc13-426771ff0fc0';
BEGIN
  SELECT id INTO v_coffee FROM categories WHERE slug = 'coffee-beans';
  SELECT id INTO v_tea    FROM categories WHERE slug = 'local-food';
  SELECT id INTO v_art    FROM categories WHERE slug = 'cultural-art';

  /* ── 1. WAKOYA Drip Bag Gold Medal Mocha ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_coffee,v_vendor,
    'WAKOYA 和珈屋 - 咖啡掛耳包（金賞摩卡配方）Gold Medal Mocha Drip Bag',
    'WAKOYA（和珈屋，日本福井）每年銷售超過 6 萬包掛耳咖啡。此款以 2013 年 ICT Asia 國際咖啡品鑑大賽金獎配方製成，日本八個參賽國中唯一獲金獎的作品。金賞摩卡配方以中烘焙呈現摩卡系花香為開場，清新柳橙與多汁甜感引導，轉為桃子、李子等核果調性，收尾如清雅檸檬茶——層次豐富、優雅迷人。掛耳包便利沖煮，讓精品咖啡隨時隨地觸手可及。',
    70,
    'https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'wakoya-drip-bag-gold-medal-mocha',
    '配方豆（產地未公開）','中烘焙','未公開',
    ARRAY['柳橙','花香','桃子','李子','檸檬茶'],
    10,ARRAY['日本','福井','WAKOYA','和珈屋','掛耳包','中烘焙','ICT金賞','摩卡配方'],
    'https://www.dlalshop.com/products/wakaya-drip-bag-wakoya-blend-1'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/wakaya-drip-bag-wakoya-blend-1');

  /* ── 2. WAKOYA Drip Bag WAKOYA Blend ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_coffee,v_vendor,
    'WAKOYA 和珈屋 - 咖啡掛耳包（和珈屋配方 感謝圖示）WAKOYA Blend Drip Bag',
    'WAKOYA（和珈屋）掛耳包人氣 No.1 暢銷款。「感謝圖示」版本採用特別感謝圖樣包裝，是品牌年銷 6 萬包系列的核心商品。和珈屋配方（こくまろブレンド）以醇厚滑順、香氣宜人為設計目標，甜感飽滿、尾韻舒適。首次品嚐 WAKOYA 的顧客常以「從未喝過這樣甜的咖啡」來形容第一口感受。掛耳包適合旅行攜帶、作為禮品，或日常居家享用精品咖啡體驗的絕佳入門選擇。',
    70,
    'https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1251175/pexels-photo-1251175.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'wakoya-drip-bag-wakoya-blend',
    '配方豆（產地未公開）','中烘焙','未公開',
    ARRAY['醇厚','滑順','香氣宜人','甜感飽滿','尾韻舒適'],
    10,ARRAY['日本','福井','WAKOYA','和珈屋','掛耳包','中烘焙','人氣No.1'],
    'https://www.dlalshop.com/products/wakaya-drip-bag-wakoya-blend'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/wakaya-drip-bag-wakoya-blend');

  /* ── 3. LiLo Drip Bag Dark Roast Black ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_coffee,v_vendor,
    'LiLo - 咖啡掛耳包（黑色深烘焙｜堅果巧克力調）Dark Roast Drip Bag',
    'LiLo Coffee Roasters（2014 年創立於日本大阪美國村，曾獲 2019 年亞洲 50 大咖啡店）的深烘焙掛耳包系列。黑色包裝代表深烘焙等級，風味以堅果與巧克力調為主軸，濃郁厚實。豆款依批次輪換，可能來自印尼、東帝汶、緬甸或烏干達等產地；深烘焙帶出每款豆的醇厚甜苦韻。適合喜好濃郁、傳統咖啡風格的飲者，也是冷萃或美式咖啡的絕佳選擇。',
    70,
    'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'lilo-drip-bag-dark-roast-black',
    '印尼 / 東帝汶 / 緬甸 / 烏干達（依批次輪換）','深烘焙','依批次',
    ARRAY['堅果','巧克力'],
    10,ARRAY['日本','大阪','LiLo','掛耳包','深烘焙','堅果巧克力'],
    'https://www.dlalshop.com/products/drip-bag-dark-roasted-black'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/drip-bag-dark-roasted-black');

  /* ── 4. LiLo Drip Bag Medium Roast Red ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_coffee,v_vendor,
    'LiLo - 咖啡掛耳包（紅色中烘焙｜焦糖可可調）Medium Roast Drip Bag',
    'LiLo Coffee Roasters（日本大阪，2014年）中烘焙掛耳包，紅色包裝代表中烘焙等級。焦糖與可可的甜潤組合，平衡地銜接深焙的厚重與淺焙的清亮，是最受大眾歡迎的入門風格。豆款依批次輪換，通常來自宏都拉斯、衣索比亞、巴西等產地，確保每次都能嚐到中烘焙最圓潤的面貌。',
    70,
    'https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/585753/pexels-photo-585753.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'lilo-drip-bag-medium-roast-red',
    '宏都拉斯 / 衣索比亞 / 巴西（依批次輪換）','中烘焙','依批次',
    ARRAY['焦糖','可可'],
    10,ARRAY['日本','大阪','LiLo','掛耳包','中烘焙','焦糖可可'],
    'https://www.dlalshop.com/products/drip-bag-medium-roasted-red'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/drip-bag-medium-roasted-red');

  /* ── 5. LiLo Drip Bag Light Roast Blue ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,roast_level,processing_method,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_coffee,v_vendor,
    'LiLo - 咖啡掛耳包（藍色淺烘焙｜花香果香調）Light Roast Drip Bag',
    'LiLo Coffee Roasters（日本大阪，2014年）淺烘焙掛耳包，藍色包裝代表淺烘焙等級。花香與果香的輕盈明亮調性，最能展現精品咖啡原始的清透風土。豆款依批次輪換，通常選用衣索比亞、盧安達、哥斯大黎加等以花果調著稱的產區。猶如一杯帶著茉莉花茶、伯爵茶或熱帶水果輕盈感的特殊飲品，是精品咖啡入門者轉換觀念的最佳起點。',
    70,
    'https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/942771/pexels-photo-942771.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'lilo-drip-bag-light-roast-blue',
    '衣索比亞 / 盧安達 / 哥斯大黎加（依批次輪換）','淺烘焙','依批次',
    ARRAY['花香','果香','輕盈明亮'],
    10,ARRAY['日本','大阪','LiLo','掛耳包','淺烘焙','花香果香'],
    'https://www.dlalshop.com/products/lilo-drip-pack-light-roast'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/lilo-drip-pack-light-roast');

  /* ── 6. 茶根本 南投杉林溪輕焙烏龍茶 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    '茶根本 Tea at All - 南投 杉林溪 輕焙烏龍茶',
    '「茶根本」（Tea at All）是 DLAL 自創的台日精品茶策展品牌，以精品咖啡的嚴選視角挑選台灣與日本頂級茶品。此款選自南投縣竹山鎮杉林溪（Shanlinxi / Sun Link Sea）茶區，海拔約 1,800m，年均溫 12°C，日夜溫差大、常年雲霧繚繞，是台灣高山烏龍的著名產地。以青心烏龍品種製成，輕焙保留茶葉最細膩的山林氣息：花香怡人、帶有杉木與松針的清新調性，以及綿長甘甜的尾韻。3g 隨身茶包，方便沖泡，單包至大盒多種規格選擇。',
    65,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    30,true,'tea-at-all-shanlinxi-oolong',
    '台灣 南投縣 竹山鎮 杉林溪（海拔約 1,800m）',
    ARRAY['花香','杉木','松針清新','甘甜尾韻'],
    3,ARRAY['台灣','南投','杉林溪','烏龍茶','茶根本','高山茶','輕焙','精品茶'],
    'https://www.dlalshop.com/products/tea-at-all-nantou-sun-link-sea-light-roasted-oolong-tea'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tea-at-all-nantou-sun-link-sea-light-roasted-oolong-tea');

  /* ── 7. Rootopia 手沖精品茶禮盒 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    'Rootopia - 手沖精品茶禮盒 Pour Over Premium Tea Gift Box',
    'Rootopia（Root + Utopia）是 DLAL 與 Rootopia Café 跨界合作的精品茶系列，將精品咖啡的手沖萃取方式應用於台灣高山茶，顛覆傳統泡茶方式。不同於茶包，此系列採用細顆粒茶粉，以手沖濾杯萃取，茶水比約 1:70–72，呈現單次萃取的清透茶湯與一致風味。禮盒內含隨機六款台灣精品茶：含平林文山包種、桃園蘆竹英香烏龍、花蓮瑞穗柚香烏龍、三峽蜜香紅茶、和平梨山高山烏龍、台東鹿野紅烏龍、東方美人、柚子碧螺春等輪換。適合精品咖啡愛好者探索台灣茶，或作為特色伴手禮。',
    70,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'rootopia-pour-over-tea',
    '台灣多產區（依禮盒組合輪換）',
    ARRAY['多款台灣精品茶輪換','清透茶湯'],
    NULL,ARRAY['台灣','精品茶','手沖茶','Rootopia','禮盒','伴手禮','台灣高山茶'],
    'https://www.dlalshop.com/products/rootopia-pour-over-tea'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/rootopia-pour-over-tea');

  /* ── 8. 茶根本 京坪茶聚禮盒（袋茶 NT$1,799）── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,origin,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_tea,v_vendor,
    '茶根本 Tea at All - 京坪茶聚禮盒（袋茶版）Jingping Tea Gathering Gift Box',
    '「京坪」是「京都」與「坪林」的複合命名，將日本千年茶都與台灣頂級綠茶鄉串聯。此禮盒為茶根本與日本京都百年茶舖「北川半兵衛」及台灣坪林冠宇茶的三方聯名。禮盒內容（袋茶版）：北川半兵衛「懷古」抹茶粉 40g（原裝錫罐）、北川半兵衛麥茶立體茶包 2.5g×3、北川半兵衛玄米茶立體茶包 2.5g×3、坪林冠宇文山包種茶立體茶包 2.5g×3、坪林冠宇東方美人茶立體茶包 2.5g×3，附 LED 燈飾一個。適合作為精緻禮品，呈現台日茶文化的深厚底蘊。',
    1799,
    'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'tea-at-all-jingping-gift-box-1799',
    '台灣坪林 + 日本京都（台日聯名）',
    ARRAY['抹茶','玄米茶','麥茶','文山包種茶','東方美人茶'],
    NULL,ARRAY['台灣','坪林','日本','京都','茶根本','禮盒','北川半兵衛','聯名','高端禮品'],
    'https://www.dlalshop.com/products/tea-at-all-gift-box-light-1'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/tea-at-all-gift-box-light-1');

  /* ── 9. 今村能章 Shishi 陶藝濃縮杯 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_art,v_vendor,
    '今村能章 - 陶藝厚金裏濃縮杯 宍 Shishi（含手工皮套）',
    '今村能章（Imamura Yoshiaki，1984年生，兵庫縣）畢業於沖繩縣立藝術大學陶藝研究所，2013 年在沖繩成立工作室「studioooparts」，現兼任大學講師。不使用傳統沖繩陶土或薪窯，以 1,300°C 高溫燒製，刻意讓窯變化學反應主導釉面生成——他稱之為「陶土與火焰之間的煉金術」。2022 年作品獲義大利精品集團 Bottega Veneta 指定選用。無把手設計讓飲者以掌心感受陶器質地，致敬日本茶道的握杯哲學，專為義式濃縮咖啡體驗重新詮釋。「宍（Shishi）」是日語中「肌肉/肉身」之意，指陶器本體的質感與重量。此件厚金裏款重 124.6g，外觀以噴漆橘色漸層呈現，金色內釉光澤溫潤。附訂製手工皮製保護套。每件均為世一無二的手工創作，不適用任何折扣。',
    18850,
    'https://images.pexels.com/photos/6205765/pexels-photo-6205765.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/6205765/pexels-photo-6205765.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'imamura-art-cup-shishi',
    NULL,125,ARRAY['日本','沖繩','陶藝','今村能章','濃縮杯','手工藝術','Bottega Veneta','限量','金裏'],
    'https://www.dlalshop.com/products/imamura-yoshiaki-art-cups-shishi-20250122-16'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/imamura-yoshiaki-art-cups-shishi-20250122-16');

  /* ── 10. 今村能章 Sumi 陶藝人臉小杯 ── */
  INSERT INTO products (category_id,vendor_id,name,description,price,image_url,images,
    stock_quantity,is_active,sku,
    flavor_notes,weight_grams,tags,source_url)
  SELECT v_art,v_vendor,
    '今村能章 - 陶藝人臉金裏小杯 墨 Sumi（含手工皮套）',
    '今村能章沖繩陶藝工作室「studioooparts」作品。「墨（Sumi）」以墨汁深黑為色彩靈感，此件人臉系列小杯為今村在東日本大震災後以哲思為核心發展的創作線——人臉表情隨觀看角度不同而改變，寓意人的複雜性與情感流動。重 66.7g，金色內釉，深邃墨黑外表。無把手設計，手捧時感受陶器的重量與溫度，如同日本茶道精神在當代咖啡器物中的延續。附訂製手工皮製保護套。每件均為世界上唯一的手工創作，不適用任何折扣。',
    17850,
    'https://images.pexels.com/photos/6205765/pexels-photo-6205765.jpeg?auto=compress&cs=tinysrgb&w=1200',
    '["https://images.pexels.com/photos/6205765/pexels-photo-6205765.jpeg?auto=compress&cs=tinysrgb&w=1200"]'::jsonb,
    0,true,'imamura-art-cup-sumi',
    NULL,67,ARRAY['日本','沖繩','陶藝','今村能章','小杯','手工藝術','人臉系列','限量','金裏'],
    'https://www.dlalshop.com/products/imamura-yoshiaki-art-cups-sumi-20250122-17'
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE source_url='https://www.dlalshop.com/products/imamura-yoshiaki-art-cups-sumi-20250122-17');

END $$;
