/*
  # Enrich K5 根本家民宿 listing data

  Source reference:
  - https://kei.cafe/K5

  Purpose:
  - Preserve official listing facts in seed data for rebuilds.
  - K5 official page states 18 max guests, 5 rooms, 8 parking spaces, and 宜蘭合法民宿 2591.
  - Feature highlights include open kitchen, large wood dining table, lawn, TOTO bathroom, pet-friendly stay,
    electric mahjong, 4K TVs, and Tatung眠豆腐 beds.
*/

UPDATE hotels
SET
  name = '根本家民宿 by Kei.Café',
  description = '宜蘭三星安農溪畔的獨棟田間別墅，最多可入住18人，共5間房、8個停車位，合法民宿登記2591號。館內配置開放式廚房、原木大長桌、百坪草皮、電動麻將桌、每房SONY 4K電視、頂級眠豆腐床與TOTO免治浴暖衛浴，親子與寵物友善，適合包棟度假、家庭聚會與好友慢旅行。',
  address = '宜蘭縣三星鄉大義八路590號',
  city = '宜蘭',
  phone = '0970-263-183',
  registration_number = '宜蘭合法民宿2591號',
  line_id = '@kkhome',
  pet_friendly = true,
  star_rating = 4,
  updated_at = now()
WHERE id = 'df73db6c-6151-402a-8cf8-4c2036468aed'
   OR name ILIKE '%根本家%';

UPDATE tbl_rooms
SET
  amenities = (
    amenities::jsonb
    || '["獨棟田間別墅","原木大餐桌","百坪草皮","TOTO免治浴暖衛浴","寵物友善","每房SONY 4K電視","眠豆腐床"]'::jsonb
  ),
  updated_at = now()
WHERE hotel_id = 'df73db6c-6151-402a-8cf8-4c2036468aed';
