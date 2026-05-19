/*
  # Insert 五分醒電梯民宿 (K7) hotel and rooms

  Source: https://kei.cafe/room/K7
  Vendor: 澄宜有限公司 (same kei.cafe series operator)

  1. New Hotel: 五分鈿＋五分醒民宿
     - 宜蘭縣三星鄉五分路一段 141-143號
     - 合法民宿登記號碼 2710 + 2711
     - 電梯大樓，共用廚房、BBQ 區、4K 投影、電動麻將

  2. Rooms (2):
     - 田園全景四人房：4 人，平日 3900，假日 5000
     - 山田美景雙人房：2 人，平日 3600，假日 4500
*/

-- 1. Insert hotel
INSERT INTO hotels (
  vendor_id, name, description,
  address, city,
  phone, line_id,
  star_rating, registration_number,
  pet_friendly, is_active,
  image_url
)
VALUES (
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  '五分鈿＋五分醒民宿',
  '位於宜蘭縣三星鄉、羅東、員山三鄉鎮交界地帶的電梯合法民宿（登記號碼：2710＋2711）。兩棟相鄰物件，地址為五分路一段141號（五分鈿）與143號（五分醒）。備有電梯、4K投影系統、電動麻將桌、全套廚房（IH爐、自動製冰冰箱、烤箱、微波爐）、高速 Mesh WiFi 全區覆蓋及戶外大型 BBQ 烤肉區（附遮雨棚），多車停車位，適合家庭或團體入住。',
  '宜蘭縣三星鄉五分路一段141-143號', '宜蘭',
  '0970263183', '@kei.cafe.bnb',
  4, '2710、2711',
  false, true,
  'https://images.pexels.com/photos/2506990/pexels-photo-2506990.jpeg'
);

-- 2. Insert rooms
WITH new_hotel AS (
  SELECT id FROM hotels
  WHERE name = '五分鈿＋五分醒民宿'
    AND vendor_id = '299e21b3-7527-4504-bc13-426771ff0fc0'
  LIMIT 1
)
INSERT INTO tbl_rooms (
  vendor_id, hotel_id,
  name, description, room_type,
  capacity, min_capacity,
  price_per_night, weekend_price,
  floor, location,
  image_url, images, amenities,
  is_available
)
SELECT
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  new_hotel.id,
  r.name, r.description, r.room_type,
  r.capacity, r.min_capacity,
  r.price_per_night, r.weekend_price,
  r.floor, r.location,
  r.image_url, r.images::jsonb, r.amenities::jsonb,
  true
FROM new_hotel,
(VALUES
  (
    '田園全景四人房',
    '寬敞四人房，擁有大面明亮採光窗，田園景致盡收眼底。乾濕分離衛浴配備浴缸、Panasonic 溫座免治馬桶及暖風機。頂級訂製床、HITACHI冷暖空調、50吋4K Sony智慧電視、高速WiFi。旺季平日4500元、旺季假日6000元。',
    'family',
    4, 2,
    3900::numeric, 5000::numeric,
    '', '宜蘭縣三星鄉五分路一段141-143號',
    'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
    '["https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg","https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg","https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg"]',
    '["頂級訂製床","大採光窗","乾濕分離衛浴","浴缸","Panasonic溫座免治馬桶","Panasonic暖風機","HITACHI冷暖空調","50吋4K Sony智慧電視","高速WiFi","電梯","共用廚房","4K投影","電動麻將","BBQ烤肉區"]'
  ),
  (
    '山田美景雙人房',
    '精緻雙人房，窗外稻田與山景相映成趣。乾濕分離衛浴配備浴缸、Panasonic 溫座免治馬桶及暖風機。頂級訂製床、HITACHI冷暖空調、50吋4K Sony智慧電視、高速WiFi。旺季平日4000元、旺季假日5000元。',
    'double',
    2, 2,
    3600::numeric, 4500::numeric,
    '', '宜蘭縣三星鄉五分路一段141-143號',
    'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
    '["https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg","https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg","https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg"]',
    '["頂級訂製床","山田景觀窗","乾濕分離衛浴","浴缸","Panasonic溫座免治馬桶","Panasonic暖風機","HITACHI冷暖空調","50吋4K Sony智慧電視","高速WiFi","電梯","共用廚房","4K投影","電動麻將","BBQ烤肉區"]'
  )
) AS r(name, description, room_type, capacity, min_capacity, price_per_night, weekend_price, floor, location, image_url, images, amenities);
