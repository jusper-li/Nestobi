/*
  # Extend products table with coffee/specialty product fields

  Adds columns to support rich product data for coffee beans and future scraped products.

  1. New Columns on products:
     - `origin`           (text)    – 產地，如「肯亞 麒麟亞加」
     - `roast_level`      (text)    – 烘焙程度，如「中烘焙」
     - `processing_method`(text)    – 處理法，如「全水洗」
     - `altitude`         (text)    – 海拔，如「1,500–1,600m」
     - `variety`          (text[])  – 品種列表，如 SL28、SL34...
     - `flavor_notes`     (text[])  – 風味描述列表
     - `weight_grams`     (integer) – 規格重量（克）
     - `images`           (jsonb)   – 多張圖片 URL 陣列
     - `tags`             (text[])  – 標籤
     - `source_url`       (text)    – 爬蟲來源 URL（方便去重複）
     - `roast_date`       (date)    – 烘焙日期

  2. New Category: 咖啡豆 (coffee-beans)

  3. Notes:
     - All new columns are nullable with safe defaults
     - source_url has unique constraint for dedup on future scrapes
*/

-- Add columns to products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='origin') THEN
    ALTER TABLE products ADD COLUMN origin text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='roast_level') THEN
    ALTER TABLE products ADD COLUMN roast_level text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='processing_method') THEN
    ALTER TABLE products ADD COLUMN processing_method text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='altitude') THEN
    ALTER TABLE products ADD COLUMN altitude text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variety') THEN
    ALTER TABLE products ADD COLUMN variety text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='flavor_notes') THEN
    ALTER TABLE products ADD COLUMN flavor_notes text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='weight_grams') THEN
    ALTER TABLE products ADD COLUMN weight_grams integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='images') THEN
    ALTER TABLE products ADD COLUMN images jsonb DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='tags') THEN
    ALTER TABLE products ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='source_url') THEN
    ALTER TABLE products ADD COLUMN source_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='roast_date') THEN
    ALTER TABLE products ADD COLUMN roast_date date;
  END IF;
END $$;

-- Unique index on source_url for dedup during scraping (ignore empty strings)
CREATE UNIQUE INDEX IF NOT EXISTS products_source_url_unique
  ON products (source_url)
  WHERE source_url IS NOT NULL AND source_url <> '';

-- Add coffee-beans category
INSERT INTO categories (name, slug)
VALUES ('咖啡豆', 'coffee-beans')
ON CONFLICT (slug) DO NOTHING;
