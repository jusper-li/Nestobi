/*
  # Insert 根本町＋桃月屋民宿 (K2) hotel and rooms

  Source: https://kei.cafe/room/K2
  Vendor: 澄宜有限公司 (same kei.cafe series operator, phone 0970263183)

  NOTE: 根本家民宿 (hotel id df73db6c, 大義八路590號, 登記2591) is a separate property.
        This is 根本町 (上將路二段689號, 登記2249) + 桃月屋 (691號, 登記2265).

  1. New Hotel: 根本町＋桃月屋民宿
     - 宜蘭縣三星鄉上將路二段689-691號
     - 兩棟相鄰合法民宿，最多容納12人（兩棟合計24人）
     - Tesla Type 2 免費充電、寵物友善（最多6隻）、提供早餐（另計）

  2. Rooms (3):
     - 整棟包棟：2–12 人，平日 8888–13900，假日 20900
     - 四人房：2–4 人，2–3F，泡湯大浴缸
     - 兩人房：2–4 人，2–3F，落地窗露台
*/

-- 1. Insert hotel
INSERT INTO hotels (
  vendor_id, name, description,
  address, city,
  phone, line_id, facebook,
  star_rating, registration_number,
  pet_friendly, deposit_amount,
  checkin_time, checkout_time,
  is_active, image_url
)
VALUES (
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  '根本町＋桃月屋民宿',
  '位於宜蘭縣三星鄉的兩棟相鄰合法民宿（根本町登記號2249號、桃月屋2265號），地址為上將路二段689-691號。採眠豆腐頂級芝麻豆腐床，AVEDA精油備品，每間房配備4K HDR SmartTV、冷暖空調、高速WiFi。公共空間有22坪大客廳、10人餐桌、75吋4K智慧電視、HomePod音樂、電動麻將桌、桌遊、兒童溜滑梯、兒童電動車、WiFi 6全覆蓋、Tesla Type 2免費充電、自動製冰冰箱，停車3台（路邊白線可加停）。寵物友善（最多6隻，500元/隻），平日可加訂早餐。',
  '宜蘭縣三星鄉上將路二段689-691號', '宜蘭',
  '0970263183', '@2KHome', 'K2 Cafe',
  4, '2249、2265',
  true, 3000,
  '15:00', '11:00',
  true,
  'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg'
);

-- 2. Insert rooms
WITH new_hotel AS (
  SELECT id FROM hotels
  WHERE name = '根本町＋桃月屋民宿'
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
    '整棟包棟',
    '整棟包租兩棟相鄰民宿，最多可容納12人（兩棟合計24人）。2–7人平日8888元，8–11人平日11900元、假日18900元，12人以上平日13900元、假日20900元，跨年/農曆年25900元。寒暑假期間另有旺季加價。含22坪大客廳、10人餐桌、75吋4K電視、電動麻將桌、桌遊、兒童溜滑梯、兒童電動車、全套廚房、Tesla Type 2免費充電，停車3台（路邊加停）。廚房及烤肉區使用另計費用，加床500元（最多2床），加被300元/件，寵物500元/隻（最多6隻），早餐平日600–800元/人。',
    'family',
    12, 2,
    13900::numeric, 20900::numeric,
    '', '宜蘭縣三星鄉上將路二段689-691號',
    'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg',
    '["https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg","https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg","https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg"]',
    '["眠豆腐頂級芝麻豆腐床","4K HDR SmartTV","冷暖空調","高速WiFi 6","22坪大客廳","10人餐桌","75吋4K智慧電視","HomePod音響","電動麻將桌","桌遊","兒童溜滑梯","兒童電動車","全套廚房","自動製冰冰箱","Tesla Type 2免費充電","停車3台","AVEDA精油備品","寵物友善","寶寶澡盆"]'
  ),
  (
    '四人房',
    '2–3樓寬敞四人房，採用眠豆腐頂級芝麻豆腐床，配備泡湯大浴缸、乾濕分離衛浴、4K HDR SmartTV、冷暖空調、高速WiFi及AVEDA精油備品。寵物友善，備有寶寶澡盆。',
    'family',
    4, 2,
    4900::numeric, 6900::numeric,
    '2-3F', '宜蘭縣三星鄉上將路二段689-691號',
    'https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg',
    '["https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg","https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg","https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg"]',
    '["眠豆腐頂級芝麻豆腐床","泡湯大浴缸","乾濕分離衛浴","4K HDR SmartTV","冷暖空調","高速WiFi 6","AVEDA精油備品","寵物友善","寶寶澡盆","Tesla Type 2免費充電","停車3台"]'
  ),
  (
    '兩人房',
    '2–3樓精緻兩人房（可加人至4人），採用眠豆腐頂級芝麻豆腐床，特色落地窗露台飽覽田園風光。配備大窗浴室、4K HDR SmartTV、冷暖空調、高速WiFi及AVEDA精油備品。寵物友善，備有寶寶澡盆。',
    'double',
    4, 2,
    3900::numeric, 5500::numeric,
    '2-3F', '宜蘭縣三星鄉上將路二段689-691號',
    'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
    '["https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg","https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg","https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg"]',
    '["眠豆腐頂級芝麻豆腐床","落地窗露台","大窗浴室","4K HDR SmartTV","冷暖空調","高速WiFi 6","AVEDA精油備品","寵物友善","寶寶澡盆","Tesla Type 2免費充電","停車3台"]'
  )
) AS r(name, description, room_type, capacity, min_capacity, price_per_night, weekend_price, floor, location, image_url, images, amenities);
