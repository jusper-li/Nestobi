/*
  # Sync 咖啡旅行家 Blog — Category Fix + 27 New Articles

  ## Summary
  1. Fixes existing blog post categories to match BlogList.tsx tab labels
     - 旅遊美食 → 美食探索
     - 咖啡知識 → 咖啡旅行
  2. Inserts 27 new articles from 咖啡旅行家・Hola I'm Ryoko vocus.cc salon
     across all 5 categories: 咖啡旅行, 旅遊指南, 美食探索, 住宿推薦, 旅行日記

  ## Categories Used
  - 咖啡旅行 — coffee shop guides and equipment
  - 旅遊指南 — destination guides and travel tips
  - 美食探索 — food and dining recommendations
  - 住宿推薦 — hotel and accommodation
  - 旅行日記 — artisan stories and travel journals
*/

-- 1. Fix existing category labels
UPDATE blog_posts SET category = '美食探索' WHERE category = '旅遊美食';
UPDATE blog_posts SET category = '咖啡旅行' WHERE category = '咖啡知識';

-- 2. Insert new articles (skip if slug already exists)

-- ===== 咖啡旅行 =====

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '神戶咖啡推薦8選｜在地咖啡師最愛的精品咖啡廳',
  'kobe-coffee-8-recommendations',
  '神戶是日本最早接觸西方文化的港口城市，咖啡文化歷史悠久。本篇整理8家在地咖啡師強烈推薦的神戶精品咖啡廳，從老鋪到新銳，帶您感受神戶獨特的咖啡文化。',
  $html$<article>
<p>神戶自明治時代起就是重要的貿易港口，西方文化隨船舶進入這座城市，其中也包括了咖啡文化。今天的神戶擁有特別成熟的咖啡場景，在地咖啡師對品質有著嚴格堅持。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="神戶咖啡廳" /></figure>

<h2>神戶咖啡文化的特色</h2>
<p>相較於東京的前衛、京都的傳統，神戶的咖啡文化帶有一種優雅的港口氣質。許多店家承接了關西對品質的執著，同時融入神戶獨特的異國情調。</p>

<h2>推薦8家咖啡廳</h2>

<h3>1. TOOTH TOOTH maison 15e</h3>
<p>神戶最具代表性的複合式咖啡空間，位於北野坂洋館街區，以法式建築風格打造優雅的咖啡體驗。使用精選單品豆，搭配自製甜點，是神戶咖啡必訪地標。</p>

<h3>2. カフェ・ド・ムッシュ（Café de Monsieur）</h3>
<p>神戶元町的老鋪咖啡廳，已有40年以上歷史。堅持使用傳統的虹吸式咖啡壺萃取，豆子全部自家烘焙，咖啡香氣濃郁層次豐富。</p>

<h3>3. にしむら珈琲店</h3>
<p>創立於1948年的神戶老鋪，是神戶咖啡文化的象徵。門市遍佈神戶多處，以其深焙咖啡和精緻和果子組合聞名，咖啡在這裡是一種生活儀式。</p>

<h3>4. FUGLEN KOBE</h3>
<p>來自挪威奧斯陸的知名咖啡品牌，神戶店座落於北野異人館街區，以淺焙北歐風格精品咖啡為主，空間設計融合60年代北歐復古風格，是城中最受歡迎的打卡點之一。</p>

<h3>5. Hira Coffee Factory</h3>
<p>神戶在地咖啡師自創品牌，以直接貿易（Direct Trade）精神選豆，與咖啡產地農場建立長期合作關係。淺焙為主，展現原產地豐富的水果及花香風味。</p>

<h3>6. BERTH COFFEE</h3>
<p>港口區的精品咖啡廳，充滿航海風格的裝潢呼應神戶港口精神。主打多元萃取方式，提供手沖、愛樂壓、義式等不同選擇，讓客人親眼目睹咖啡製作過程。</p>

<h3>7. Coffee Potohoto</h3>
<p>隱身於住宅區的小型自家烘焙咖啡廳，在咖啡愛好者圈子中口耳相傳。老闆對生豆品質有嚴格篩選標準，僅使用最頂級的精品生豆進行小批量烘焙。</p>

<h3>8. The Cup Coffee</h3>
<p>兼具咖啡教育功能的複合式咖啡店，定期舉辦品飲課程和烘焙工作坊，是深入了解咖啡知識的絕佳場所，也是神戶精品咖啡社群聚集的重要據點。</p>
</article>$html$,
  'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['神戶','日本咖啡','精品咖啡','咖啡廳推薦','關西旅遊'],
  '咖啡旅行',
  'published',
  '神戶在地咖啡師最愛的8家精品咖啡廳，從明治老鋪到北歐風格新銳，感受神戶獨特的咖啡文化。',
  '2024-07-23 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'kobe-coffee-8-recommendations');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩南部推薦咖啡廳10選｜那霸周邊不可錯過的精品咖啡',
  'okinawa-south-coffee-10',
  '沖繩南部以那霸為中心，咖啡廳雲集。本篇精選10家南部不可錯過的精品咖啡廳，包含老城區的隱藏名店、美麗海景咖啡廳，以及融合琉球文化的特色咖啡空間。',
  $html$<article>
<p>沖繩南部以那霸為中心，從國際通到糸滿，再到豐見城，分布著許多獨特的咖啡廳。南部地區因靠近那霸機場，是許多旅人旅途中的必訪之地。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="沖繩咖啡廳" /></figure>

<h2>南部咖啡廳推薦10選</h2>

<h3>1. 豆波波 MAMEBOBO — 浦添市</h3>
<p>沖繩最具代表性的精品咖啡店，老闆為日本烘焙大賽冠軍、世界盃亞軍。使用世界頂級生豆，以精確的烘焙曲線展現每支豆子的最佳風味。淺焙為主，花香果香層次豐富，是沖繩咖啡迷的朝聖地。</p>

<h3>2. ELEPHANT CAFE — 那霸</h3>
<p>位於壺屋陶藝街的特色咖啡廳，以進口印度象形藝品裝點空間，提供精品單品咖啡搭配自製甜點。店內氛圍悠閒，是逛完國際通後休憩的絕佳選擇。</p>

<h3>3. Coffee potohoto — 那霸</h3>
<p>靜謐住宅區的自家烘焙咖啡廳，深受在地咖啡愛好者喜愛。以手沖為主，豆款不多但每一支都精心挑選，店主對品質的堅持令人印象深刻。</p>

<h3>4. CAFE TSUBOYA — 壺屋</h3>
<p>融入琉球傳統陶藝文化的獨特咖啡廳，咖啡杯皆使用當地陶藝家手作器皿，喝一杯咖啡也是一次文化體驗。附近的壺屋燒窯街更是藝術愛好者的天堂。</p>

<h3>5. 珈琲倶楽部 — 糸満市</h3>
<p>傳承40年以上的老鋪咖啡廳，堅持傳統日式虹吸式萃取，深焙豆款散發濃郁奶油香氣。搭配自製的沖繩黑糖蛋糕，是懷舊風格的完美組合。</p>

<h3>6. ZHYVAGO COFFEE WORKS OKINAWA — 那霸</h3>
<p>澳洲系精品咖啡廳，主打海島悠閒咖啡風格。使用澳洲精選豆款，提供義式和手沖選項，空間設計融合熱帶植栽，彷彿置身澳洲海濱城市。</p>

<h3>7. MORIHICO COFFEE OKINAWA — 那霸</h3>
<p>來自北海道的知名精品咖啡品牌，沖繩店坐落於熱鬧的松尾地區。以中深焙豆款為主，平衡圓潤的風味廣受大眾喜愛，自製咖啡豆磅蛋糕也是招牌點心。</p>

<h3>8. 浜辺の茶屋 — 南城市</h3>
<p>沖繩最知名的海景咖啡廳之一，位於百名海灘附近，漲潮時彷彿漂浮在海面上。雖以觀光為主，但咖啡品質也不馬虎，在此欣賞琉球藍海是無可取代的體驗。</p>

<h3>9. 山之茶屋・楽水 — 南城市</h3>
<p>隱藏在南城市山間的世外桃源，穿越竹林小徑後豁然開朗，茅草屋頂的傳統建築搭配周邊蒼翠山景，提供手沖咖啡和沖繩傳統茶點，是療癒身心的完美之地。</p>

<h3>10. ZEN CAFE — 那霸</h3>
<p>以禪意為主題的靜謐咖啡空間，提供精品咖啡搭配日式和菓子。簡約的設計語言讓人在繁忙的旅途中沉澱心靈，是那霸市區難得的靜謐角落。</p>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','咖啡廳','那霸','南部','精品咖啡'],
  '咖啡旅行',
  'published',
  '沖繩南部那霸周邊10家精品咖啡廳推薦，從冠軍烘豆師到海景咖啡廳，絕不錯過的沖繩咖啡體驗。',
  '2024-07-21 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-south-coffee-10');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩中部推薦咖啡廳10選｜恩納、北谷、沖繩市精品咖啡地圖',
  'okinawa-central-coffee-10',
  '沖繩中部涵蓋恩納度假區、美國村所在的北谷町，以及沖繩市，是介於那霸與北部之間的重要旅遊帶。本篇精選10家中部精品咖啡廳，帶您探索這區域獨特的咖啡場景。',
  $html$<article>
<p>沖繩中部地區受美軍基地文化影響深遠，形成了獨特的多元文化融合氛圍，咖啡文化也因此展現出與南部、北部截然不同的面貌。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="沖繩中部咖啡廳" /></figure>

<h2>中部咖啡廳推薦10選</h2>

<h3>1. CAFE CAHAYA — 恩納村</h3>
<p>坐落於恩納村山丘上的隱世咖啡廳，俯瞰東海的絕美海景讓人屏息。提供精選精品豆手沖咖啡，搭配以沖繩在地食材製作的自製甜點，週末常需提前訂位。</p>

<h3>2. ZHYVAGO COFFEE WORKS — 北谷</h3>
<p>澳洲系咖啡廳在北谷美國村的旗艦店，工業風裝潢與熱帶植栽的完美結合。提供義式咖啡和手沖兩條路線，Cold Brew冷萃咖啡尤其受到歡迎。</p>

<h3>3. TRANSIT CAFE — 宜野灣</h3>
<p>兼具閱讀空間與咖啡廳功能的文化複合式空間，大量原木和書架打造出溫馨的知性氛圍。使用自家烘焙豆款，咖啡風味穩定紮實。</p>

<h3>4. 万座ビーチコーヒー — 恩納</h3>
<p>萬座海灘旁的海景咖啡廳，坐在戶外露台看著沖繩湛藍海水喝一杯冰咖啡，是炎熱夏日最消暑的享受。</p>

<h3>5. COMMON GROUNDS — 沖繩市</h3>
<p>沖繩市的人氣精品咖啡廳，主理人曾在東京精品咖啡廳修業後回鄉創業。以嚴選豆款的手沖聞名，烘焙程度從淺到深均有，讓客人依喜好選擇。</p>

<h3>6. ROOTS COFFEE — 北谷</h3>
<p>在北谷咖啡圈中頗具聲望的自家烘焙咖啡廳，使用直接貿易生豆，展現明亮的淺焙果香風味。空間寬敞舒適，適合長時間停留工作或閱讀。</p>

<h3>7. SEA SIDE CAFE LANI — 恩納</h3>
<p>直接面向大海的露天咖啡廳，沙灘、棕櫚樹與藍天白雲構成一幅完美的沖繩風景畫。在此品嚐一杯冰拿鐵，看著浪花拍打白沙灘，是旅途中最療癒的時光。</p>

<h3>8. ISLAND COFFEE — 北谷</h3>
<p>以夏威夷海島風格為主題的咖啡廳，提供夏威夷可那咖啡豆及沖繩本地豆款，是少數能同時嚐到這兩種島嶼咖啡的店家。</p>

<h3>9. POKCOFFEE — 宜野灣</h3>
<p>小而精緻的獨立咖啡廳，店主專注於展現不同產地的咖啡個性。提供詳細的豆款介紹，對咖啡知識有深度說明，適合想深入了解精品咖啡的旅人。</p>

<h3>10. HARBOR VIEW COFFEE — 中城</h3>
<p>位於中城港灣旁的咖啡廳，港口的船隻往來是這裡獨特的風景。提供輕食和咖啡，是中部旅途中休息補給的理想中繼站。</p>
</article>$html$,
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','中部','恩納','北谷','咖啡廳','美國村'],
  '咖啡旅行',
  'published',
  '沖繩中部恩納、北谷、沖繩市10家精品咖啡廳推薦，多元文化孕育的獨特咖啡場景。',
  '2024-07-08 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-central-coffee-10');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩北部推薦咖啡廳6選｜名護、今歸仁、本部半島隱藏名店',
  'okinawa-north-coffee-6',
  '沖繩北部以美麗的自然景觀聞名，山原（ヤンバル）的原始森林與清澈海灣孕育了與南部截然不同的咖啡文化。本篇精選6家北部特色咖啡廳，帶您遠離塵囂，感受沖繩最純粹的田野氣息。',
  $html$<article>
<p>沖繩北部，又稱山原地區（ヤンバル），以壯麗的亞熱帶原始森林、繁星密布的夜空以及清澈透明的海灣聞名。在這裡，時間似乎過得特別緩慢，咖啡廳也呼應著這種節奏。</p>
<figure><img src="https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg" alt="沖繩北部咖啡廳" /></figure>

<h2>北部咖啡廳推薦6選</h2>

<h3>1. CAFE ichara — 本部町</h3>
<p>位於本部半島的古民家改建咖啡廳，距離美麗海水族館約10分鐘車程。以沖繩傳統紅瓦屋頂為特色，院子裡的亞熱帶花園讓人心曠神怡。提供精品咖啡搭配沖繩食材製作的輕食。</p>

<h3>2. OKASHI goten CAFE — 名護市</h3>
<p>由名護在地甜點職人開設的咖啡廳，以使用沖繩黑糖和島香料製作的手工甜點聞名。咖啡選用精品豆手沖，搭配黑糖磅蛋糕是這裡的招牌組合。</p>

<h3>3. 喜瀬別邸KISE COFFEE — 名護市</h3>
<p>度假莊園內的咖啡空間，面向東海的露天座位可欣賞碧藍海景。使用自家嚴選豆款，提供義式咖啡和手沖兩種選項，適合悠閒地享受北部度假時光。</p>

<h3>4. NAMINOUE COFFEE — 今歸仁村</h3>
<p>今歸仁城跡附近的小型咖啡廳，古城遺址的壯闊歷史感與細膩的咖啡香氣形成奇妙對比。使用當地農家直送的農產品製作甜點，展現北部土地的豐饒。</p>

<h3>5. MOUNTAIN INN YANBARU — 大宜味村</h3>
<p>深藏山原森林中的山間咖啡廳，前往途中需穿越蜿蜒山路，但到達後的豁然開朗讓人忘卻一切疲憊。提供來自世界各地的精品豆手沖，在鳥鳴蟲聲伴奏下品嚐咖啡，是難忘的體驗。</p>

<h3>6. CAFE Cajufish — 恩納村北部</h3>
<p>面向沖繩最美珊瑚礁海域的海景咖啡廳，清澈的海水可直接從座位清楚看到海底珊瑚。以沖繩本地豆和進口精品豆提供多元選擇，是北部旅途中最值得停留的風景據點。</p>
</article>$html$,
  'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','北部','名護','本部','山原','咖啡廳'],
  '咖啡旅行',
  'published',
  '沖繩北部名護、今歸仁、本部6家隱藏咖啡廳，原始自然景觀中品嚐精品咖啡的絕佳體驗。',
  '2024-07-02 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-north-coffee-6');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩咖啡廳我的12家愛店｜在沖生活10年咖啡旅行家的私藏清單',
  'okinawa-coffee-12-favorites',
  '在沖繩生活超過10年的咖啡旅行家Ryoko，走遍全島大小咖啡廳後，整理出這份最私藏的12家愛店清單。不只是推薦，更是每一家都有真實感情的深度分享。',
  $html$<article>
<p>在沖繩生活了超過10年，走遍全島各個角落尋找好咖啡，喝過的咖啡廳多到記不清。今天整理的這12家，不只是「好喝」，而是每一家都讓我留下深刻記憶的私藏愛店。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="沖繩咖啡廳私藏清單" /></figure>

<h2>我的沖繩咖啡廳12家愛店</h2>

<h3>1. 豆波波 — 浦添市（我的第一名）</h3>
<p>不需要太多介紹，豆波波就是沖繩精品咖啡的代名詞。老闆豆波波さん曾獲日本烘豆大賽冠軍、世界盃亞軍，每一杯咖啡都是藝術品。第一次喝到他的衣索比亞耶加雪菲，真的震撼了我對咖啡的所有認知。</p>

<h3>2. Coffee Potohoto — 那霸</h3>
<p>第一次去是朋友帶的，完全沒有任何招牌，如果不知道根本不會發現。小小的空間裡只有幾張椅子，但每一杯咖啡都讓人想一喝再喝。店主對豆款的挑剔程度令人敬佩。</p>

<h3>3. ELEPHANT CAFE — 那霸</h3>
<p>壺屋陶藝街旁的療癒小店，從外觀到內裝都充滿了藝術氣息。印度風格的裝飾和沖繩文化形成有趣的對話，咖啡搭配陶藝器皿，每一次造訪都有不同感受。</p>

<h3>4. 浜辺の茶屋 — 南城市</h3>
<p>這家海景咖啡廳太有名了，漲潮時真的就像漂浮在海上。雖然觀光客很多，但每次帶外地朋友來，看到他們的驚嘆表情，就覺得值得。</p>

<h3>5. CAFE ichara — 本部町</h3>
<p>古民家改建的咖啡廳，院子裡有一棵大榕樹撐起整個空間。每次開車北上必停，點一杯手沖坐在樹蔭下，時間就這樣悄悄溜走了。</p>

<h3>6. ZHYVAGO COFFEE WORKS — 北谷</h3>
<p>這裡的Cold Brew是我在沖繩喝過最好的冷萃咖啡。空間很大，不管是一個人工作還是和朋友聊天都很適合，是我工作時最常去的咖啡廳。</p>

<h3>7. 山之茶屋・楽水 — 南城市</h3>
<p>穿過竹林小徑走進去，看到茅草屋頂的那一刻，整個人都放鬆了。在這裡喝咖啡聽著風吹竹葉的聲音，是沖繩旅行中最療癒的片段之一。</p>

<h3>8. COMMON GROUNDS — 沖繩市</h3>
<p>老闆從東京精品咖啡廳修業回來後創業，對咖啡有著深刻的理解和熱情。每次去都能和他聊咖啡聊得停不下來，豆款選擇也非常精彩。</p>

<h3>9. CAFE CAHAYA — 恩納村</h3>
<p>山上的隱世咖啡廳，開車上去的山路讓人有點忐忑，但看到那片一望無際的東海，立刻覺得一切都值得了。</p>

<h3>10. TRANSIT CAFE — 宜野灣</h3>
<p>有點像是我的書房，每次在這裡讀書、工作都非常有效率。咖啡穩定好喝，空間安靜舒適，是我在沖繩的秘密基地。</p>

<h3>11. 喜瀬別邸KISE COFFEE — 名護市</h3>
<p>度假莊園的咖啡廳，有那種讓人完全放鬆下來的魔力。面向東海的露天座位，搭配一杯精品拿鐵，是北部旅途最完美的中場休息。</p>

<h3>12. SEA SIDE CAFE LANI — 恩納</h3>
<p>沙灘旁的露天咖啡廳，夏天在這裡喝冰咖啡看海，是沖繩生活中最讓我感到幸福的日常小事。</p>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','咖啡廳','愛店','在沖生活','精品咖啡','旅遊推薦'],
  '咖啡旅行',
  'published',
  '在沖繩生活10年的咖啡旅行家Ryoko私藏12家愛店，有故事有感情的真實推薦。',
  '2024-07-01 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-coffee-12-favorites');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '咖啡養豆完全指南｜為什麼剛烘好的咖啡豆不能馬上喝？',
  'coffee-bean-resting-guide',
  '你有沒有買過剛烘好的咖啡豆，卻發現味道怪怪的？其實這是因為豆子還沒「養好」。本篇深入解析咖啡養豆的科學原理，告訴你不同烘焙程度的豆子分別需要靜置多少時間。',
  $html$<article>
<p>「這包豆子剛烘好的，應該最新鮮吧？」——這是許多咖啡初學者常有的誤解。事實上，剛出爐的咖啡豆就像剛出爐的麵包，需要稍微冷卻和靜置，才能展現最佳風味。</p>
<figure><img src="https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg" alt="咖啡養豆" /></figure>

<h2>什麼是「養豆」？</h2>
<p>養豆（Degassing/Rest），是指咖啡豆在烘焙後，讓豆子中的二氧化碳（CO₂）慢慢釋放的過程。烘焙過程中，高溫讓豆子產生大量的CO₂氣體，這些氣體若沒有適度排出，會干擾熱水與咖啡粉的萃取接觸，導致味道不穩定甚至帶有尖銳酸味。</p>

<h2>養豆的科學原理</h2>
<p>咖啡豆烘焙完成後，豆子細胞結構中封存了大量CO₂。當你研磨豆子後會看到明顯的「悶蒸」現象（咖啡粉接觸熱水後膨脹冒泡），這就是CO₂排出的表現。過多的CO₂會阻礙萃取，讓咖啡喝起來有一股刺鼻的生澀感。</p>

<h2>不同烘焙程度的養豆時間建議</h2>
<ul>
<li><strong>淺焙豆（Light Roast）</strong>：建議養豆7-14天以上。淺焙豆CO₂含量較高，且豆子結構較為緊密，需要更長時間讓氣體充分排出。花香、果酸等精緻風味在充分養豆後才會完整展現。</li>
<li><strong>中焙豆（Medium Roast）</strong>：建議養豆5-10天。中焙豆在風味複雜度和CO₂排放速度之間取得平衡，養豆後甜感和醇厚感會明顯提升。</li>
<li><strong>深焙豆（Dark Roast）</strong>：建議養豆3-7天。深焙豆的細胞組織被更徹底地破壞，CO₂排放速度較快，但也更容易氧化，需要在最佳飲用期（烘焙後2-4週）內盡快喝完。</li>
</ul>

<h2>如何判斷養豆是否完成？</h2>
<p>最簡單的方法是觀察悶蒸反應。用手沖方式沖泡時，注水後觀察咖啡粉層的膨脹和冒泡情況：
若冒泡劇烈且咖啡粉表面起伏明顯，表示仍在排氣中，可以再多養幾天。
若冒泡輕微且均勻，表示豆子已達到最佳狀態。</p>

<h2>正確的養豆保存方式</h2>
<p>養豆期間，建議將豆子放在有單向排氣閥的密封袋或密封罐中，置於陰涼避光的地方。切勿在養豆期間放入冰箱，因為冰箱的低溫會大幅減慢CO₂排放速度，同時可能讓豆子吸附冰箱的異味。</p>

<h2>小結</h2>
<p>新鮮≠剛烘好。真正的新鮮，是在最佳飲用期（烘焙後2-4週）內，適當養豆後飲用。下次買到剛出爐的咖啡豆，不妨耐心等待幾天，讓豆子自然呼吸，你將會嚐到完全不同層次的風味體驗。</p>
</article>$html$,
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['咖啡知識','養豆','新鮮咖啡豆','手沖咖啡','排氣'],
  '咖啡旅行',
  'published',
  '咖啡養豆完全指南：了解不同烘焙程度需要多少靜置時間，以及正確的保存方式，讓每一杯咖啡都展現最佳風味。',
  '2024-01-24 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'coffee-bean-resting-guide');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '咖啡豆正確保存方法｜常溫還是冷藏？密封罐還是夾鏈袋？',
  'coffee-bean-storage-guide',
  '咖啡豆應該放冰箱嗎？買回來的咖啡豆要怎麼保存才能維持最佳風味？本篇用科學角度解析咖啡豆保存的正確方式，破解常見的保存迷思。',
  $html$<article>
<p>「咖啡豆要放冰箱嗎？」是我被問到最多次的咖啡問題之一。答案並不是非黑即白，讓我們從科學角度來分析咖啡豆的正確保存方式。</p>
<figure><img src="https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg" alt="咖啡豆保存" /></figure>

<h2>影響咖啡豆風味的四大天敵</h2>
<ol>
<li><strong>氧氣</strong>：咖啡豆接觸氧氣後會氧化，風味劣化速度加快。</li>
<li><strong>光線</strong>：紫外線會加速咖啡豆的化學反應，加速變質。</li>
<li><strong>濕氣</strong>：咖啡豆容易吸收環境中的水分，影響研磨和萃取品質。</li>
<li><strong>熱度</strong>：高溫環境會加速咖啡豆氧化和揮發性香氣的散失。</li>
</ol>

<h2>常溫保存 vs. 冷藏保存</h2>
<h3>常溫保存（推薦）</h3>
<p>對於在2-3週內會喝完的咖啡豆，常溫保存是最好的選擇。將豆子放在有單向排氣閥的密封袋，或密封性良好的玻璃罐，置於陰涼、避光、乾燥的地方。</p>
<h3>冷凍保存（長期保存使用）</h3>
<p>如果一次購買大量豆子短期無法喝完（超過1個月），可以考慮冷凍保存。但必須分裝成小份（一次喝完的量），每份獨立密封後放入冷凍庫。取出時不可反覆進出冷凍庫，應待其回溫至室溫再開封研磨。</p>
<h3>為什麼不建議冷藏？</h3>
<p>冷藏環境溫度在0-5°C，是凝結點附近的危險區間。每次從冰箱取出咖啡豆，豆子表面會因溫差產生凝結水，這些水分會影響咖啡豆品質，長期下來得不償失。</p>

<h2>推薦的保存容器</h2>
<ul>
<li><strong>有單向排氣閥的密封袋</strong>：最方便的選擇，能讓CO₂排出但阻擋氧氣進入。</li>
<li><strong>Airscape不鏽鋼密封罐</strong>：可以手動排出空氣，是咖啡愛好者的熱門選擇。</li>
<li><strong>Fellow Atmos真空密封罐</strong>：旋轉即可抽真空，設計精美，保鮮效果出色。</li>
</ul>

<h2>最佳飲用期建議</h2>
<ul>
<li>淺焙豆：烘焙後7天-4週</li>
<li>中焙豆：烘焙後5天-3週</li>
<li>深焙豆：烘焙後3天-2週</li>
</ul>
<p>超過建議期限並非不能飲用，但風味已開始下降。建議小量多次購買，而非一次大量囤貨。</p>
</article>$html$,
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['咖啡豆保存','冷藏咖啡豆','密封罐','咖啡知識','新鮮度'],
  '咖啡旅行',
  'published',
  '咖啡豆正確保存方法完整攻略：常溫vs冷藏的科學分析，推薦保存容器，以及最佳飲用期間建議。',
  '2023-12-01 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'coffee-bean-storage-guide');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  'Kalita Wave 155/185手沖電熱壺評測｜日本設計獎得主，手沖新手最推薦',
  'kalita-wave-kettle-review',
  'Kalita是日本咖啡器具的代表品牌之一，其手沖電熱壺以精準的溫控功能和優雅的設計廣受好評，更獲得日本設計大獎肯定。本篇詳細評測Kalita電熱壺的實際使用體驗。',
  $html$<article>
<p>手沖咖啡的品質受到許多因素影響，而「水溫控制」是最關鍵的一環。水溫過高會過度萃取，帶來苦澀；水溫過低則萃取不足，咖啡味道淡薄。Kalita的電熱壺解決了這個問題。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="Kalita手沖電熱壺" /></figure>

<h2>Kalita品牌介紹</h2>
<p>Kalita創立於1958年，是日本歷史最悠久的咖啡器具品牌之一。以其獨特的「三孔濾杯」設計聞名於世，近年來在精品咖啡圈中更是備受推崇。</p>

<h2>Kalita電熱壺的特色</h2>
<ul>
<li><strong>精準溫控</strong>：可設定40°C到100°C，以1°C為單位調整，讓你精準控制萃取溫度。</li>
<li><strong>保溫功能</strong>：設定溫度後自動保溫，整個沖泡過程中水溫保持穩定。</li>
<li><strong>細嘴設計</strong>：特殊設計的細嘴讓注水更穩定，便於控制注水速度和水流方向。</li>
<li><strong>獲獎設計</strong>：榮獲日本Good Design Award，外型兼顧美學與實用性。</li>
</ul>

<h2>實際使用體驗</h2>
<p>使用Kalita電熱壺最大的改變，是讓我對手沖咖啡有了更多掌控感。以前用普通水壺，每次水溫都不固定，咖啡品質忽好忽壞。有了溫控壺之後，每次沖泡的結果明顯更穩定。</p>

<h2>哪個型號適合你？</h2>
<p>Kalita電熱壺有多種容量可選：</p>
<ul>
<li>0.6L：適合1-2人份，下班後獨自沖一杯</li>
<li>1.0L：適合2-4人份，有客人時使用</li>
<li>1.2L：大容量版本，適合咖啡愛好者或辦公室使用</li>
</ul>

<h2>手沖溫度建議</h2>
<ul>
<li>淺焙豆：90-93°C（展現細膩果酸和花香）</li>
<li>中焙豆：88-92°C（平衡甜感與酸度）</li>
<li>深焙豆：83-88°C（避免過萃，保留醇厚感）</li>
</ul>
</article>$html$,
  'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['Kalita','電熱壺','手沖咖啡','咖啡器具','溫控壺'],
  '咖啡旅行',
  'published',
  'Kalita手沖電熱壺完整評測：溫控精準、設計獲獎，手沖新手和進階玩家都適合的咖啡器具推薦。',
  '2023-11-10 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'kalita-wave-kettle-review');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '日本ORIGAMI摺紙濾杯｜職人手工陶瓷，可搭配多種濾紙的創新設計',
  'origami-dripper-review',
  'ORIGAMI濾杯來自日本岐阜縣的老牌陶瓷產地，以其獨特的摺紙造型和多功能性征服了世界各地的咖啡愛好者。這款職人手工陶瓷濾杯，究竟有什麼獨特之處？',
  $html$<article>
<p>在眾多手沖濾杯中，日本ORIGAMI濾杯以其驚豔的外型和靈活的功能性脫穎而出。這款來自岐阜縣美濃燒產地的手工陶瓷濾杯，不只是咖啡器具，更是一件藝術品。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="ORIGAMI摺紙濾杯" /></figure>

<h2>ORIGAMI濾杯的誕生</h2>
<p>ORIGAMI濾杯由日本岐阜縣土岐市的陶瓷工廠製作，靈感來自日本傳統折紙藝術。濾杯表面的20道凹槽（ridges）模仿折紙的立體結構，不只是美觀，更有重要的功能意義。</p>

<h2>獨特的20道凹槽設計</h2>
<p>這20道凹槽的主要功能是：
在濾紙和濾杯壁之間保留空氣流通空間，讓咖啡粉均勻排氣，同時讓沖泡水流能穩定均勻地通過，避免通道效應（Channeling）。這種設計讓ORIGAMI的萃取均勻度比許多同類濾杯更高。</p>

<h2>最大特色：相容多種濾紙</h2>
<p>ORIGAMI最革命性的設計是它可以搭配多種形狀的濾紙使用：</p>
<ul>
<li>錐形濾紙（如Hario V60）：強調清晰的酸度和明亮口感</li>
<li>波形濾紙（如Kalita Wave）：增加均勻萃取，口感圓潤</li>
<li>扇形濾紙（傳統梯形）：適合追求厚重醇度的萃取</li>
</ul>
<p>一個濾杯搭配不同濾紙，就能得到截然不同的風味體驗，CP值極高。</p>

<h2>顏色選擇</h2>
<p>ORIGAMI濾杯有超過10種顏色可選，每件都由職人手工上釉，因此每一個都是獨一無二的。從經典白色、霧面黑，到活潑的紅、藍、綠，適合不同空間風格和個人喜好。</p>

<h2>使用心得</h2>
<p>我使用ORIGAMI搭配Hario V60濾紙沖泡衣索比亞淺焙豆，花香和莓果香氣非常清晰，是我試過各種濾杯組合中表現最亮眼的。如果你想同時擁有美觀的器具和出色的咖啡品質，ORIGAMI絕對值得投資。</p>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['ORIGAMI','濾杯','手沖咖啡','日本咖啡器具','陶瓷濾杯'],
  '咖啡旅行',
  'published',
  'ORIGAMI摺紙濾杯完整介紹：日本職人手工陶瓷，20道凹槽設計，可搭配多種濾紙的創新咖啡器具評測。',
  '2023-09-09 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'origami-dripper-review');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  'HARIO V60濾杯為什麼叫「V60」？完整使用指南',
  'hario-v60-complete-guide',
  'HARIO V60是全球最知名的手沖濾杯之一，但你知道「V60」這個名字代表什麼意思嗎？本篇從命名由來到正確使用方法，帶你全面了解這款改變了世界咖啡文化的日本濾杯。',
  $html$<article>
<p>如果你問一個精品咖啡愛好者：「最具代表性的手沖濾杯是什麼？」十有八九會回答：HARIO V60。但你知道這個名字背後的含義嗎？</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="HARIO V60濾杯" /></figure>

<h2>V60名字的由來</h2>
<p>「V」代表英文字母V，形容濾杯的錐形（V形）結構；「60」則是這個錐形的角度——60度。這個60度的設計並非隨意，而是經過HARIO工程師大量測試後找到的最佳角度，能讓熱水以最理想的速度和流向通過咖啡粉層，實現均勻萃取。</p>

<h2>HARIO品牌歷史</h2>
<p>HARIO創立於1921年，原本是生產耐熱玻璃的工廠。直到1980年代才開始踏入咖啡器具領域，V60於2004年正式推出，徹底改變了精品咖啡的手沖文化，並在世界各地的咖啡師競賽中被廣泛採用。</p>

<h2>V60的設計特點</h2>
<ul>
<li><strong>單孔大洞</strong>：底部只有一個大孔，萃取速度完全由沖泡者控制，靈活性高。</li>
<li><strong>螺旋肋骨</strong>：內壁的螺旋紋路讓空氣順暢排出，避免濾紙緊貼濾杯造成萃取不均。</li>
<li><strong>60度錐形</strong>：最佳化的水流角度，確保熱水均勻接觸全部咖啡粉。</li>
</ul>

<h2>材質選擇</h2>
<ul>
<li><strong>陶瓷</strong>：保溫性最好，是手沖愛好者的首選，但較重易碎。</li>
<li><strong>玻璃</strong>：可看清楚萃取過程，保溫性次之，清洗方便。</li>
<li><strong>金屬（不鏽鋼/銅）</strong>：耐用不易摔壞，適合旅行使用。</li>
<li><strong>塑膠</strong>：最輕便且實惠，適合初學者嘗試。</li>
</ul>

<h2>基本沖泡參數建議</h2>
<ul>
<li>粉水比：1:15（15g咖啡粉搭配225ml水）</li>
<li>水溫：88-93°C（依烘焙程度調整）</li>
<li>研磨粗細：中細研磨（類似精鹽粗細）</li>
<li>總沖泡時間：2分30秒至3分30秒</li>
</ul>
</article>$html$,
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['HARIO V60','手沖咖啡','濾杯','咖啡器具','手沖教學'],
  '咖啡旅行',
  'published',
  'HARIO V60完整指南：從命名由來到正確使用方法，帶你全面了解全球最知名手沖濾杯的所有秘密。',
  '2023-06-27 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'hario-v60-complete-guide');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '日本最熱門電動磨豆機Varia VS3｜設計獎得主，靜電少噪音低的全能磨豆機',
  'varia-vs3-grinder-review',
  'Varia VS3是近年來在日本精品咖啡圈引發話題的電動磨豆機，以其出色的研磨均勻度、低靜電設計和獲獎外型在市場上脫穎而出。適合家用手沖咖啡的進階升級選擇。',
  $html$<article>
<p>磨豆機是影響咖啡品質最重要的器具之一，卻也是很多人升級最晚的一環。如果你還在用手搖磨豆機，或是使用超市的廉價電磨，你的咖啡品質還有很大的提升空間。Varia VS3就是這個升級的理想選擇。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="Varia VS3磨豆機" /></figure>

<h2>Varia品牌介紹</h2>
<p>Varia是澳洲品牌，以設計精品咖啡器具起家。VS3是他們旗下最受歡迎的電動磨豆機，「VS」代表Variable Speed（可調速），「3」則代表三種使用模式（手沖、義式、Espresso）。</p>

<h2>核心技術：60mm平刀刀盤</h2>
<p>VS3使用60mm的平刀刀盤（Flat Burr），這是精品咖啡界公認最能展現咖啡風味複雜度的刀盤類型。相較於錐刀刀盤，平刀研磨的咖啡粉粒徑分布更均勻，萃取更穩定，更能清晰展現花香、果酸等細膩風味。</p>

<h2>低靜電設計</h2>
<p>電動磨豆機最令人困擾的問題之一就是靜電——研磨後咖啡粉會因靜電到處飛散，弄髒操作台。VS3採用特殊的接地設計，大幅降低靜電問題，讓研磨過程更整潔。</p>

<h2>可調速設計（RPM控制）</h2>
<p>VS3可以調整刀盤轉速（RPM），低速研磨可減少熱量產生，保護咖啡粉中的揮發性香氣不受高溫破壞；高速則可提高效率。手沖建議使用低速，義式可以使用高速。</p>

<h2>設計獎項</h2>
<p>VS3榮獲2022年Red Dot設計獎，其流線型的啞光黑色機身和精心設計的操作介面，讓它在咖啡吧台上既是器具也是藝術品。</p>

<h2>適合誰？</h2>
<ul>
<li>從手搖磨豆機升級電磨的用戶</li>
<li>追求手沖咖啡品質提升的愛好者</li>
<li>同時想兼顧義式和手沖的玩家</li>
<li>重視廚房美觀的咖啡愛好者</li>
</ul>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['Varia VS3','磨豆機','電動磨豆機','咖啡器具','手沖咖啡'],
  '咖啡旅行',
  'published',
  'Varia VS3電動磨豆機完整評測：60mm平刀刀盤、低靜電設計、紅點設計獎得主，手沖咖啡愛好者的理想升級選擇。',
  '2023-06-21 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'varia-vs3-grinder-review');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '咖啡常見迷思與疑慮解析｜6個你可能搞錯了的咖啡知識',
  'coffee-myths-debunked',
  '咖啡世界充滿了各種說法，有些是真知識，有些其實是誤解。本篇整理6個最常見的咖啡迷思，用科學角度幫你釐清真相，讓你對咖啡有更正確的認識。',
  $html$<article>
<p>開始深入學習咖啡之後，發現很多流傳已久的「咖啡常識」其實是誤解。今天整理6個最常見的咖啡迷思，逐一破解。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="咖啡迷思" /></figure>

<h2>迷思1：深焙咖啡因比淺焙多</h2>
<p><strong>真相：淺焙咖啡因含量略高於深焙。</strong>烘焙過程中，咖啡因在高溫下會逐漸分解，因此烘焙程度越深，咖啡因含量略微下降。但兩者差異其實不大，影響咖啡因含量更大的因素是咖啡豆種類（阿拉比卡vs羅布斯塔）和沖泡時間。</p>

<h2>迷思2：義式濃縮咖啡因最多</h2>
<p><strong>真相：義式濃縮單份咖啡因含量比一杯手沖咖啡少。</strong>雖然Espresso濃度高，但每份只有30ml，咖啡粉用量也較少，所以咖啡因總量其實低於一杯200ml的手沖咖啡（大約少30-50%）。</p>

<h2>迷思3：速溶咖啡不含真正的咖啡</h2>
<p><strong>真相：速溶咖啡是由真正的咖啡液乾燥製成的。</strong>速溶咖啡的製作過程是：先沖泡出大量咖啡液，再用噴霧乾燥或冷凍乾燥技術將水分去除，得到粉末。所以它確實是由真正的咖啡製成，只是過程中損失了許多細膩的揮發性香氣。</p>

<h2>迷思4：咖啡豆越新鮮越好喝</h2>
<p><strong>真相：剛烘好的豆子需要養豆，不是越新鮮越好。</strong>烘焙後的咖啡豆需要7-14天的「養豆期」讓CO₂充分排出，這段時間的豆子反而沖泡效果不佳。真正的黃金飲用期是烘焙後2-4週。</p>

<h2>迷思5：黑咖啡有助瘦身</h2>
<p><strong>真相：咖啡本身幾乎無熱量，但不是減肥神器。</strong>黑咖啡的確熱量極低（每杯約5大卡），且咖啡因可以短暫提升基礎代謝率。但長期飲用並沒有顯著的減肥效果，睡前飲用反而可能因睡眠品質下降而影響代謝。</p>

<h2>迷思6：咖啡讓人脫水</h2>
<p><strong>真相：一般飲用量的咖啡不會導致脫水。</strong>雖然咖啡因有輕微的利尿效果，但咖啡中的水分足以抵消這個效果。研究顯示，在正常飲用量下（每天3-4杯），咖啡可以計入每日水分攝取量中。</p>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['咖啡迷思','咖啡知識','咖啡因','咖啡常識','飲食知識'],
  '咖啡旅行',
  'published',
  '咖啡6大常見迷思破解：深焙咖啡因最多？義式咖啡因最多？用科學角度釐清你對咖啡的誤解。',
  '2023-06-18 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'coffee-myths-debunked');

-- ===== 旅遊指南 =====

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩咖啡廳85家完整名單2024｜精品、傳統、現代全分類',
  'okinawa-coffee-85-list-2024',
  '在沖繩生活多年的咖啡旅行家Ryoko整理了全沖繩85家值得造訪的咖啡廳，分為精品咖啡廳、傳統喫茶店和現代風格三大類，附上地區分佈地圖，是你規劃沖繩咖啡之旅的最完整參考。',
  $html$<article>
<p>這是我花了超過10年時間，走遍沖繩各個角落後整理出來的85家咖啡廳完整名單。從那霸的都市咖啡廳到北部山原的隱世小店，從百年喫茶老鋪到最新銳的精品咖啡廳，全部收錄在這裡。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="沖繩咖啡廳地圖" /></figure>

<h2>分類說明</h2>
<h3>Type A — 精品咖啡廳（Specialty Coffee）</h3>
<p>使用高品質精品豆，重視從產地到杯中每個環節，多有自家烘焙或與優質烘豆商合作。</p>
<h3>Type B — 傳統喫茶店（Traditional Kissaten）</h3>
<p>延續日本傳統喫茶店文化，多使用虹吸壺或滴漏式萃取，深焙豆為主，承載著老沖繩的生活情懷。</p>
<h3>Type C — 現代風格咖啡廳（Modern Cafe）</h3>
<p>重視空間設計和整體體驗，咖啡品質雖不一定達到精品咖啡標準，但環境舒適、適合社交聚會或長時間停留。</p>

<h2>南部（那霸・糸満・南城）— 共32家</h2>
<p>南部是沖繩咖啡密度最高的地區，集中了全島最多的精品咖啡廳。以那霸為中心，從國際通周邊到古城壺屋，再到南城市的海景咖啡廳，豐富多元。</p>
<p><strong>精品代表</strong>：豆波波、Coffee Potohoto、ZHYVAGO COFFEE WORKS、MORIHICO COFFEE</p>
<p><strong>傳統代表</strong>：珈琲倶楽部、首里珈琲、むかしむかし</p>
<p><strong>景觀代表</strong>：浜辺の茶屋（漲潮時漂浮感海景）、山之茶屋楽水（竹林山景）</p>

<h2>中部（恩納・北谷・沖繩市・宜野灣）— 共28家</h2>
<p>受美軍基地文化影響，中部咖啡廳呈現最多元的面貌。北谷美國村一帶聚集了許多具有異國風情的咖啡廳，恩納則以海景咖啡廳著稱。</p>
<p><strong>精品代表</strong>：COMMON GROUNDS、ROOTS COFFEE、POKCOFFEE</p>
<p><strong>海景代表</strong>：CAFE CAHAYA、SEA SIDE CAFE LANI</p>

<h2>北部（名護・本部・今歸仁・山原）— 共18家</h2>
<p>北部咖啡廳數量較少但各有特色，多藏身於自然景觀之中。訪客需要開車深入才能發現這些隱世名店，但這正是北部咖啡旅行的魅力所在。</p>

<h2>離島（石垣・宮古・西表・久米）— 共7家</h2>
<p>離島的咖啡廳因地制宜，多融入當地獨特的島嶼文化和食材，是相對小眾但值得專程造訪的咖啡體驗。</p>

<h2>如何使用這份名單</h2>
<p>建議依照旅程的地理位置規劃每日的咖啡廳行程，避免在同一天跑太多不同區域。沖繩幅員不大但公共交通有限，建議租車自駕，才能靈活探訪各地咖啡廳。</p>
</article>$html$,
  'https://images.pexels.com/photos/590478/pexels-photo-590478.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩咖啡廳','完整名單','旅遊攻略','精品咖啡','沖繩旅遊'],
  '旅遊指南',
  'published',
  '沖繩85家咖啡廳完整名單2024，精品、傳統、現代三大分類，南部、中部、北部、離島全地區收錄，規劃沖繩咖啡旅行的最完整參考。',
  '2024-07-22 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-coffee-85-list-2024');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '購買夏威夷可那咖啡完整指南｜真偽辨別、推薦店家與Island Vintage Coffee',
  'hawaii-kona-coffee-buying-guide',
  '夏威夷可那（Kona）咖啡是全球最昂貴的咖啡之一，但市面上充斥著大量假冒品。本篇教你如何辨別真正的可那咖啡，並推薦在夏威夷當地值得購買的咖啡品牌和咖啡廳體驗。',
  $html$<article>
<p>夏威夷大島可那地區生產的咖啡，長期以高品質和稀少供應量著稱，價格高居全球咖啡市場前列。正因如此，市面上出現了大量以「Kona Blend」為名、實際含量極低的混充品。</p>
<figure><img src="https://images.pexels.com/photos/590478/pexels-photo-590478.jpeg" alt="夏威夷可那咖啡" /></figure>

<h2>什麼是正宗的可那咖啡？</h2>
<p>正宗的可那咖啡指的是：種植於夏威夷大島可那地區（Kona District），包含北可那和南可那兩個行政區，海拔300-900公尺的火山斜坡上種植的阿拉比卡豆種。可那地區獨特的氣候條件——早上陽光充足，下午雲霧遮蔽，有助於咖啡豆緩慢均勻地成熟。</p>

<h2>如何辨別真假可那咖啡？</h2>
<ul>
<li><strong>看標籤</strong>：真正的可那咖啡標籤上應標示「100% Kona Coffee」，若寫「Kona Blend」則含量可能只有10%</li>
<li><strong>看農場名稱</strong>：正宗可那咖啡通常標注具體農場名稱（Farm Name）</li>
<li><strong>看價格</strong>：真正的可那咖啡每磅售價在$30-60美元以上，過便宜要小心</li>
<li><strong>看認證</strong>：夏威夷農業部有提供可那咖啡的真偽認證系統</li>
</ul>

<h2>推薦在地購買地點</h2>
<h3>Island Vintage Coffee</h3>
<p>位於威基基海灘旁Royal Hawaiian Center的知名咖啡廳，是夏威夷觀光客必訪的咖啡聖地。提供100%可那咖啡和Maui、Kauai等其他夏威夷島嶼豆款，現場也有精緻的甜點和輕食可搭配。建議在此點一杯可那拿鐵，感受正宗的夏威夷咖啡體驗。</p>

<h3>Greenwell Farms直售農場</h3>
<p>大島上的老牌可那咖啡農場，提供農場參觀（免費）和現場試飲，是最直接了解可那咖啡生產過程的方式，也是購買正宗農場直出咖啡豆的最佳管道。</p>

<h3>Heavenly Hawaiian Farms</h3>
<p>以有機農法種植的可那咖啡農場，提供多種烘焙程度選擇，並有網路訂購服務，可以回台灣後繼續購買喜愛的豆款。</p>

<h2>可那咖啡的風味特色</h2>
<p>正宗可那咖啡以其溫和、甜美的風味著稱，沒有強烈的酸度或苦味，帶有堅果和奶油般的香氣，以及微微的巧克力和熱帶水果後韻。口感圓潤順滑，是非常適合咖啡初學者和不喜歡強烈酸味的飲用者的選擇。</p>
</article>$html$,
  'https://images.pexels.com/photos/590478/pexels-photo-590478.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['夏威夷咖啡','可那咖啡','Kona','咖啡購買指南','海外咖啡'],
  '旅遊指南',
  'published',
  '夏威夷可那咖啡完整購買指南：如何辨別真假、推薦購買地點，以及Island Vintage Coffee實際體驗分享。',
  '2023-06-24 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'hawaii-kona-coffee-buying-guide');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '星宇航空史努比聯名SNOOPY彩繪機｜全球首架Peanuts主題飛機體驗',
  'starlux-snoopy-peanuts-plane',
  '2024年6月，星宇航空推出全球首架以Peanuts卡通為主題的聯名彩繪機，機艙內外充滿史努比和他的朋友們的可愛圖案。本篇分享搭乘體驗和所有聯名周邊資訊。',
  $html$<article>
<p>2024年6月15日，台灣航空公司星宇航空（STARLUX Airlines）正式推出全球第一架以Peanuts（史努比）為主題的商業聯名彩繪機。這個消息一出立刻在台灣引發話題，許多旅客特地為了這架飛機安排旅程。</p>
<figure><img src="https://images.pexels.com/photos/590478/pexels-photo-590478.jpeg" alt="星宇航空史努比彩繪機" /></figure>

<h2>聯名計畫詳情</h2>
<p>這次聯名的靈感來自星宇航空創辦人張國煒對Peanuts卡通的個人喜愛。整架飛機外觀以史努比、查理布朗（Charlie Brown）、薩奇（Snoopy）及其他Peanuts角色裝飾，機體的星宇藍搭配卡通黃，視覺效果非常搶眼。</p>

<h2>聯名時間</h2>
<p>首架彩繪機於2024年6月15日開始服役，預計運營至2024年10月31日，共飛行約4個半月。飛行路線涵蓋星宇航空的主要航線，包括台北到東京、大阪、名古屋、首爾等亞洲各地。</p>

<h2>機艙內的Peanuts體驗</h2>
<p>不只是外觀，機艙內部同樣充滿Peanuts元素：</p>
<ul>
<li>頭枕套、毛毯上印有史努比圖案</li>
<li>機上餐點特製史努比版包裝</li>
<li>登機證和行李牌設計成Peanuts限定版</li>
<li>空服員配戴史努比主題徽章</li>
</ul>

<h2>聯名周邊商品</h2>
<p>配合這次聯名，星宇航空推出了一系列限定周邊商品，包括：Peanuts x STARLUX聯名托特包、史努比版行李牌組、限定版明信片組、徽章套組等，全數在星宇官網和機場免稅店販售，開賣後旋即售罄。</p>

<h2>如何確保搭到史努比彩繪機？</h2>
<p>目前沒有官方方式確保搭到聯名彩繪機，因為同一航班可能由不同飛機執飛。建議在購票後持續關注星宇官方社群媒體，通常在飛行前一天會公告當日飛行的機型和機號。也可以透過Flight Radar24等航班追蹤App查詢史努比彩繪機的即時位置。</p>
</article>$html$,
  'https://images.pexels.com/photos/590478/pexels-photo-590478.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['星宇航空','史努比','Peanuts','彩繪機','台灣航空'],
  '旅遊指南',
  'published',
  '星宇航空全球首架Peanuts史努比彩繪機完整體驗：機艙內外的聯名設計、限定周邊商品，以及如何確保搭上這架話題飛機的攻略。',
  '2024-06-28 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'starlux-snoopy-peanuts-plane');

-- ===== 美食探索 =====

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩最好吃舒芙蕾鬆餅3選｜Halekulani沖繩、幸せのパンケーキ、FLIPPER''S',
  'okinawa-souffle-pancake-3-best',
  '舒芙蕾鬆餅在沖繩掀起一股熱潮，本篇精選3家沖繩最值得排隊的舒芙蕾鬆餅店，比較各家的鬆軟度、風味和性價比，找出最值得去的一家。',
  $html$<article>
<p>鬆軟如雲的舒芙蕾鬆餅（Soufflé Pancake）是近年在日本最受歡迎的甜點之一。沖繩也跟上了這波潮流，出現了幾家讓人心動的專門店。</p>
<figure><img src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg" alt="舒芙蕾鬆餅" /></figure>

<h2>舒芙蕾鬆餅的訣竅</h2>
<p>真正的舒芙蕾鬆餅需要將蛋白打發至硬性發泡，再與蛋黃麵糊輕輕混合，用低溫悶蒸的方式煎熟。這個過程需要15-20分鐘，完成後的鬆餅如同雲朵般輕盈，入口即化。</p>

<h2>沖繩3家推薦</h2>

<h3>1. Halekulani Okinawa — 恩納村（最頂級體驗）</h3>
<p>奢華度假飯店Halekulani Okinawa的全日餐廳，在這裡享用舒芙蕾鬆餅是截然不同的體驗。使用頂級食材，搭配現削松露和季節水果，配上面向東海的絕美景觀，價格雖高但物超所值。套餐約¥3,500-5,000。</p>

<h3>2. 幸せのパンケーキ（幸福鬆餅）沖繩店 — 那霸</h3>
<p>來自大阪的人氣連鎖鬆餅店，在沖繩也設有分店。鬆餅厚度約3-4公分，搭配自製鮮奶油和楓糖，口感輕盈甜而不膩。平日等待時間約30-45分鐘，假日可能超過1小時，建議提前上官網預約。約¥1,400-1,800/份。</p>

<h3>3. FLIPPER'S 沖繩店 — 那霸</h3>
<p>以「奇蹟的鬆餅」為口號，FLIPPER'S的舒芙蕾鬆餅以其驚人的蓬鬆程度著稱。使用北海道牛乳和高品質雞蛋，鬆餅送上桌的那一刻會緩慢地顫動搖晃，視覺效果極佳。約¥1,200-1,500/份。</p>

<h2>比較總結</h2>
<ul>
<li><strong>最頂級體驗</strong>：Halekulani Okinawa（預算充足且追求景觀體驗）</li>
<li><strong>最佳性價比</strong>：FLIPPER'S（品質穩定、蓬鬆度一致）</li>
<li><strong>最受歡迎</strong>：幸せのパンケーキ（口碑廣、適合打卡）</li>
</ul>
</article>$html$,
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['舒芙蕾鬆餅','沖繩甜點','Halekulani','那霸美食','日本甜點'],
  '美食探索',
  'published',
  '沖繩3家最好吃舒芙蕾鬆餅比較：Halekulani頂級版、幸せのパンケーキ、FLIPPER''S，找出最值得排隊的一家。',
  '2024-06-11 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-souffle-pancake-3-best');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '東京超人氣伴手禮PRESS BUTTER SAND｜焦糖奶油夾心餅乾完整攻略',
  'press-butter-sand-tokyo-guide',
  'PRESS BUTTER SAND是近年東京最受歡迎的伴手禮之一，以外層酥脆的奶油餅乾包裹濃郁焦糖奶油餡而聞名。本篇整理所有分店位置、口味選擇和購買攻略，讓你不再白跑一趟。',
  $html$<article>
<p>如果要票選近5年東京最受歡迎的伴手禮，PRESS BUTTER SAND絕對名列前茅。這家以奶油焦糖夾心餅乾聞名的品牌，自2017年創立以來一直保持超人氣，各大車站的店面經常大排長龍。</p>
<figure><img src="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg" alt="PRESS BUTTER SAND" /></figure>

<h2>為什麼這麼好吃？</h2>
<p>PRESS BUTTER SAND的成功來自於對細節的極致追求：
外層使用丹麥進口奶油製作的薄酥餅乾，入口即酥脆化開；內餡是他們自家研發的「buttery cream」和「butter caramel」雙層結構，焦糖的微苦和奶油的甜膩完美平衡。這種口感組合在市場上獨樹一幟。</p>

<h2>口味選擇</h2>
<ul>
<li><strong>原味</strong>：經典焦糖奶油，必買款</li>
<li><strong>抹茶</strong>：京都限定，外皮帶有淡淡抹茶香氣</li>
<li><strong>草莓</strong>：春季限定，果香鮮明</li>
<li><strong>白巧克力</strong>：冬季限定，甜而不膩</li>
<li><strong>黑芝麻</strong>：和風系列，是在地人最愛</li>
</ul>

<h2>主要分店位置</h2>
<ul>
<li>東京站（GRANSTA）：人流最大的店面，每日早上開門後1小時可能已賣完</li>
<li>羽田機場：國際線和國際線均有設點，是最後購買機會</li>
<li>新宿伊勢丹：百貨公司設點，相對人少排隊</li>
<li>涉谷（Scramble Square）：新宿外的熱門地點</li>
</ul>

<h2>購買攻略</h2>
<ul>
<li><strong>早點去</strong>：人氣款每日限量，建議開門前30分鐘排隊</li>
<li><strong>線上預購</strong>：官網有提供部分通路線上購買再到店取貨</li>
<li><strong>避開假日</strong>：平日工作時間（上午10點-下午2點）人流相對較少</li>
<li><strong>保存期限</strong>：常溫14-21天，可安心帶回台灣</li>
</ul>

<h2>價格參考</h2>
<p>5入禮盒 ¥648 / 9入禮盒 ¥1,296 / 18入禮盒 ¥2,484（含稅）</p>
</article>$html$,
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['東京伴手禮','PRESS BUTTER SAND','餅乾','焦糖','東京購物'],
  '美食探索',
  'published',
  'PRESS BUTTER SAND東京完整購買攻略：分店位置、口味選擇和避免撲空的購買秘訣，東京必買伴手禮指南。',
  '2024-06-01 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'press-butter-sand-tokyo-guide');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '京都壽喜燒推薦8選｜百年老鋪到現代割烹，完整價位與菜單解析',
  'kyoto-sukiyaki-8-restaurants',
  '京都的壽喜燒文化歷史悠久，從百年老鋪的嚴謹儀式到現代割烹的創意詮釋，提供截然不同的飲食體驗。本篇精選8家京都值得一試的壽喜燒餐廳，附上詳細價位和菜單資訊。',
  $html$<article>
<p>壽喜燒（すき焼き）是日本傳統的鐵鍋料理，以醬油、糖、味醂和酒調製的甜鹹醬汁煮牛肉、豆腐、蔬菜，再以生雞蛋沾食。京都的壽喜燒有其特有的優雅氣質，與東京的豪放風格略有不同。</p>
<figure><img src="https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg" alt="壽喜燒" /></figure>

<h2>壽喜燒關東vs關西風格</h2>
<p>東京（關東）風格：先乾煎牛肉，再加入已調製好的「割り下」醬汁一起燉煮，口味較為濃郁。京都（關西）風格：先在鍋中放入少許牛脂潤鍋，再放入牛肉略煎，以砂糖先調味，再加入醬油和酒，更能凸顯食材的原味。</p>

<h2>推薦8家餐廳</h2>

<h3>1. 三嶋亭（Mishima-tei）— 創業明治6年（1873年）</h3>
<p>京都最古老的壽喜燒老鋪之一，位於寺町通，明治時代的老屋建築保存完整。使用近江牛A5等級，醬汁配方150年來未曾改變。午間套餐約¥8,000起，晚間約¥15,000起，需提前預約。</p>

<h3>2. 辻留（Tsujitome）— 茶道精神的壽喜燒</h3>
<p>融入茶道美學的高端壽喜燒，在歷史悠久的町家建築中享用，服務如同茶道般細緻周到。使用京都丹後產和牛，全套套餐約¥20,000起。</p>

<h3>3. はり清（Harikyo）— 料亭式壽喜燒</h3>
<p>2016年米其林推薦餐廳，位於木屋町的傳統料亭，以高湯為基底調製獨特壽喜燒醬汁。午間約¥6,000，晚間約¥12,000。</p>

<h3>4. スタミナ苑（Stamina-en）— 韓日融合</h3>
<p>以韓式燒肉方式詮釋壽喜燒的創意餐廳，C/P值高，是年輕族群的熱門選擇。約¥3,000-5,000/人。</p>

<h3>5. 京都和牛餐廳 梅の花 — 適合親子</h3>
<p>提供包廂服務，食材優質且價位合理，提供兒童友善菜單，是帶家人用餐的理想選擇。約¥5,000-8,000/人。</p>

<h3>6-8. 預算友善選擇（¥3,000以下）</h3>
<p>京都市內也有多家平價壽喜燒餐廳，如「すき家」的高級版本，提供品質尚可的和牛壽喜燒套餐，適合預算有限的旅行者，滿足嚐鮮需求。</p>

<h2>壽喜燒禮儀小知識</h2>
<ul>
<li>日式壽喜燒通常由服務人員全程料理，勿自行加食材</li>
<li>蛋液容器請自己打勻，是沾食的關鍵</li>
<li>用餐結束後，剩餘湯汁可以加入烏龍麵煮「雜炊」</li>
</ul>
</article>$html$,
  'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['京都','壽喜燒','和牛','日本料理','京都美食'],
  '美食探索',
  'published',
  '京都壽喜燒8家推薦：從150年老鋪到現代割烹，詳細價位與菜單解析，讓你找到最適合的京都和牛壽喜燒體驗。',
  '2024-05-01 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'kyoto-sukiyaki-8-restaurants');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '神戶牛排人氣店3選｜附菜單日文、價位與預約攻略',
  'kobe-beef-3-restaurants',
  '神戶牛是世界知名的頂級和牛，在神戶當地品嚐神戶牛是許多旅人的夢想。本篇精選3家最受好評的神戶牛排餐廳，附上完整的菜單日文對照、價位說明和預約攻略。',
  $html$<article>
<p>神戶牛（神戸ビーフ）是日本三大和牛之一，以其極細緻的油花（霜降り）、柔嫩的口感和豐富的鮮味著稱。在神戶當地品嚐現地直送的神戶牛，是一生值得體驗一次的飲食經歷。</p>
<figure><img src="https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg" alt="神戶牛排" /></figure>

<h2>神戶牛的認定標準</h2>
<p>並非所有在神戶販售的牛肉都是神戶牛。正式的「神戸ビーフ」必須符合以下條件：兵庫縣內的特定牧場飼育、純血的但馬牛血統、BMS（牛肉大理石紋評分）6分以上（共12分）、肉質等級A4或B4以上。每年認定的神戶牛僅約4,000頭，相當稀少。</p>

<h2>推薦3家餐廳</h2>

<h3>1. モーリヤ（Mouriya）本店 — 1884年創業</h3>
<p>神戶歷史最悠久的神戶牛料理餐廳，自明治17年起就開始提供神戶牛料理。店內保留了濃厚的老鋪氛圍，提供鐵板燒和涮涮鍋兩種料理方式。菜單日文：神戸ビーフコース（神戶牛套餐）¥15,000-20,000。建議至少2週前預約。</p>

<h3>2. 牛屋 坂の下（Ushiya Sakanoshita）</h3>
<p>北野異人館附近的高人氣神戶牛排餐廳，比起老鋪更具現代感的用餐環境，服務熱情且英文通。午間套餐（ランチ）¥8,000-12,000，性價比較高，建議選擇午餐時段前往。菜單日文：神戸ビーフランチコース（神戶牛午間套餐）。</p>

<h3>3. ステーキランド神戸館（Steak Land Kobe-kan）</h3>
<p>無需預約的大眾化神戶牛排餐廳，位於三宮熱鬧商圈，提供多種價位選擇，最入門款約¥4,000即可品嚐到真正的神戶牛排。雖然氣氛沒有老鋪高級，但品質有保證，是預算有限旅人的理想選擇。</p>

<h2>購買神戶牛伴手禮</h2>
<p>如果預算不足以在餐廳用餐，也可以在神戶多家精肉店購買神戶牛加工品：神戶牛風乾牛肉片（ビーフジャーキー）、神戶牛肉醬（ビーフソース）都是熱門選項，價格相對親民。</p>
</article>$html$,
  'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['神戶牛','牛排','神戶美食','和牛','關西旅遊'],
  '美食探索',
  'published',
  '神戶牛排3家推薦：從百年老鋪到大眾化選擇，附完整菜單日文、價位說明和預約攻略。',
  '2024-07-22 08:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'kobe-beef-3-restaurants');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '東京裏原宿隱藏日式飯糰名店Café まんま｜排隊30分鐘值得的飯糰體驗',
  'tokyo-harajuku-onigiri-cafe-manma',
  '藏身於裏原宿巷弄的Café まんま，以手工捏製的日式飯糰和自家醃漬食材聞名，每到用餐時間總是大排長龍。本篇分享這家隱藏名店的完整資訊和必點菜色。',
  $html$<article>
<p>裏原宿（Ura-Harajuku）是東京原宿背後的一片安靜巷弄，與喧囂的竹下通恰恰相反，保留著一種老東京的靜謐氣質。Café まんま就藏在這裡的巷子深處，完全沒有顯眼的招牌，卻靠著口耳相傳成為東京美食愛好者的口袋名單。</p>
<figure><img src="https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg" alt="日式飯糰" /></figure>

<h2>為什麼值得排隊？</h2>
<p>まんま的飯糰使用的是新潟越光米（コシヒカリ），每天早上現炊，採傳統手工捏製，而非機器壓製。海苔選用有明海的頂級烘烤海苔，脆度和香氣完全不同於市售版本。內餡的食材多為自家醃漬和時令食材，每日略有不同。</p>

<h2>必點菜色</h2>
<ul>
<li><strong>梅しらす</strong>（梅子吻仔魚）：酸甜梅子搭配釜揚吻仔魚的組合，清爽開胃，是最受歡迎的口味。</li>
<li><strong>牛しぐれ</strong>（牛肉時雨）：和風醬汁燉煮的牛肉末，甜鹹適中，與白米的搭配最為經典。</li>
<li><strong>北海道鮭魚</strong>：自家醃製的鮭魚，油脂豐富但不過鹹。</li>
<li><strong>本日のおすすめ</strong>（當日推薦）：每日不同，是熟客最期待的驚喜。</li>
</ul>

<h2>實際用餐資訊</h2>
<ul>
<li>等待時間：午餐尖峰（12-13點）約30-45分鐘，建議11點45分前抵達</li>
<li>座位：店內僅約20席，以吧台座位為主</li>
<li>價格：飯糰單個¥280-380，套餐含味噌湯約¥600-800</li>
<li>定休：週二公休</li>
</ul>

<h2>如何前往</h2>
<p>最近車站為JR原宿站或東京Metro明治神宮前站，步行約8分鐘。從竹下通往南走進裏原宿巷弄區域，沿著路邊植物尋找，店門口通常有幾位排隊的客人是最好的地標。</p>
</article>$html$,
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['東京美食','飯糰','原宿','隱藏名店','日本料理'],
  '美食探索',
  'published',
  '東京裏原宿Café まんま手工飯糰完整介紹：必點口味、等待時間、前往方式，值得排隊30分鐘的飯糰體驗。',
  '2024-07-22 07:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'tokyo-harajuku-onigiri-cafe-manma');

-- ===== 住宿推薦 =====

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  'Halekulani Okinawa｜沖繩最奢華的度假飯店，夢幻白沙灘與頂級服務',
  'halekulani-okinawa-resort-review',
  'Halekulani Okinawa是近年沖繩最受矚目的頂級度假飯店，以夏威夷Halekulani飯店為靈感，打造出結合沖繩自然美景和頂級服務的絕世度假體驗。本篇分享實際入住心得和必體驗的飯店設施。',
  $html$<article>
<p>Halekulani在夏威夷語中意為「天堂的居所」（House Befitting Heaven），這個名字用在沖繩恩納村的這座度假飯店上再貼切不過。從抵達的那一刻起，這裡的一切都讓人感覺進入了另一個世界。</p>
<figure><img src="https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg" alt="Halekulani Okinawa" /></figure>

<h2>飯店基本資訊</h2>
<ul>
<li>地址：沖縄県国頭郡恩納村名嘉真1954-1</li>
<li>房間數：360間客房與套房</li>
<li>開業：2019年7月</li>
<li>海灘：私人白沙灘，面向東海</li>
<li>房價：¥80,000-300,000+/晚（依房型和季節而異）</li>
</ul>

<h2>客房體驗</h2>
<p>所有客房均面海，提供絕佳的東海景觀。入住的Junior Suite約50坪，空間感令人震撼。浴室採用大理石材質，備品全數使用Halekulani專屬自製香氛系列，香氣清雅令人難忘。床墊的柔軟程度剛好，使用羽絨枕和高支數純棉床單，睡眠品質極佳。</p>

<h2>餐廳亮點</h2>
<h3>SHIROUX — 全日餐廳</h3>
<p>提供豐盛的早餐自助和正餐套餐，使用沖繩在地農產品和海鮮，是飯店最受好評的餐廳。舒芙蕾鬆餅是必點招牌，需提前向服務人員告知，等待約20分鐘。</p>
<h3>Aomi — 精緻義式料理</h3>
<p>以沖繩食材詮釋義大利料理，面向私人海灘的落地窗讓用餐體驗更加特別。</p>
<h3>CoRoN — 日式料理</h3>
<p>提供懷石料理和鐵板燒，以最高品質的沖繩和牛為主角，是飯店中最高端的餐廳選擇。</p>

<h2>泳池與海灘</h2>
<p>飯店共有三個大型游泳池，包括面向大海的Infinity Pool。私人白沙灘清澈寧靜，提供各種水上活動租用（SUP、獨木舟、浮潛）。日落時分在海灘享用雞尾酒是這裡最讓人難忘的體驗之一。</p>

<h2>SPA體驗</h2>
<p>Nagisa Spa提供多種沖繩傳統療法，結合海洋元素和天然植物精油，使用自家製造的護膚產品。預約特別忙碌，建議入住前1個月預約。</p>

<h2>值得嗎？</h2>
<p>對於追求頂級體驗的旅人，Halekulani Okinawa絕對值得列入夢想清單。雖然價格不菲，但從空間、服務、餐飲到設施，每一個環節都達到頂級水準，是真正讓人想要「一直待在飯店」的奢華度假體驗。</p>
</article>$html$,
  'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['Halekulani','沖繩飯店','恩納','奢華度假','住宿推薦'],
  '住宿推薦',
  'published',
  'Halekulani Okinawa完整入住體驗：客房、餐廳、泳池和SPA詳細評測，沖繩最頂級度假飯店的真實心得分享。',
  '2024-07-05 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'halekulani-okinawa-resort-review');

-- ===== 旅行日記 =====

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '10句日本咖啡職人的激勵人心金句｜那些讓我重新愛上咖啡的話語',
  'japanese-coffee-craftsmen-quotes',
  '在日本採訪多位咖啡職人的過程中，記錄下了這10句讓我深受感動的金句。這些話來自烘豆師、咖啡師和咖啡廳老闆，他們對咖啡的熱情和堅持，讓我重新思考了「認真」這件事的意義。',
  $html$<article>
<p>採訪日本咖啡職人是我最喜歡的工作之一。在一次次的對話中，我記錄下了很多讓我深受震撼的話語。今天整理10句我最喜歡的金句，分享給同樣熱愛咖啡和旅行的你。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="咖啡職人" /></figure>

<h2>10句咖啡職人金句</h2>

<h3>1. 「咖啡不只是飲料，是我和土地的對話。」— 北海道某烘豆師</h3>
<p>這句話讓我重新思考每一杯咖啡背後的意義。每一支豆子都帶著它生長的土地的記憶，烘焙和沖泡是將這段記憶傳遞給喝咖啡的人的過程。</p>

<h3>2. 「失敗的那杯咖啡，比成功的那杯教會我更多。」— 東京精品咖啡師</h3>
<p>完美的背後是無數次的嘗試和失敗。這位咖啡師說，他至今仍保留著所有「失敗配方」的筆記，那是他最珍貴的老師。</p>

<h3>3. 「我每天都在學習。如果不是，我就停止進步了。」— 京都老鋪第三代傳人</h3>
<p>經營超過百年的老鋪，最怕的不是競爭，而是停止進步。這位年過六十的職人說，他至今仍每週閱讀最新的咖啡研究報告。</p>

<h3>4. 「好的咖啡，是讓喝的人忘記煩惱的那一刻。」— 沖繩咖啡廳老闆</h3>
<p>咖啡的意義不只在於風味，更在於它創造的那個片刻。一個讓人放下手機、放空思緒的瞬間，就是咖啡最大的價值。</p>

<h3>5. 「我做的不是咖啡，是回憶。」— 神戶百年喫茶店老闆娘</h3>
<p>很多客人從年輕喝到老，帶著自己的孩子、孫子來。對他們來說，這杯咖啡的味道承載了幾十年的生命故事。</p>

<h3>6. 「產地農民的心血，我有責任把它完整呈現。」— 大阪烘豆師</h3>
<p>直接貿易（Direct Trade）不只是商業模式，更是一種道德責任。農民用一年的時間種出的咖啡豆，烘豆師和咖啡師有責任把它的最佳狀態呈現給消費者。</p>

<h3>7. 「標準很重要，但不要讓標準限制了創意。」— 福岡年輕咖啡師</h3>
<p>精品咖啡界有很多「標準」，但過於拘泥標準反而讓咖啡失去了個性。這位24歲的咖啡師在比賽中以大膽的創新配方獲獎，成為業界話題。</p>

<h3>8. 「沒有捷徑，只有每天重複做好每件小事。」— 世界盃咖啡師冠軍</h3>
<p>採訪世界冠軍最大的收穫，是了解到他的訓練計劃有多紮實。每天練習沖泡超過100杯，筆記寫了幾十本，這才是冠軍之路的真實面貌。</p>

<h3>9. 「旅行讓我的咖啡更有故事。」— 沖繩咖啡旅行職人</h3>
<p>豆波波さん告訴我，他每年都會親自前往產地拜訪農場，不只是為了選豆，更是為了了解那片土地的文化和農民的生活。這些經歷讓他的每一支豆子都有了靈魂。</p>

<h3>10. 「最好的咖啡，是下一杯。」— 京都某老烘豆師</h3>
<p>這是我聽過最謙遜也最激勵人心的一句話。永遠相信還有進步的空間，永遠期待下一次會更好——這種精神，不只適用於咖啡，也適用於人生。</p>
</article>$html$,
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['咖啡職人','金句','日本咖啡','旅行故事','職人精神'],
  '旅行日記',
  'published',
  '採訪日本咖啡職人記錄下的10句激勵金句，從烘豆師到世界冠軍，他們對咖啡的熱情和堅持讓人重新思考「認真」的意義。',
  '2023-12-30 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'japanese-coffee-craftsmen-quotes');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '世界盃沖煮大賽台灣選拔賽2023｜現場觀賽紀錄與選手介紹',
  'world-brewers-cup-taiwan-2023',
  '2023年世界盃沖煮大賽（World Brewers Cup）台灣選拔賽現場觀賽紀錄。親眼目睹台灣頂尖咖啡師在壓力下展現出的專業技術和對咖啡的深刻理解，讓人大開眼界。',
  $html$<article>
<p>第一次去看咖啡比賽，是朋友拉著我去的。老實說，出發前我並沒有多大期待——不就是沖咖啡嗎？但當我踏入比賽場地，看到那種劍拔弩張卻又充滿儀式感的氛圍，我立刻被震撼到了。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="咖啡比賽" /></figure>

<h2>什麼是World Brewers Cup？</h2>
<p>World Brewers Cup（WBrC）是全球最重要的手沖咖啡比賽，由世界咖啡師錦標賽組織（World Coffee Events）主辦，每年在不同城市舉行。選手需要在規定時間內準備並呈現兩輪沖泡：一輪使用指定豆款（Open Service），一輪使用自選豆款（Compulsory Service），評審從技術、風味表達和與評審的溝通等面向評分。</p>

<h2>2023台灣選拔賽觀察</h2>
<p>今年的台灣選拔賽共有12位選手參賽，競爭激烈程度超出我的想像。每位選手都有自己獨特的沖泡理論和豆款詮釋方式，光是聽他們向評審解說豆款的故事和沖泡邏輯，就已經是一堂精彩的咖啡課。</p>

<h2>令我印象最深刻的選手</h2>
<p>冠軍選手選用了衣索比亞Guji地區的日曬處理豆，以細膩的注水控制展現出豆子的複雜花果香氣。他在解說中提到，他曾親自前往衣索比亞拜訪農場，這段採集風土的旅程直接影響了他的沖泡哲學。聽到這裡，我不禁想到之前採訪過的豆波波さん說過的話：「旅行讓我的咖啡更有故事。」</p>

<h2>比賽規格與評分標準</h2>
<ul>
<li>每位選手15分鐘完成兩輪呈現（各含三杯）</li>
<li>評審：4位品質評審（Sensory Judges）+ 2位技術評審（Technical Judges）</li>
<li>評分項目：萃取風味、與豆款的一致性、技術表現、選手對咖啡的理解與溝通</li>
</ul>

<h2>對我的啟發</h2>
<p>看完比賽，我對「手沖咖啡」有了全新的認識。我以為手沖只是把熱水倒在咖啡粉上，但頂級選手展現出的是對水流、溫度、時間、研磨度每個細節的精確掌控，以及對豆子產地、處理方式和風味走向的深刻理解。咖啡，真的可以是一門藝術。</p>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['World Brewers Cup','咖啡比賽','台灣咖啡','手沖咖啡','咖啡師'],
  '旅行日記',
  'published',
  '2023世界盃沖煮大賽台灣選拔賽現場觀賽紀錄：比賽規格解說、選手介紹與對咖啡藝術的深刻啟發。',
  '2023-09-20 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'world-brewers-cup-taiwan-2023');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '台灣最美家居品牌《巢家居》｜咖啡香與設計感的完美交會',
  'chao-home-brand-taiwan',
  '巢家居是台灣少見同時兼顧家居設計和精品咖啡的複合式品牌空間。本篇分享造訪巢家居的體驗，以及這個品牌如何用「家」的概念詮釋咖啡文化。',
  $html$<article>
<p>台灣有很多家居品牌，也有很多精品咖啡廳，但能把兩者結合得如此自然的，我知道的只有巢家居。第一次走進去，就被那種「家」的氛圍深深吸引——明明是一個商業空間，卻讓人有種回到家的放鬆感。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="巢家居" /></figure>

<h2>巢家居是什麼？</h2>
<p>巢家居（Chao Home）是一個結合家居選物、室內設計服務和精品咖啡的複合式品牌。他們相信好的居家設計能讓人更幸福，而一杯好咖啡正是這種幸福感的最佳體現。店內陳設的家居物品全數可購買，讓客人在喝咖啡的同時，也能實際感受這些物品在生活中的樣子。</p>

<h2>空間設計哲學</h2>
<p>巢家居的空間設計以北歐簡約風格為基底，融入大量溫暖的自然材質——原木、陶瓷、麻繩、亞麻布料。每一件家具都有其設計故事，空間中的每個角落都透露著對細節的用心。陽光從大片落地窗灑入，讓整個空間在自然光的映照下顯得特別溫柔。</p>

<h2>咖啡品質</h2>
<p>巢家居的咖啡使用台灣精品烘豆商的豆款，以手沖和義式兩條線提供選擇。我點了一杯衣索比亞淺焙手沖，在溫暖舒適的空間裡慢慢品飲，那種體驗遠遠超過咖啡本身的風味——是整個「家」的氛圍把這杯咖啡的品質提升了一個層次。</p>

<h2>選物品項</h2>
<p>店內販售的家居物品包括：北歐設計師品牌的餐具和廚房器具、手工藤編收納籃、有機棉質寢具、香氛蠟燭和擴香、日本和德國品牌的咖啡器具。這些物品的選品邏輯都圍繞著「讓日常生活更有質感」這個核心概念。</p>

<h2>關於「巢」</h2>
<p>「巢」在中文裡是鳥的家，一個有溫度的庇護所。這個品牌名稱完美詮釋了他們的品牌精神：希望每個人的家，都能像一個讓人安心棲息的鳥巢。在咖啡旅行的途中，能找到這樣的地方暫時停歇，是旅途中珍貴的禮物。</p>
</article>$html$,
  'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['台灣','家居品牌','巢家居','精品咖啡','設計選物'],
  '旅行日記',
  'published',
  '台灣複合式家居品牌巢家居：結合家居設計選物和精品咖啡的溫暖空間，體驗「家」的哲學與咖啡文化的美好交會。',
  '2023-05-21 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'chao-home-brand-taiwan');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩｜濃縮咖啡的藝術—陶藝家今村能章的咖啡器皿世界',
  'okinawa-imamura-espresso-ceramics',
  '在沖繩的鄉間小路上，一位陶藝家用雙手塑造出了對咖啡最深沉的致敬。今村能章的手工陶瓷咖啡器皿在精品咖啡圈中備受推崇，本篇記錄造訪他工作室的深刻體驗。',
  $html$<article>
<p>第一次看到今村能章的濃縮咖啡杯，是在沖繩一家精品咖啡廳裡。那個形狀不規則、表面帶著窯燒火痕的小小陶杯，盛著深色的Espresso，散發出一種說不清的美感。我當下就決定，一定要找到這個陶藝家的工作室。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="沖繩陶藝咖啡器皿" /></figure>

<h2>今村能章其人</h2>
<p>今村能章（Imamura Yoshiaki）是沖繩本島北部的陶藝家，工作室設在遠離觀光景點的山原鄉間。他的創作以咖啡器皿為主，包括Espresso杯、手沖壺、咖啡濾杯架等，每一件都是手工捏製，沒有任何兩件完全相同。</p>

<h2>造訪工作室</h2>
<p>工作室的地址並不公開，需要提前聯繫預約才能前往參觀。車子沿著蜿蜒的山間小路開了20分鐘後，抵達一棟掩映在亞熱帶植物中的傳統沖繩民宅。今村先生本人親自開門迎接，帶我參觀了整個工作空間。</p>

<p>工作室的核心是一座傳統的柴窯。今村先生說，他堅持使用柴燒而非電窯，因為「火的溫度和方向是不可控的，這種不可控正是每件作品獨特性的來源」。燒製一批陶器需要在窯旁守候3天3夜，時刻調整火力，是需要高度專注和體力的過程。</p>

<h2>咖啡與陶藝的連結</h2>
<p>今村先生本身也是咖啡愛好者，他說設計咖啡器皿之前，他會先研究不同類型的咖啡如何被萃取，以及使用者在品飲過程中的感受。Espresso杯的設計需要讓杯壁薄而保溫，杯身的重量要在拿起時有紮實感；手沖壺則需要考慮注水角度和流速控制。</p>

<h2>購買方式</h2>
<p>今村先生的作品不在一般的陶藝市集或網路平台販售。目前只有兩種途徑能夠購買：直接聯繫工作室預約參觀並選購，或透過少數幾家與他合作的沖繩精品咖啡廳購買展示品。正是這種稀有性，讓他的作品在咖啡器皿收藏圈中更加珍貴。</p>

<h2>那杯Espresso</h2>
<p>參觀結束前，今村先生用他自己的陶杯為我沖了一杯Espresso，豆子是豆波波烘焙的衣索比亞日曬豆。手握著這個溫熱的、帶著火痕紋路的陶杯，喝下那口濃縮咖啡的瞬間，我感受到了一種奇特的連結——咖啡農、烘豆師、陶藝家，還有眼前這位沉靜的職人，全都在這個小小的時刻相遇了。</p>
</article>$html$,
  'https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','陶藝','咖啡器皿','職人','手工陶瓷'],
  '旅行日記',
  'published',
  '造訪沖繩陶藝家今村能章工作室：柴燒手工咖啡器皿背後的職人故事，以及咖啡與陶藝深刻連結的感動體驗。',
  '2023-04-17 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-imamura-espresso-ceramics');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '沖繩咖啡職人豆波波｜世界盃亞軍烘豆師，在沖繩角落堅持的咖啡信念',
  'okinawa-mamebobo-coffee-roaster',
  '豆波波（MAMEBOBO）是沖繩最具代表性的精品咖啡師兼烘豆師，曾獲日本烘豆大賽冠軍、世界盃亞軍。本篇記錄與他的深度對談，以及他對咖啡和沖繩土地的深刻情感。',
  $html$<article>
<p>在沖繩談咖啡，你一定會聽到「豆波波」這個名字。對很多沖繩咖啡愛好者來說，他的咖啡廳不只是一個喝咖啡的地方，更是一個關於堅持和熱情的象徵。</p>
<figure><img src="https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg" alt="豆波波咖啡" /></figure>

<h2>豆波波其人</h2>
<p>豆波波さん（本名暫不公開）在沖繩土生土長，年輕時在東京的咖啡廳工作，接觸到精品咖啡的世界後，決定回到家鄉沖繩，在浦添市開設自己的咖啡廳兼烘焙工坊。他相信，沖繩應該有屬於自己的頂級咖啡文化。</p>

<h2>國際賽場的成績</h2>
<ul>
<li>日本烘豆大賽冠軍（Japan Roasting Championship）</li>
<li>世界盃烘豆大賽亞軍（World Coffee Roasting Championship）</li>
<li>日本咖啡沖煮大賽多次入圍</li>
</ul>
<p>但他本人卻非常低調，店內沒有任何獎狀展示，他說：「比賽結果是昨天的事，今天我只想讓走進來的每個人喝到最好的咖啡。」</p>

<h2>對話節錄</h2>
<p><strong>問：你為什麼決定回到沖繩開咖啡廳？</strong><br/>
「因為我在東京喝不到好喝的沖繩咖啡。（笑）不是說東京沒有好咖啡，而是我想讓沖繩人也能喝到用沖繩人的眼光和熱情做出來的精品咖啡。」</p>

<p><strong>問：你選豆子的標準是什麼？</strong><br/>
「我每年都會親自拜訪幾個產地。不是只看杯測數據，而是要親眼看到農民怎麼對待那片土地、那些咖啡樹。如果農民對土地有愛，那支豆子一定好喝。」</p>

<p><strong>問：這麼多年，讓你最有成就感的一刻是？</strong><br/>
「有一個老奶奶第一次喝到我的衣索比亞淺焙，她說：『這和咖啡一樣嗎？我感覺我在喝花茶。』她的眼睛亮起來的那一刻，比拿任何獎項都讓我快樂。」</p>

<h2>豆款特色</h2>
<p>豆波波的豆款以淺焙為主，特別擅長展現衣索比亞和肯亞豆款的花香果酸。每一款豆子都有詳細的農場資訊、處理方式和風味描述，讓客人在喝咖啡的同時了解更多背後的故事。</p>

<h2>如何前往</h2>
<p>店面位於沖繩浦添市的住宅區，沒有顯眼招牌，但Google Map評分極高，按圖索驥並不困難。由於店鋪空間有限，假日可能需要等待。建議在出發前查詢當日的特別豆款，那是與豆波波さん展開對話的最好開場白。</p>
</article>$html$,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩','豆波波','烘豆師','精品咖啡','職人故事'],
  '旅行日記',
  'published',
  '沖繩咖啡職人豆波波深度專訪：日本烘豆冠軍、世界盃亞軍烘豆師，在沖繩角落堅持咖啡信念的感動故事。',
  '2023-04-07 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'okinawa-mamebobo-coffee-roaster');

INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
SELECT
  '咖啡 × 桌遊｜2023台北咖啡節的桌遊體驗，咖啡與遊戲的意外美妙組合',
  'taipei-coffee-festival-board-games-2023',
  '在台北咖啡節的某個攤位上，我第一次玩到了咖啡主題桌遊。這個意外的組合讓我和完全不認識的陌生人，在桌遊和咖啡之間建立起了一種特別的連結，是旅途中最難忘的偶然相遇之一。',
  $html$<article>
<p>去台北咖啡節本來是為了試喝各家精品咖啡廳的豆款，沒想到最讓我印象深刻的，竟然是一個咖啡主題桌遊攤位。</p>
<figure><img src="https://images.pexels.com/photos/683039/pexels-photo-683039.jpeg" alt="咖啡桌遊" /></figure>

<h2>台北咖啡節</h2>
<p>台北咖啡節是台灣最重要的精品咖啡盛事之一，每年吸引來自全台和海外的咖啡廳、烘豆師和相關品牌參展。現場除了試飲各家豆款，也有咖啡師示範表演、咖啡知識工作坊，以及各種與咖啡相關的創意周邊商品。</p>

<h2>邂逅咖啡桌遊</h2>
<p>那個攤位不大，幾張桌子圍著幾個陌生人玩遊戲，旁邊擺著各種咖啡主題的桌遊盒。攤主向我介紹，這款遊戲名叫「Barista Battle」，玩家扮演咖啡師，透過卡牌機制競爭最佳咖啡風味分數。</p>

<h2>Barista Battle玩法簡介</h2>
<ul>
<li>4-6人遊戲，每人扮演一位有不同特殊能力的咖啡師</li>
<li>透過卡牌組合搭配「豆款」、「萃取方式」和「裝飾」來得分</li>
<li>加入了現實中的咖啡知識，如烘焙程度對風味的影響</li>
<li>遊戲時間約60-90分鐘</li>
</ul>

<h2>意外的深度對話</h2>
<p>同桌的另外三個人也是第一次見面。其中一位是從京都來台灣旅行的咖啡師，另外兩位是台灣的咖啡愛好者夫妻。在遊戲過程中，我們聊到了各自對咖啡的理解、喜歡的豆款風味，以及各自城市的咖啡文化。那種在遊戲中邊競爭邊分享的體驗，是在一般咖啡廳很難發生的。</p>

<h2>咖啡和桌遊的共同點</h2>
<p>玩完之後，我突然意識到咖啡和桌遊有個有趣的共同點：兩者都是創造「共同體驗」的媒介。一杯咖啡讓人圍坐在一起，一局桌遊讓陌生人找到共同話題。把這兩者組合在一起，是非常自然也非常美好的事。</p>

<h2>值得關注的咖啡桌遊</h2>
<ul>
<li><strong>Barista Battle</strong>：台灣在地設計，咖啡知識含量高</li>
<li><strong>Coffee Roaster</strong>：獲獎獨立遊戲，模擬烘豆過程</li>
<li><strong>Cafe International</strong>：以咖啡廳文化為主題的經典桌遊</li>
</ul>
</article>$html$,
  'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['台北咖啡節','桌遊','咖啡活動','旅行故事','咖啡文化'],
  '旅行日記',
  'published',
  '2023台北咖啡節咖啡主題桌遊體驗：意外遇見的美好組合，以及咖啡和桌遊如何共同創造難忘的人與人連結。',
  '2023-06-22 09:00:00+00',
  now(), now()
WHERE NOT EXISTS (SELECT 1 FROM blog_posts WHERE slug = 'taipei-coffee-festival-board-games-2023');
