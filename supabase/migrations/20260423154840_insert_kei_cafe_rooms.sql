/*
  # Insert kei.cafe K1 rooms for 小K咖啡B&B

  Sourced from https://kei.cafe/room/K1

  4 Rooms:
  1. 整棟包棟  — whole-building rental, up to 12 guests
  2. 301 山田美景泡湯房 — 3F, 2–4 guests, soaking tub
  3. 201 山田美景泡湯雙人房 — 2F, 2 guests, soaking tub
  4. 205 家庭雙房 — 2F, 2–4 guests

  All linked to hotel_id = 4b75feef-7e2f-4a45-ba09-437d18e3e1bd (小K咖啡B&B)
  and vendor_id = 299e21b3-7527-4504-bc13-426771ff0fc0 (澄宜有限公司)
*/

INSERT INTO tbl_rooms (
  vendor_id, hotel_id,
  name, description, room_type,
  capacity, min_capacity,
  price_per_night, weekend_price,
  floor, location,
  image_url, images, amenities,
  is_available
)
VALUES
(
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  '4b75feef-7e2f-4a45-ba09-437d18e3e1bd',
  '整棟包棟',
  '獨棟農舍，位於宜蘭三星鄉田園之中。備有寬敞客廳大餐桌、全牛皮沙發、WIFI 6光纖網路，適合家庭聚會或包棟度假。可入住6至12人，包棟早餐另計每人300元。寵物友善，提供2台停車位。',
  'family',
  12, 6,
  19800, 26800,
  '', '宜蘭縣三星鄉大義六路33號',
  'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg',
  '["https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg","https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg","https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg"]'::jsonb,
  '["客廳大餐桌","全牛皮沙發","WIFI 6光纖網路","監視器","可停2台車","寵物友善","毛巾及盥洗用品","冷暖空調","早餐(另計)"]'::jsonb,
  true
),
(
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  '4b75feef-7e2f-4a45-ba09-437d18e3e1bd',
  '301 山田美景泡湯房',
  '三樓山田美景泡湯雙人房，可加床最多4人入住。頂級訂製床搭配實木床架，大浴缸景觀泡湯，TOTO溫座免治馬桶、55吋4K智慧電視、WIFI 6網路。房型寬敞舒適，窗外稻田與遠山美景盡收眼底。含早餐。',
  'double',
  4, 2,
  4900, 5900,
  '3F', '宜蘭縣三星鄉大義六路33號',
  'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg',
  '["https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg","https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg","https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg"]'::jsonb,
  '["頂級訂製床","實木床架","大浴缸泡湯","TOTO溫座免治馬桶","55吋4K智慧電視","WIFI 6","冷暖空調","毛巾及盥洗用品","早餐"]'::jsonb,
  true
),
(
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  '4b75feef-7e2f-4a45-ba09-437d18e3e1bd',
  '201 山田美景泡湯雙人房',
  '二樓雙人房，窗外稻田與遠山景色一覽無遺。房內設有泡湯浴缸，冷暖空調完善，高功率吹風機，提供洗髮精及沐浴乳。含早餐。',
  'double',
  2, 2,
  4900, 5900,
  '2F', '宜蘭縣三星鄉大義六路33號',
  'https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg',
  '["https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg","https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg","https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg"]'::jsonb,
  '["泡湯浴缸","冷暖空調","高功率吹風機","洗髮精及沐浴乳","毛巾提供","WIFI 6","SmartTV","早餐"]'::jsonb,
  true
),
(
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  '4b75feef-7e2f-4a45-ba09-437d18e3e1bd',
  '205 家庭雙房',
  '二樓家庭雙人房，適合2至4人入住。房內設有泡湯浴缸、實木床架，SmartTV及全房WIFI 6無線網路覆蓋。適合親子或小家庭旅遊。含早餐。',
  'family',
  4, 2,
  4900, 5900,
  '2F', '宜蘭縣三星鄉大義六路33號',
  'https://images.pexels.com/photos/3209049/pexels-photo-3209049.jpeg',
  '["https://images.pexels.com/photos/3209049/pexels-photo-3209049.jpeg","https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg","https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg"]'::jsonb,
  '["泡湯浴缸","實木床架","SmartTV","全房WIFI 6","冷暖空調","毛巾及盥洗用品","早餐"]'::jsonb,
  true
);
