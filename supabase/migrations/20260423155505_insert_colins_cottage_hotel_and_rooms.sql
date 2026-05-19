/*
  # Insert Colin's Cottage (K4) hotel and rooms

  Source: https://kei.cafe/room/K4
  Vendor: 澄宜有限公司 (same operator as 小K咖啡B&B, same phone 0970263183)

  1. New Hotel: Colin's Cottage 科林小屋
     - 宜蘭縣冬山鄉，合法民宿登記號碼 1797
     - 日式綠建築農舍，寵物友善，押金 3000 元

  2. Rooms (4):
     - 整棟包棟：6–14 人，平日 9999–15900，假日 22900–26900
     - 閣樓遊戲室家庭房：4–6 人，1F
     - 和式景觀房：4 人，1F
     - 家庭大房：6–8 人，2F
*/

-- 1. Insert hotel
INSERT INTO hotels (
  vendor_id, name, description,
  address, city,
  phone, line_id,
  star_rating, registration_number,
  pet_friendly, deposit_amount,
  image_url, is_active
)
VALUES (
  '299e21b3-7527-4504-bc13-426771ff0fc0',
  'Colin''s Cottage 科林小屋',
  '位於宜蘭縣冬山鄉稻田之中的獨棟農舍民宿，由日本建築師設計，採綠建築工法，以天然矽藻土牆壁與木構造打造。合法登記民宿（登記號碼：1797），空間寬敞可容納最多14人。備有電動麻將桌、8人餐桌、4K影音設備，提供AVEDA備品，設有4台停車位，寵物友善（最多2隻，每隻500元）。',
  '宜蘭縣冬山鄉', '宜蘭',
  '0970263183', '@kei.cafe.bnb',
  4, '1797',
  true, 3000,
  'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg',
  true
) RETURNING id;

-- 2. Insert rooms using the newly created hotel id
WITH new_hotel AS (
  SELECT id FROM hotels
  WHERE name = 'Colin''s Cottage 科林小屋'
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
    '整棟獨立農舍，兩層樓設計，含四間4人房及兩間2人房，共3套衛浴＋2間廁所。備有電動麻將桌、8人餐桌、4K影音系統、各房獨立冷暖空調、高速WiFi及大型冰箱。享稻田山景，可停4台車。廚房使用另計1000元，BBQ烤肉區另計1000元。6–14人均可入住，為家庭聚會或企業包棟首選。',
    'family',
    14, 6,
    15900::numeric, 22900::numeric,
    '', '宜蘭縣冬山鄉',
    'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg',
    '["https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg","https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg","https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg"]',
    '["電動麻將桌","8人餐桌","4K影音系統","各房獨立冷暖空調","高速WiFi","大型冰箱","山景落地窗","毛巾及浴巾","AVEDA備品","可停4台車","寵物友善","廚房(另計1000元)","BBQ烤肉區(另計1000元)"]'
  ),
  (
    '閣樓遊戲室家庭房',
    '一樓親子家庭房，設有兒童專屬木質閣樓遊戲區，備有豐富童書與玩具，為親子旅遊量身打造。房間擁有山景窗景，獨立衛浴，冷暖空調及高速WiFi，提供毛巾浴巾與AVEDA備品。',
    'family',
    6, 4,
    6900::numeric, 8900::numeric,
    '1F', '宜蘭縣冬山鄉',
    'https://images.pexels.com/photos/3209049/pexels-photo-3209049.jpeg',
    '["https://images.pexels.com/photos/3209049/pexels-photo-3209049.jpeg","https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg","https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg"]',
    '["兒童木質閣樓遊戲區","豐富童書","山景窗","獨立衛浴","冷暖空調","高速WiFi","毛巾及浴巾","AVEDA備品"]'
  ),
  (
    '和式景觀房',
    '一樓日式風格景觀房，落地窗正對稻田與遠山，採日本建築師設計的和式美學，天然矽藻土牆壁與木構元素融入室內，最多可入住4人。獨立衛浴，冷暖空調，高速WiFi，提供毛巾浴巾與AVEDA備品。',
    'double',
    4, 2,
    5900::numeric, 7900::numeric,
    '1F', '宜蘭縣冬山鄉',
    'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
    '["https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg","https://images.pexels.com/photos/271619/pexels-photo-271619.jpeg","https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg"]',
    '["山景落地窗","日式和風設計","天然矽藻土牆","獨立衛浴","冷暖空調","高速WiFi","毛巾及浴巾","AVEDA備品"]'
  ),
  (
    '家庭大房',
    '二樓寬敞家庭大房，山景落地窗採光絕佳，配備浴缸衛浴，4K HDR電視，適合6至8人大家庭入住。冷暖空調，高速WiFi，提供毛巾浴巾與AVEDA備品。',
    'family',
    8, 6,
    8900::numeric, 11900::numeric,
    '2F', '宜蘭縣冬山鄉',
    'https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg',
    '["https://images.pexels.com/photos/1743231/pexels-photo-1743231.jpeg","https://images.pexels.com/photos/2631746/pexels-photo-2631746.jpeg","https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg"]',
    '["山景落地窗","浴缸衛浴","4K HDR電視","冷暖空調","高速WiFi","毛巾及浴巾","AVEDA備品"]'
  )
) AS r(name, description, room_type, capacity, min_capacity, price_per_night, weekend_price, floor, location, image_url, images, amenities);
