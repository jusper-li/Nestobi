/*
  # Insert blog posts from coffeewithryoko (Vocus)
  10 articles by 咖啡旅行家・Hola I'm Ryoko, with full HTML content and images.
*/

-- Article 1: 沖繩麵10選 (2024-08-22)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '沖繩美食在地人推薦沖繩麵10選｜金月沖繩麵、まいにち食堂、和泉食堂、我部祖河食堂',
  'okinawa-soba-10-recommendations',
  '到沖繩就是要吃沖繩麵！對沖縄人而言是不可或缺的生活靈魂食物。本篇整理10家在地人強烈推薦的沖繩麵店家，深入介紹湯頭、配料與各家特色。',
  $html$<article>
<p>到沖繩就是要吃沖繩麵！對沖縄人而言是不可或缺的生活靈魂食物。問過他們，平常可能不吃塔可飯，但一定會吃沖縄麵。</p>
<figure><img src="https://images.vocus.cc/7c75d45a-f480-438f-8f1d-5377283523ce.jpg" alt="沖繩麵" /></figure>

<h2>沖繩麵的歷史與特色</h2>
<p>44年前10月17號沖縄麵正名，25年前訂制10月17日為沖縄麵之日。沖縄麵與本島拉麵完全是不同派系，湯頭基本用豬骨加柴魚熬煮，分豬骨味重與柴魚味重2派。</p>
<figure><img src="https://images.vocus.cc/8f28ceb6-2b96-4fe2-855f-a3bcdd87c007.jpg" alt="沖繩麵湯頭" /></figure>

<h2>麵條地域差異</h2>
<ul>
<li>北部（恩納、名護）：扁平寬麵</li>
<li>中南部（那霸、豐見城）：中寬、烏龍麵口感</li>
<li>石垣島／八重山群島：細圓麵</li>
<li>宮古島：細長麵</li>
</ul>
<figure><img src="https://images.vocus.cc/86fe98a1-c93b-410a-91ed-9ee7934e60af.jpg" alt="沖繩麵麵條種類" /></figure>

<h2>常見配料與調味</h2>
<p>九種傳統配料包含三枚肉（豬五花）、ソーキ（紅燒排骨）、なんこつソーキ（軟骨排骨）、てびち（豬腳）、ゆし豆腐（嫩豆腐）、アーサ（沖繩海藻）、紅しょうが（紅薑）及コーレーグス（泡盛辣椒）。</p>
<p><strong>提醒：</strong>沖繩麵店家通常下午4點或5點就打烊！請務必提早安排。</p>
<figure><img src="https://images.vocus.cc/8e0e37c4-7a4a-48c5-a8f4-4d482a94da91.jpg" alt="沖繩麵配料" /></figure>

<h2>推薦10家店</h2>

<h3>1. 南部そば — 糸満市</h3>
<p>40年以上老店，鰹魚風味濃厚香氣十足，招牌為紅燒豬腳搭配柴魚湯底，中寬麵條嚼勁十足。</p>
<p>地址：沖縄県糸満市潮崎町3-2-2</p>
<figure><img src="https://images.vocus.cc/06df5f1a-9425-4527-8783-e61d6e97fb6a.jpg" alt="南部そば" /></figure>

<h3>2. 首里そば — 首里</h3>
<p>70年以上老舖，小碗¥400，中碗¥500。傳統柴魚風味，每日只開放2.5小時，常常大排長龍。</p>
<p>地址：沖縄県那覇市首里赤田町1-7</p>
<figure><img src="https://images.vocus.cc/d779bccc-2925-464b-b283-40e910e7cb80.jpg" alt="首里そば" /></figure>

<h3>3. OGAMEN — 那霸</h3>
<p>創意現代沖繩麵，老闆曾在東京知名拉麵店修業，根據每日濕度調整麵條鹽水比例，也提供手沖咖啡。</p>
<p>地址：沖縄県那覇市牧志3-2-33</p>
<figure><img src="https://images.vocus.cc/dc1a071f-a522-438e-8fab-786c1f1c1687.jpg" alt="OGAMEN" /></figure>

<h3>4. 高江洲そば — 浦添市</h3>
<p>在地人與觀光客都熟知的名店，豬骨風味為主，菜單精簡，大排骨碗¥850。</p>
<p>地址：沖縄県浦添市伊祖3-36-1</p>
<figure><img src="https://images.vocus.cc/d7fc9266-5359-47f5-ba16-73d48b69048b.jpg" alt="高江洲そば" /></figure>

<h3>5. てだこ専門そば — 浦添市</h3>
<p>當地居民最愛，傳統清甜湯底類似台灣排骨湯，排骨燉得軟嫩入味。</p>
<p>地址：沖縄県浦添市仲間1-2-2</p>
<figure><img src="https://images.vocus.cc/c71c8212-9d39-4630-b1c8-e00ed9537f7d.jpg" alt="てだこ" /></figure>

<h3>6. りんくる食堂 — 北谷町</h3>
<p>天然無添加湯底，罕見蛤蜊沖繩麵據說有解宿醉功效，週末附沖繩混炊飯。</p>
<p>地址：沖縄県中頭郡北谷町浜川186</p>
<figure><img src="https://images.vocus.cc/7434a436-d2b0-4603-9967-e49bc0f7efef.jpg" alt="りんくる食堂" /></figure>

<h3>7. 金月沖繩麵 — 読谷村</h3>
<p>使用8種魚熬製的複合湯底，排骨以噴槍炙燒，清甜新鮮。読谷、恩納及國際通均有分店。</p>
<p>地址：沖縄県中頭郡読谷村喜名201（本店）</p>
<figure><img src="https://images.vocus.cc/655d5839-3d4a-43c7-b19b-551ce2aa87d3.jpg" alt="金月沖繩麵" /></figure>

<h3>8. まいにち食堂 — 読谷村</h3>
<p>新式沖繩麵，湯底融合昆布、豬骨、柴魚、雞肉與蔬菜，清爽溫暖。每日僅開放3小時。</p>
<p>地址：沖縄県中頭郡読谷村喜名390</p>
<figure><img src="https://images.vocus.cc/777b0796-282f-4ff2-b7f0-f0c55d0cb86c.jpg" alt="まいにち食堂" /></figure>

<h3>9. 和泉食堂 — 沖繩市</h3>
<p>43年老店，豬腳燉煮豐厚湯底，白滷豬腳是7成客人點的招牌。</p>
<p>地址：沖縄県沖縄市池原4-11-14</p>
<figure><img src="https://images.vocus.cc/0a75ed76-e581-4851-ac80-710dcb0dc8ad.jpg" alt="和泉食堂" /></figure>

<h3>10. 我部祖河食堂 — 名護市</h3>
<p>近60年歷史，紅燒排骨沖繩麵的創始店，傳統豬骨湯底，獨家野菜そば為一大亮點。那霸、首里等多處有分店。</p>
<p>地址：沖縄県名護市我部祖河177（本店）</p>
<figure><img src="https://images.vocus.cc/61f193df-d73c-46fe-90f1-9f85747103bd.jpg" alt="我部祖河食堂" /></figure>
</article>$html$,
  'https://images.vocus.cc/7c75d45a-f480-438f-8f1d-5377283523ce.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩美食','沖繩麵','沖繩旅行','美食推薦'],
  '旅遊美食',
  'published',
  '沖繩在地人推薦10家沖繩麵：金月沖繩麵、まいにち食堂、和泉食堂、我部祖河食堂，詳細介紹湯頭特色與店家資訊。',
  '2024-08-22 09:00:00+00',
  '2024-08-22 09:00:00+00',
  '2024-09-09 09:00:00+00'
);

-- Article 2: 沖繩伴手禮 (2024-08-07)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '沖繩限定沖繩媳婦人氣伴手禮整理｜花生豆腐、黑糖、天使之羽、石垣島辣油、宮古牛洋芋片',
  'okinawa-souvenir-recommendations',
  '嫁到沖繩的台灣媳婦精選人氣伴手禮，距離機場僅10分鐘車程，提供中文服務、客製包裝，從花生豆腐、黑糖到石垣島辣油，完整推薦不踩雷。',
  $html$<article>
<p>由一位嫁到沖繩的台灣媳婦，親自開設的伴手禮選品店「沖繩媳婦」，根據客人的收禮對象喜好，量身推薦最合適的沖繩限定伴手禮。</p>
<figure><img src="https://images.vocus.cc/38c08c1a-effe-41c9-a72b-8f25555a1e99.jpg" alt="沖繩伴手禮" /></figure>

<h2>店家特色</h2>
<p>店內商品涵蓋國際通一般可買到的品項，以及獨家限定商品，距離機場僅約10分鐘車程，非常方便。未來也計畫引進台灣特色商品。</p>
<ul>
<li>客製禮品包裝服務</li>
<li>中文溝通服務</li>
<li>熱門限定商品可預約保留</li>
<li>購物期間可協助照顧孩童</li>
</ul>
<figure><img src="https://images.vocus.cc/6b6d34e4-ecd0-407d-954f-133bbf0a9b55.jpg" alt="沖繩媳婦伴手禮店" /></figure>

<h2>人氣伴手禮精選</h2>

<h3>花生豆腐（ジーマーミ豆腐）</h3>
<p>沖繩特有的花生製豆腐，口感綿密香濃，是最能代表沖繩的傳統食品之一，深受各年齡層喜愛。</p>

<h3>黑糖（黒糖）</h3>
<p>沖繩產黑糖風味深邃，有原味及各種口味選擇，是送禮自用兩相宜的經典之選。</p>

<h3>天使之羽（天使のはね）</h3>
<p>輕薄酥脆的餅乾，如同天使羽翼般精緻，是沖繩限定的人氣零食，造型精美適合送禮。</p>

<h3>雪鹽金楚糕（雪塩ちんすこう）</h3>
<p>傳統沖繩點心金楚糕加入宮古島雪鹽，甜鹹平衡的滋味讓人欲罷不能。</p>

<h3>石垣島辣油</h3>
<p>以石垣島特產辣椒製成，香氣濃郁辣味溫和，拌飯沾麵皆適合，是料理迷必買的伴手禮。</p>

<h3>宮古牛洋芋片</h3>
<p>以宮古島知名和牛為主題開發的限定洋芋片，風味獨特，包裝精美，沖繩限定。</p>

<h3>其他推薦</h3>
<ul>
<li>香檸（シークヮーサー）相關糖果與飲品</li>
<li>沖繩蔥餅乾、鹽味焦糖花生餅</li>
<li>HAISAI甜辣醬</li>
<li>石垣島產特色米</li>
<li>海藻乾燥食品</li>
<li>米袋造型托特包</li>
</ul>
</article>$html$,
  'https://images.vocus.cc/38c08c1a-effe-41c9-a72b-8f25555a1e99.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['沖繩伴手禮','沖繩限定','沖繩旅行','購物推薦'],
  '旅遊美食',
  'published',
  '沖繩媳婦推薦的沖繩限定人氣伴手禮：花生豆腐、黑糖、天使之羽、石垣島辣油、宮古牛洋芋片，提供中文服務與客製包裝。',
  '2024-08-07 09:00:00+00',
  '2024-08-07 09:00:00+00',
  '2024-08-07 09:00:00+00'
);

-- Article 3: GLITCH COFFEE GINZA (2024-08-05)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '東京銀座GLITCH COFFEE GINZA｜亞洲50家最棒咖啡廳，神保町、大阪、名古屋',
  'glitch-coffee-ginza-tokyo',
  '在銀座一片深烘焙版圖中，GLITCH銀座以精品淺烘焙單品豆脫穎而出。2023年4月開幕迅速成為咖啡愛好者的朝聖地，連咖啡雞尾酒也令人驚豔。',
  $html$<article>
<p>在銀座一片深烘焙的版圖中，GLITCH銀座為淺烘焙愛好者帶來絕佳選擇。2023年4月開幕，讓咖啡朝聖者多了一個神保町以外的必訪據點。</p>
<figure><img src="https://images.vocus.cc/16712698-ed2b-402c-8856-b31fe91d3823.jpg" alt="GLITCH COFFEE GINZA 外觀" /></figure>

<h2>空間設計</h2>
<p>黑色美學外觀引人注目，進入後是U型吧台包圍著咖啡師，展示超過15種咖啡豆。深處設有古董家具座位，搭配原創版畫與和西融合裝飾，英國品牌TANNOY音響播放精選1980年代音樂。</p>
<figure><img src="https://images.vocus.cc/82850372-59fc-44eb-867b-69f7d4db5a46.jpg" alt="GLITCH 吧台" /></figure>
<figure><img src="https://images.vocus.cc/e02a4e6f-b3b7-4874-b9db-0704328e9636.jpg" alt="GLITCH 內部空間" /></figure>

<h2>咖啡菜單</h2>
<p>所有咖啡豆均為淺烘焙單品，包含稀有產區及競賽得獎豆款。咖啡師會親切說明各豆款特色，聊得投緣時還可能有隱藏菜單。客人選定豆款後，可選擇黑咖啡、濃縮或拿鐵，也可選雙份手沖對比品飲。</p>
<figure><img src="https://images.vocus.cc/d60339fa-cd13-4dac-adc8-d10fc8a75613.jpg" alt="GLITCH 咖啡" /></figure>
<figure><img src="https://images.vocus.cc/d29656b0-39cc-45f0-a6a4-ddaa7d298af1.jpg" alt="GLITCH 手沖咖啡" /></figure>

<h2>咖啡雞尾酒</h2>
<p>GLITCH銀座獨家提供濃縮咖啡為基底的咖啡雞尾酒，展現咖啡師的創意與技術。Kihara陶藝品牌特別訂製專屬咖啡杯與拿鐵杯，兼具美感與實用。</p>
<figure><img src="https://images.vocus.cc/b692ea40-e475-41be-befd-be30270473b4.jpg" alt="GLITCH 咖啡雞尾酒" /></figure>
<figure><img src="https://images.vocus.cc/0dba7551-eb3e-4390-9dab-46be82a87327.jpg" alt="GLITCH 特製杯" /></figure>

<h2>品牌故事</h2>
<p>GLITCH品牌名稱源自創辦人鈴木清和的烘焙實驗——「錯誤代表意外的新發現」。全部四個據點的咖啡豆，均在神保町總部以PROBAT烘豆機統一烘焙。</p>
<figure><img src="https://images.vocus.cc/60a5744a-46c0-4d23-b74f-3562bd7ecedd.jpg" alt="GLITCH 神保町本店" /></figure>

<h2>其他分店資訊</h2>
<ul>
<li><strong>神保町本店</strong>（2015年創立）— 附近有多家知名咖哩餐廳</li>
<li><strong>大阪中之島</strong> — 大阪市中心景觀絕佳位置</li>
<li><strong>名古屋</strong> — 名古屋車站附近</li>
</ul>
<figure><img src="https://images.vocus.cc/163fa023-f40a-4718-a79e-56cd9f4e5893.jpg" alt="GLITCH 大阪" /></figure>
<figure><img src="https://images.vocus.cc/38b4d916-a50c-4b64-bb4d-c34bf80dbe32.jpg" alt="GLITCH 名古屋" /></figure>
</article>$html$,
  'https://images.vocus.cc/16712698-ed2b-402c-8856-b31fe91d3823.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['東京咖啡','銀座','GLITCH','精品咖啡','淺烘焙'],
  '咖啡旅行',
  'published',
  'GLITCH COFFEE GINZA 銀座分店完整介紹：空間設計、淺烘焙單品豆、咖啡雞尾酒及神保町、大阪、名古屋各分店資訊。',
  '2024-08-05 09:00:00+00',
  '2024-08-05 09:00:00+00',
  '2024-08-05 09:00:00+00'
);

-- Article 4: 石谷貴之3家咖啡廳 (2024-08-04 10:00)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '東京三度日本咖啡師冠軍石谷貴之打造的3家咖啡廳｜ash、Janu Tokyo、Anniversaire Cafe',
  'ishitani-takayuki-three-tokyo-cafes',
  '三度日本咖啡師大賽冠軍、2024年WBC季軍石谷貴之先生，在東京打造了零廢棄ash、奢華Janu Tokyo，以及25年時尚地標Anniversaire Cafe，三種截然不同的咖啡體驗。',
  $html$<article>
<p>日本咖啡師界指標人物——三度日本咖啡師大賽冠軍、2024年世界盃咖啡師大賽（WBC）季軍石谷貴之先生，在東京打造了三家風格迥異的咖啡廳。</p>
<figure><img src="https://images.vocus.cc/96d7e20c-82e2-4da6-9868-250eb26ed6e2.jpg" alt="石谷貴之先生" /></figure>

<h2>ash zero-waste cafe & bar — 涉谷</h2>
<p>由擁有多次世界最佳酒吧冠軍的SG集團，與石谷先生聯手打造。世界級調酒大師圖師聰先生負責酒譜與技術指導。以零廢棄（zero-waste）為核心概念，從菜單設計到日常營運都致力實踐。</p>
<figure><img src="https://images.vocus.cc/6d7cf5e9-caaa-458c-b326-b667c739ab24.jpg" alt="ash cafe bar" /></figure>
<p>咖啡與調酒品質俱佳，每位吧台手的專業表現令人印象深刻，吸引國內外觀光客與附近居民成為常客。</p>
<figure><img src="https://images.vocus.cc/60316ffd-af71-4657-9380-b52c252baeb8.jpg" alt="ash 空間設計" /></figure>

<h2>Janu Tokyo — 麻布台Hills</h2>
<p>麻布台Hills是東京最新人氣觀光景點，融合頂尖購物、美食與藝術。全球奢華品牌Aman旗下的全新品牌「Janu」，東京是全球首家開幕地。</p>
<figure><img src="https://images.vocus.cc/980c501f-3c08-4398-aa13-619f7f20fd18.jpg" alt="Janu Tokyo" /></figure>
<p>飯店內甜點店PATISSERIE的咖啡菜單，由石谷先生親自設計。主打中焙Janu Tokyo原創配方，苦味鮮明，適合搭配精緻甜點。另有冷萃、濃縮、拿鐵、卡布及特調草本咖啡通寧氣泡飲。</p>
<figure><img src="https://images.vocus.cc/04e01f14-c6b1-468f-ba71-de637b9ca8b7.jpg" alt="Janu Tokyo 甜點" /></figure>
<p>甜點出自野口主廚之手，強調五感體驗，水果的酸、和三盆的溫和甜、草本的清香完美平衡，造型優雅令人感動。</p>
<figure><img src="https://images.vocus.cc/1a3d94ba-68eb-43f1-be3e-b4d869a6a5e7.jpg" alt="Janu Tokyo 蛋糕" /></figure>

<h2>Anniversaire Cafe — 青山</h2>
<p>超過20年東京時尚指標咖啡廳，2023年9月慶祝25周年後整修重新開幕。石谷先生長年在此擔任咖啡師，藉此機緣推出精心策劃的COFFEE STAND。</p>
<figure><img src="https://images.vocus.cc/fb97f946-ef08-4d5d-8927-a6ba407f128a.jpg" alt="Anniversaire Cafe" /></figure>
<p>咖啡豆採用京都名店小川咖啡，菜單開發與咖啡師培訓均由石谷先生親自主導。天氣晴朗時可坐戶外，享受常出現在日劇中的東京時尚風景。</p>
<figure><img src="https://images.vocus.cc/efdde59e-13dc-4935-b623-1e05d634aa0e.jpg" alt="Anniversaire Cafe 戶外" /></figure>
<figure><img src="https://images.vocus.cc/9d5f224d-1044-4cdc-a31e-869ae1cc348a.jpg" alt="Anniversaire Cafe 咖啡" /></figure>

<h2>認識石谷貴之先生</h2>
<p>想更深入了解石谷先生的咖啡理念與人生故事，可參閱7月號C³offee咖啡誌的專訪報導。</p>
<figure><img src="https://images.vocus.cc/809639d1-5159-41c2-9934-6570686ead59.jpg" alt="C3offee 咖啡誌" /></figure>
</article>$html$,
  'https://images.vocus.cc/96d7e20c-82e2-4da6-9868-250eb26ed6e2.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['東京咖啡','咖啡師冠軍','ash','Janu Tokyo','Anniversaire Cafe','精品咖啡'],
  '咖啡旅行',
  'published',
  '三度日本咖啡師冠軍石谷貴之先生在東京打造的3家咖啡廳：ash zero-waste cafe、Janu Tokyo、Anniversaire Cafe完整介紹。',
  '2024-08-04 10:00:00+00',
  '2024-08-04 10:00:00+00',
  '2024-08-04 10:00:00+00'
);

-- Article 5: ash zero-waste cafe & bar (2024-08-04 08:00)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '東京涉谷必訪咖啡調酒 ash zero-waste cafe & bar｜日本咖啡師冠軍石谷貴之監製',
  'ash-zero-waste-cafe-bar-shibuya',
  '東京涉谷最受矚目的咖啡調酒複合式酒吧ash，由SG集團與日本咖啡師冠軍石谷貴之聯手打造，以零廢棄為核心，咖啡調酒品質皆達世界水準。',
  $html$<article>
<p>喜歡咖啡調酒嗎？到東京旅行一定要去 ash zero-waste cafe & bar。還未開幕前就受到矚目，被日本咖啡與調酒大師列為必去強店！2022年5月30日開幕後持續人氣不墜。</p>
<figure><img src="https://images.vocus.cc/c2ba59fd-4df3-4aa2-bb3f-03850f837b25.jpg" alt="ash zero-waste cafe bar 外觀" /></figure>

<h2>夢幻聯手</h2>
<p>由擁有多次世界最佳酒吧冠軍的SG集團，與三度日本咖啡師大賽冠軍、2024年WBC季軍石谷貴之先生聯手打造。日本咖啡調酒大賽常勝軍的圖師聰先生擔任酒譜與技術指導。</p>
<figure><img src="https://images.vocus.cc/b9e1752c-9c5d-4bdc-b19b-5dfede9a7cdb.jpg" alt="ash 吧台" /></figure>

<h2>咖啡菜單</h2>
<p>提供淺烘焙（Leaves Coffee Roasters 烘焙）與深烘焙（Obscura Roasters 烘焙）兩種配方，不定期與日本烘豆師合作推出限定款。可做成手沖、濃縮、美式、拿鐵、冷萃咖啡（Cold Brew）等，牛奶可替換為燕麥奶。</p>
<figure><img src="https://images.vocus.cc/96f37d40-e0eb-4064-a7d3-ab2f8a550b80.jpg" alt="ash 咖啡菜單" /></figure>
<figure><img src="https://images.vocus.cc/fc5fc1ac-5752-4091-b553-6eb0422f98e4.jpg" alt="ash 手沖咖啡" /></figure>

<h2>調酒菜單</h2>
<p>調酒分為兩大概念：咖啡調酒（Coffee Cocktails）和零廢棄經典（Zero-Waste Classics）。</p>
<ul>
<li><strong>濃縮馬丁尼</strong>：深烘焙版本濃郁苦香；淺烘焙藝伎豆版本華麗果香清爽</li>
<li><strong>改造牛奶咖啡與冷萃咖啡調酒</strong>：咖啡師技術的精彩展現</li>
<li><strong>零廢棄經典調酒</strong>：利用SG集團酒吧製作調酒剩餘的副產品（已萃取的香草、香料、水果）製作</li>
</ul>
<figure><img src="https://images.vocus.cc/4ea43d99-08b1-4e39-9906-072d2cf34cf5.jpg" alt="ash 濃縮馬丁尼" /></figure>
<figure><img src="https://images.vocus.cc/d83ae893-d5fe-4d1c-9a38-da12a5457927.jpg" alt="ash 咖啡調酒" /></figure>

<h2>零廢棄理念的具體實踐</h2>
<p>店名「ash」代表咖啡豆與無限可能的符號，從空間到制服都體現了零廢棄精神：</p>
<ul>
<li><strong>牆面</strong>：廢棄牛仔布製成的藍灰色牆面</li>
<li><strong>制服</strong>：以環保和紙纖維製作，廢棄後可回歸土壤</li>
<li><strong>外帶杯</strong>：可重複使用的原創杯，材料之一是咖啡果實外皮與殼</li>
<li><strong>咖啡渣</strong>：送至三浦半島青木農場當肥料，農場蔬菜再回到店內料理使用</li>
<li><strong>點餐</strong>：QRCode線上點餐，完全無紙化</li>
</ul>
<figure><img src="https://images.vocus.cc/911cd959-d53c-4b3e-9b98-ca9c9fb77e6a.jpg" alt="ash 空間設計" /></figure>
<figure><img src="https://images.vocus.cc/dab3ec65-77c5-47a1-ad31-ddb76d5751d6.jpg" alt="ash 廢棄牛仔布牆面" /></figure>

<h2>原創可麗露</h2>
<p>ash獨家甜點：使用咖啡豆生產過程中會被丟棄的咖啡果肉製作的可麗露，帶有獨特酸味，完美融合在外硬內Q軟的口感中，非常推薦！</p>
<figure><img src="https://images.vocus.cc/32f3a311-48ee-4244-8801-5d2191bf06cd.jpg" alt="ash 咖啡果肉可麗露" /></figure>
<figure><img src="https://images.vocus.cc/878261a6-e9eb-4b41-9e22-4c3ec76ef18a.jpg" alt="ash 整體空間" /></figure>
</article>$html$,
  'https://images.vocus.cc/c2ba59fd-4df3-4aa2-bb3f-03850f837b25.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['東京咖啡','涉谷','咖啡調酒','ash','零廢棄','精品咖啡'],
  '咖啡旅行',
  'published',
  '東京涉谷 ash zero-waste cafe & bar 完整介紹：咖啡菜單、調酒菜單、零廢棄理念實踐，由日本咖啡師冠軍石谷貴之監製。',
  '2024-08-04 08:00:00+00',
  '2024-08-04 08:00:00+00',
  '2024-08-07 09:00:00+00'
);

-- Article 6: 小川軒蘭姆葡萄奶油夾心餅乾 (2024-07-31)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '東京鎌倉小川軒蘭姆葡萄奶油夾心餅乾4家評比｜代官山、新橋、御茶水、鎌倉',
  'ogawaken-raisin-butter-cookie-comparison',
  '蘭姆葡萄奶油夾心餅乾界的天花板！關東地區4家「小川軒」完整評比：口感差異、蘭姆酒味、入手難易度與價格全面分析，找到最適合自己的一家。',
  $html$<article>
<p>說到蘭姆葡萄奶油夾心餅乾，大家第一個想到的可能是北海道六花亭。但在發現了小川軒的蘭姆葡萄奶油夾心餅乾後就愛上了——細緻的風味讓許多人第一次吃過後都覺得是神級美味，堪稱這個領域的天花板。</p>
<figure><img src="https://images.vocus.cc/9479d83a-393f-4b3e-b4ca-a8b4ba5b82c8.jpg" alt="小川軒蘭姆葡萄奶油夾心餅乾" /></figure>

<h2>關東4家小川軒的關係</h2>
<p>在關東地區，叫「小川軒」的共有4家：代官山、新橋（巴裡小川軒）、御茶水三家由三兄弟分別經營；鎌倉小川軒則是東京的遠房親戚。</p>
<figure><img src="https://images.vocus.cc/abb56874-2ea0-4763-b540-63eb10229887.jpg" alt="4家小川軒比較" /></figure>

<h2>入手難易度（由難至易）</h2>
<p>代官山 ⇨ 新橋 ⇨ 鎌倉 ⇨ 御茶水</p>
<ul>
<li><strong>代官山</strong>：最熱門，上午可能售罄，可事先預約，無法網路購買</li>
<li><strong>新橋</strong>：熱門，可預約，可網路購買</li>
<li><strong>鎌倉</strong>：最好入手，本店、戸塚工廠直營店及多個百貨均有，可網路購買</li>
<li><strong>御茶水</strong>：相對容易入手，可網路購買</li>
</ul>

<h2>4家口感完整評比</h2>

<h3>代官山小川軒</h3>
<p>奶油餡最濃郁，蘭姆酒香氣是4家中最喜歡的。酒味、奶味與甜味平衡最佳，葡萄乾單吃也好吃，整體細緻有高級感。</p>
<figure><img src="https://images.vocus.cc/fd290fc2-90d1-4759-8a2a-47adcce2bedc.jpg" alt="代官山小川軒" /></figure>

<h3>巴裡小川軒（新橋）</h3>
<p>餅乾是4家中最酥鬆、口感最濕潤，奶油餡最清爽，蘭姆酒味較淡，甜度剛好，是4家中價格最便宜的。</p>
<figure><img src="https://images.vocus.cc/aa6e5610-c634-4fbc-8b39-ec772978d22c.jpg" alt="新橋小川軒" /></figure>

<h3>御茶水小川軒</h3>
<p>餅乾奶油味最重，蘭姆酒味也最重，甜度相對較低，是大人口味。建議搭配飲料享用。</p>
<figure><img src="https://images.vocus.cc/aa88926e-1740-49db-8019-f1afa724437f.jpg" alt="御茶水小川軒" /></figure>

<h3>鎌倉小川軒</h3>
<p>餅乾最薄烤色最淺，口感接近六花亭，最適合大眾口味，小孩特別喜愛。獨家推出咖啡口味，是4家中唯一有咖啡風味選項的。</p>
<figure><img src="https://images.vocus.cc/9acae191-747a-4512-9837-a49305ae2c16.jpg" alt="鎌倉小川軒" /></figure>

<h2>價格與賞味期限（含鮮奶油需冷藏）</h2>
<ul>
<li><strong>代官山</strong>：10入 ¥1,600 / 賞味期限：製造起7天</li>
<li><strong>新橋</strong>：10入 ¥1,350 / 5入 ¥780 / 賞味期限：製造起5天</li>
<li><strong>御茶水</strong>：10入 ¥1,587 / 賞味期限：製造起7天</li>
<li><strong>鎌倉（原味）</strong>：10入 ¥1,600 / 5入 ¥830 / 3入 ¥500</li>
<li><strong>鎌倉（咖啡口味）</strong>：10入 ¥1,800 / 5入 ¥950 / 賞味期限：製造起6-7天</li>
</ul>
<figure><img src="https://images.vocus.cc/fe45887b-f501-4cd2-856a-1536ca034abc.jpg" alt="小川軒包裝" /></figure>

<h2>店鋪資訊</h2>
<ul>
<li><strong>代官山小川軒</strong>：東京都渋谷区代官山町10-13 / 03-3463-3660</li>
<li><strong>巴裡小川軒 新橋店</strong>：東京都港区新橋2-20-15 / 03-3571-7500</li>
<li><strong>お茶の水小川軒</strong>：東京都文京区湯島1-9-3 / 03-5802-5420</li>
<li><strong>鎌倉小川軒</strong>：神奈川県鎌倉市御成町8-1 / 0467-25-0660</li>
</ul>
</article>$html$,
  'https://images.vocus.cc/9479d83a-393f-4b3e-b4ca-a8b4ba5b82c8.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['東京甜點','鎌倉','伴手禮','蘭姆葡萄','餅乾'],
  '旅遊美食',
  'published',
  '關東4家小川軒蘭姆葡萄奶油夾心餅乾完整評比：代官山、新橋、御茶水、鎌倉，口感差異、價格與入手難易度全解析。',
  '2024-07-31 09:00:00+00',
  '2024-07-31 09:00:00+00',
  '2024-08-02 09:00:00+00'
);

-- Article 7: 耳掛咖啡 (2024-07-28)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '破解耳掛咖啡浸泡式咖啡包迷思｜沖繩豆波波、福岡豆香洞、大阪LiLo、京都WEEKENDERS',
  'drip-bag-coffee-guide-japan',
  '旅行時耳掛咖啡是輕便又高品質的選擇！一次破解新鮮度、安全性等3大迷思，並介紹沖繩、福岡、大阪、京都等咖啡名店的優質耳掛咖啡推薦。',
  $html$<article>
<p>旅行時通常會攜帶手沖器具，但有時為了減輕行李或節省時間，耳掛咖啡是非常實用的選擇。現代優質耳掛咖啡的風味已能高度還原現場沖煮的口感，也是造訪喜愛咖啡廳後帶回的最佳紀念。</p>
<figure><img src="https://images.vocus.cc/928ed3f7-bd48-4f03-8215-50fb47ca62e5.jpg" alt="耳掛咖啡" /></figure>

<h2>耳掛咖啡的歷史</h2>
<p>「耳掛咖啡」與「掛耳咖啡」是相同的東西，只是譯名不同。日本橫濱的BROOKS於1968年創立，約在2000年代普及化耳掛式滴濾咖啡包，帶動市場廣泛採用。日本紀念日協會將10月22日訂為「滴濾咖啡日」。</p>
<figure><img src="https://images.vocus.cc/a3e2e79b-e99c-45ac-980d-d1bab50feabb.jpg" alt="耳掛咖啡歷史" /></figure>

<h2>耳掛 vs 浸泡式</h2>
<p>耳掛咖啡如同免洗手沖濾紙，搭配方便的耳掛架構；浸泡式咖啡包則類似茶包，將咖啡粉浸泡在熱水中萃取。兩者都操作簡單、品質穩定。</p>
<figure><img src="https://images.vocus.cc/a7105f89-3e4e-4f3a-8bfa-55c9bedfab42.jpg" alt="耳掛與浸泡式比較" /></figure>

<h2>破解3大迷思</h2>

<h3>迷思1：耳掛咖啡不新鮮？</h3>
<p>現代優質耳掛咖啡包使用脫氧劑或充填氮氣，大幅減緩氧化速度至原來的1/10。品質優良的耳掛咖啡保存期限可達一年並維持新鮮風味。部分廠商採用特殊鋁箔包裝，保質期甚至可達三年。</p>
<figure><img src="https://images.vocus.cc/ddc2ac37-152d-40bc-8943-c4f1fa22eae4.jpg" alt="耳掛咖啡新鮮度" /></figure>

<h3>迷思2：濾紙含有害化學物質？</h3>
<p>網路盛傳濾紙含有濕強劑危害健康，但實際上耳掛咖啡的濾材使用不織布——合成與天然纖維的混合材質——完全不需要此類化學物質，可以安心使用。</p>

<h3>迷思3：耳掛咖啡品質差？</h3>
<p>優質的日本耳掛咖啡雖然價格較高，但能讓你在旅途中隨時享用高品質咖啡，同時省去大量沖煮時間，性價比相當高。</p>
<figure><img src="https://images.vocus.cc/7d6e2bc9-60c4-4702-9fdd-145dc29bbea1.jpg" alt="耳掛咖啡品質" /></figure>

<h2>沖煮建議</h2>
<p>以90–94°C熱水沖煮，先少量注水悶蒸（排氣），再分3至4次注水，總用水量約150–180克，即可得到一杯風味完整的咖啡。</p>
<figure><img src="https://images.vocus.cc/3bc8d35f-784d-4e99-b19a-441d09870439.jpg" alt="耳掛咖啡沖煮方式" /></figure>

<h2>日本咖啡名店推薦耳掛</h2>
<ul>
<li><strong>豆波波（沖繩）</strong>：沖繩代表性烘焙咖啡廳，充滿熱帶風情的精品咖啡</li>
<li><strong>豆香洞（福岡）</strong>：福岡知名烘焙廠，深厚的烘焙技術與豐富豆款</li>
<li><strong>LiLo Coffee（大阪）</strong>：大阪精品咖啡代表，清爽淺烘焙風格</li>
<li><strong>WEEKENDERS Coffee（京都）</strong>：京都人氣精品咖啡廳，果香明亮的淺焙耳掛</li>
<li><strong>富士山咖啡</strong>：以富士山為主題的特色包裝，風景與風味兼具的絕佳伴手禮</li>
</ul>
<figure><img src="https://images.vocus.cc/e33bb199-7279-47be-83af-d246a5969d09.jpg" alt="豆波波 沖繩" /></figure>
<figure><img src="https://images.vocus.cc/fb015b68-9cb4-443d-bc72-d1b99af2f625.jpg" alt="LiLo Coffee 大阪" /></figure>
<figure><img src="https://images.vocus.cc/7b38bf57-7c3f-4d8c-b615-9bfbd52ddc3b.jpg" alt="WEEKENDERS 京都" /></figure>
<figure><img src="https://images.vocus.cc/7965899c-c9aa-4650-85aa-fa0986ab17f9.jpg" alt="富士山咖啡耳掛" /></figure>
</article>$html$,
  'https://images.vocus.cc/928ed3f7-bd48-4f03-8215-50fb47ca62e5.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['咖啡知識','耳掛咖啡','日本咖啡','旅行咖啡','掛耳咖啡'],
  '咖啡知識',
  'published',
  '耳掛咖啡3大迷思完整破解，以及日本咖啡名店推薦：沖繩豆波波、福岡豆香洞、大阪LiLo、京都WEEKENDERS、富士山咖啡。',
  '2024-07-28 09:00:00+00',
  '2024-07-28 09:00:00+00',
  '2024-07-28 09:00:00+00'
);

-- Article 8: TORAYA GINZA (2024-07-26)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '東京銀座虎屋TORAYA GINZA現點現做銅鑼燒｜和菓子職人現場製作，近500年老舖體驗',
  'toraya-ginza-wagashi-cafe',
  '2024年4月全新改裝的TORAYA GINZA，設有職人現場製作和菓子的吧台座位。現點現做銅鑼燒與期間限定生菓子令人感動，山椒口味羊羹更是驚喜，是銀座必訪和菓子體驗。',
  $html$<article>
<p>2024年4月全新改裝的虎屋銀座咖啡廳（TORAYA GINZA）終於親自造訪。對熱愛和菓子的旅人而言，TORAYA GINZA非常值得專程一去。</p>
<figure><img src="https://images.vocus.cc/87ba93ff-955f-4d67-af2f-27572d236481.jpg" alt="TORAYA GINZA 外觀" /></figure>

<h2>職人現場製作體驗</h2>
<p>改裝後特別設置了4個可近距離觀看和菓子職人現場製作點心的吧台座位，需事先預約。即使坐在一般座位，舒適的沙發座與戶外座位同樣令人放鬆。</p>
<figure><img src="https://images.vocus.cc/de7a30bc-98e3-4f45-a003-112872336ed6.jpg" alt="TORAYA GINZA 職人吧台" /></figure>

<h2>空間設計</h2>
<p>店鋪內裝由建築家內藤廣先生操刀，牆壁採用低調光澤的瓦片磁磚，精心設計空間音效，營造精緻優雅的氛圍。入口設於中央通附近的「鈴蘭通」巷內，搭電梯至4樓即可抵達。</p>
<figure><img src="https://images.vocus.cc/2e9b1aaf-f1e6-4b04-9269-b220b4e8f873.jpg" alt="TORAYA GINZA 內部空間" /></figure>

<h2>現點現做銅鑼燒</h2>
<p>客人點單後才現烤麵皮並製作。軟綿綿的外皮帶有麵粉香氣，搭配綿密小倉紅豆餡，靈感來自陰雲中隱約浮現的滿月，香氣與口感都無可挑剔。</p>
<figure><img src="https://images.vocus.cc/44c79b49-81ba-430f-89af-da00de744d12.jpg" alt="TORAYA GINZA 現點現做銅鑼燒" /></figure>
<figure><img src="https://images.vocus.cc/41275e47-0990-42eb-a1f5-9f7fce6dd4df.jpg" alt="銅鑼燒製作過程" /></figure>

<h2>期間限定生菓子「陽の香」</h2>
<p>混合馬斯卡彭起司與白鳳豆餡做成的練切菓子，撒上黃檸檬皮，如同太陽光芒。甜中帶微微起司酸，加上清爽檸檬香，完全打破和菓子超級甜的既有印象，讓人感動到差點落淚。</p>
<figure><img src="https://images.vocus.cc/7b67d797-1e3c-48eb-bb50-adbf26eed62a.jpg" alt="陽の香 期間限定生菓子" /></figure>
<figure><img src="https://images.vocus.cc/d1c0334f-dc1d-4f18-833b-9e3643292859.jpg" alt="TORAYA 限定生菓子" /></figure>

<h2>一口羊羹</h2>
<p>點生菓子套餐附贈一口羊羹，除傳統紅豆、抹茶口味外，還有山椒、百香果、萊姆等季節限定口味。當天吃到的山椒口味羊羹讓人驚為天人，離開後立刻帶了2盒回家。</p>
<figure><img src="https://images.vocus.cc/e36a44e9-8e0c-4278-9d9b-97188e9fd936.jpg" alt="TORAYA 一口羊羹" /></figure>
<figure><img src="https://images.vocus.cc/d696c69c-7bf3-4bb5-8e01-01a374237945.jpg" alt="TORAYA 羊羹各口味" /></figure>

<h2>飲品菜單</h2>
<p>熱飲7種：黑咖啡、低因咖啡、抹茶、薄煎茶、濃煎茶、紅茶、烘焙茶。冷飲3種：冰咖啡、白蜜冷抹茶、冷煎茶。另有宇治金時冰等甜點可選。</p>
<figure><img src="https://images.vocus.cc/bee52688-4fe4-4a66-82a8-f0fe0114da78.jpg" alt="TORAYA GINZA 飲品" /></figure>

<h2>虎屋近500年品牌歷史</h2>
<p>虎屋創立於15世紀的京都，自1581年起製作供天皇享用的和菓子，1869年遷移東京，1947年在銀座開設現址。今年4月11號改裝後全新開幕，跨越近500年的老舖，至今持守「製作吃了會感到愉悅的美味和菓子」的精神。</p>
<figure><img src="https://images.vocus.cc/b8d0fce1-f1fb-439f-879c-0354ddca024a.jpg" alt="虎屋品牌歷史" /></figure>
<p><strong>營業時間：</strong>11:00–19:00</p>
</article>$html$,
  'https://images.vocus.cc/87ba93ff-955f-4d67-af2f-27572d236481.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['東京甜點','銀座','和菓子','虎屋','TORAYA'],
  '旅遊美食',
  'published',
  'TORAYA GINZA 2024年全新改裝後完整體驗：現點現做銅鑼燒、期間限定生菓子陽の香、山椒羊羹，以及近500年老舖品牌故事。',
  '2024-07-26 09:00:00+00',
  '2024-07-26 09:00:00+00',
  '2024-07-26 09:00:00+00'
);

-- Article 9: CENTRE THE BAKERY (2024-07-25 10:00)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '東京銀座最強法式吐司 CENTRE THE BAKERY｜不用烤就好吃的吐司及超濃郁北海道奶油',
  'centre-the-bakery-ginza-french-toast',
  '被日本法式吐司達人封為最強法式吐司的CENTRE THE BAKERY，外皮酥香、奶香蛋香糖香三重奏，連知名甜點主廚都說無法在家重現，是銀座絕對必訪。',
  $html$<article>
<p>無論吃幾次都很驚豔——被日本法式吐司達人稱為「最強法式吐司」的，就是CENTRE THE BAKERY 的法式吐司。一般在家大多能做出不錯的法式吐司，但CENTRE的法式吐司無論味道還是口感，連知名甜點主廚朋友都說在家無法重現。</p>
<figure><img src="https://images.vocus.cc/213f99a5-bd1c-4b98-9ca6-3f6c47126f9a.jpg" alt="CENTRE THE BAKERY 法式吐司" /></figure>

<h2>為什麼是最強？</h2>
<p>外表閃閃發光的金黃烤色，外皮微微酥感，內層吐司吸滿蛋液，柔軟中帶嚼勁。奶香、蛋香與糖香三者互相襯托，連吐司邊都好吃，真的是吃過完成度最高最愛的法式吐司。</p>

<h2>超有趣：自選烤吐司機</h2>
<p>內用還可以選自己喜歡的烤吐司機！機台品牌和款式有蠻多種，這個細節讓用餐體驗更添趣味。</p>
<figure><img src="https://images.vocus.cc/c90dc4aa-4df9-4222-b0ab-88bc0449e116.jpg" alt="CENTRE 烤吐司機選擇" /></figure>

<h2>吐司套餐推薦</h2>

<h3>果醬套餐</h3>
<p>2片 ¥1,200 / 3片 ¥1,400，可選3種果醬：覆盆子、柑橘、藍莓、白巧克力、大黃、蜂蜜。吐司可選2種或3種麵粉（日本、北美、英國或加拿大）。</p>

<h3>奶油套餐</h3>
<p>2片 ¥1,000 / 3片 ¥1,100，附3種產地奶油：法國伊思妮奶油、美瑛放牧酪農場奶油、日本各地區產奶油。北海道產奶油香甜濃醇，令人感動。</p>

<h3>果醬加奶油套餐</h3>
<p>2片 ¥1,500 / 3片 ¥1,700，同時享有果醬與3種產地奶油的雙重美味。</p>
<figure><img src="https://images.vocus.cc/d5f3c8e8-5b63-4831-952e-5474ad21e4a6.jpg" alt="CENTRE 吐司套餐" /></figure>

<h2>三明治系列</h2>

<h3>玉子燒三明治</h3>
<p>煎得軟嫩香甜的玉子燒，夾在柔軟吐司中，對於玉子燒控而言吃過就難忘。</p>
<figure><img src="https://images.vocus.cc/843d421a-8820-4641-b200-26c333f2cbf1.jpg" alt="CENTRE 玉子燒三明治" /></figure>

<h3>炸牛排三明治</h3>
<p>牛肉軟嫩，處理功力了得。外酥內軟的吐司搭配炸得恰到好處的牛排，肉汁浸潤吐司，香氣與味道令人難忘。</p>

<h3>炸豬排三明治</h3>
<p>炸得酥脆、鮮甜多汁的豬排三明治，是CENTRE的超人氣商品，日式早餐定番。</p>

<h3>鮮奶油水果三明治</h3>
<p>季節性水果：麝香葡萄、水蜜桃、芒果等，搭配鮮奶油。切三明治剩下的吐司邊會附上清爽鮮奶油，不浪費每一口好滋味。</p>

<h2>外帶整條吐司</h2>
<p>不內用的話，可以外帶不用烤就很好吃的整條吐司，是飯店早餐或送禮的絕佳選擇。</p>
</article>$html$,
  'https://images.vocus.cc/213f99a5-bd1c-4b98-9ca6-3f6c47126f9a.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['東京美食','銀座','法式吐司','CENTRE THE BAKERY','吐司'],
  '旅遊美食',
  'published',
  'CENTRE THE BAKERY 最強法式吐司完整介紹：吐司套餐比較、三明治系列推薦，以及可自選烤吐司機的有趣用餐體驗。',
  '2024-07-25 10:00:00+00',
  '2024-07-25 10:00:00+00',
  '2024-07-25 10:00:00+00'
);

-- Article 10: 天七天婦羅 (2024-07-25 08:00)
INSERT INTO blog_posts (id, title, slug, excerpt, content, cover_image_url, author_name, tags, category, status, meta_description, published_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '橫濱米其林日料天婦羅名店天七｜關內老鋪TENSHICHI，10道料理僅需4999日幣',
  'yokohama-tenshichi-tempura-michelin',
  '米其林一星、TABEROGU百名店的天婦羅日料店天七，10道料理加精選日本酒套餐僅4999日幣，椿油秘訣、季節食材與職人技術皆達最高水準，是橫濱必訪隱藏名店。',
  $html$<article>
<p>橫濱旅行有個難以忘記的味道，就是天七。天七是位於橫濱市關內的天婦羅（天ぷら）料理店。</p>
<figure><img src="https://images.vocus.cc/f5d2b27d-3b5d-4a23-989c-d526a7ed61f7.jpg" alt="天七 天婦羅" /></figure>

<h2>驚人的性價比</h2>
<p>米其林一星、TABEROGU百名店的天婦羅日料店，10道料理＋3種搭餐酒＋飯後甜點，一套只要4999日幣！而且日本酒是非常好的酒，還給了2合，光酒單點就要3000日幣了。除了CP值超高，職人日料店最重要的技術、敏銳度、食材、氣味和五感體驗，天七表現都非常優秀。</p>
<figure><img src="https://images.vocus.cc/0909bedb-3e01-4434-b876-55b393a12ccd.jpg" alt="天七 套餐" /></figure>

<h2>天婦羅麵衣的學問</h2>
<p>天婦羅的麵衣是根據當天氣候變化來調整蛋、水和麵粉的比例，是非常細膩的作業。每天雖然炸著同樣的天婦羅麵衣，但每天都要因氣候和食材的細微變化而調整——這份敏銳度正是天婦羅職人最重要的能力之一。</p>
<figure><img src="https://images.vocus.cc/b720fd97-5294-47cd-9279-d698347d1651.jpg" alt="天七 天婦羅麵衣" /></figure>

<h2>獨特的椿油秘方</h2>
<p>天七除精選芝麻油外，還特別使用椿油（椿の金ぷら油）。椿油比芝麻油更耐熱，熱傳導更佳，能提升食材細緻美味，且即使加熱，豐富的油酸等營養成分也不易流失。2種油的混合比單一芝麻油更不易感到油膩。</p>
<figure><img src="https://images.vocus.cc/3a666413-6a57-4881-a377-e08847dc664c.jpg" alt="天七 用油" /></figure>

<h2>嚴選季節食材</h2>
<ul>
<li><strong>春天</strong>：白魚、油菜花、山菜類</li>
<li><strong>夏天</strong>：香魚、鱚魚、星鰻、鮑魚、海螺</li>
<li><strong>秋天</strong>：秋刀魚、海膽、銀杏</li>
<li><strong>冬天</strong>：牡蠣、白子、螃蟹、根莖類蔬菜</li>
</ul>
<figure><img src="https://images.vocus.cc/a5024c44-1f48-465c-afd3-2a36e83846fc.jpg" alt="天七 季節食材" /></figure>

<h2>細節的講究</h2>
<p>搭配天婦羅的蘿蔔泥、醬汁與3種口味海藻鹽（原味、咖哩、日本竹子草）都是嚴選。炸蔬菜分2份，讓食客分別體驗沾醬與沾鹽的不同風味。</p>
<figure><img src="https://images.vocus.cc/31f2ded1-6b8e-4440-9e39-7651f632e289.jpg" alt="天七 配料" /></figure>

<h2>吧台如舞台</h2>
<p>料理長五十嵐一志先生認為吧台就像舞台，從舞台上細心觀察客人的喜好、用餐速度、氛圍與關係，力求每道天婦羅以最佳狀態呈現。上菜的順序與間隔時間都拿捏得恰恰好。</p>
<figure><img src="https://images.vocus.cc/1a00f53d-3461-4924-a61c-13440ca9d79e.jpg" alt="天七 吧台" /></figure>

<h2>精選日本酒搭餐</h2>
<p>由專業唎酒師搭配選酒：開始先以華麗果香的大吟釀搭配炸海鮮，中段換清爽辛口清酒引出炸蔬菜的鮮甜，搭配漂亮酒器更添雅趣，日本酒給得非常足，真心喜愛。</p>
<figure><img src="https://images.vocus.cc/c34beaa4-6b8b-46e6-be76-9cf57182d0a1.jpg" alt="天七 日本酒搭餐" /></figure>

<h2>飯後甜點空間</h2>
<p>最後以清爽檸檬雪酪作為飯後甜點，特別安排了另一個空間供客人悠閒享用，讓食客吃飽喝足後可以慢慢喝茶休息。</p>
<figure><img src="https://images.vocus.cc/b07da3fb-e52d-4ce9-869d-47b444b6cf59.jpg" alt="天七 甜點" /></figure>

<h2>職人的修行之路</h2>
<p>今年59歲的五十嵐一志先生，在這行已40年，但仍認為每天都是修行與學習。他說：「當專注於如何讓每一種食材都變得美味，就會越來越深入到天婦羅的世界。雖然天婦羅看似只要把食材炸熟，但這並不是全部，也不有趣。」</p>
<figure><img src="https://images.vocus.cc/f3c46b09-d793-48ef-b6e5-75dc220b81ce.jpg" alt="天七 料理長" /></figure>
<p><strong>建議事先預約，人氣店家座位有限。</strong></p>
</article>$html$,
  'https://images.vocus.cc/f5d2b27d-3b5d-4a23-989c-d526a7ed61f7.jpg',
  '咖啡旅行家・Hola I''m Ryoko',
  ARRAY['橫濱美食','天婦羅','米其林','日料','關內'],
  '旅遊美食',
  'published',
  '橫濱米其林一星天婦羅名店天七完整介紹：10道料理加日本酒套餐僅4999日幣，椿油秘訣、季節食材與職人修行之路全記錄。',
  '2024-07-25 08:00:00+00',
  '2024-07-25 08:00:00+00',
  '2024-07-25 08:00:00+00'
);
