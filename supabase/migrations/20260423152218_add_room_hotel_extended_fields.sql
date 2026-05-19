/*
  # Extended fields for rooms and hotels

  ## tbl_rooms new columns
  - `images` (jsonb) — ordered array of image URLs for multi-photo gallery
  - `weekend_price` (numeric) — separate weekend/holiday price
  - `min_capacity` (integer) — minimum guests (for ranged occupancy display)
  - `floor` (text) — floor / level label (e.g. "1F", "2F")

  ## hotels new columns
  - `registration_number` (text) — legal registration identifier
  - `line_id` (text) — LINE contact ID
  - `facebook` (text) — Facebook page name or URL
  - `checkin_time` (text) — default check-in time string (e.g. "15:00")
  - `checkout_time` (text) — default check-out time string (e.g. "11:00")
  - `deposit_amount` (numeric) — security deposit in TWD
  - `pet_friendly` (boolean) — whether pets are allowed
*/

-- tbl_rooms additions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tbl_rooms' AND column_name='images') THEN
    ALTER TABLE tbl_rooms ADD COLUMN images jsonb DEFAULT '[]';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tbl_rooms' AND column_name='weekend_price') THEN
    ALTER TABLE tbl_rooms ADD COLUMN weekend_price numeric DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tbl_rooms' AND column_name='min_capacity') THEN
    ALTER TABLE tbl_rooms ADD COLUMN min_capacity integer DEFAULT 1;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tbl_rooms' AND column_name='floor') THEN
    ALTER TABLE tbl_rooms ADD COLUMN floor text DEFAULT '';
  END IF;
END $$;

-- hotels additions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hotels' AND column_name='registration_number') THEN
    ALTER TABLE hotels ADD COLUMN registration_number text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hotels' AND column_name='line_id') THEN
    ALTER TABLE hotels ADD COLUMN line_id text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hotels' AND column_name='facebook') THEN
    ALTER TABLE hotels ADD COLUMN facebook text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hotels' AND column_name='checkin_time') THEN
    ALTER TABLE hotels ADD COLUMN checkin_time text DEFAULT '15:00';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hotels' AND column_name='checkout_time') THEN
    ALTER TABLE hotels ADD COLUMN checkout_time text DEFAULT '11:00';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hotels' AND column_name='deposit_amount') THEN
    ALTER TABLE hotels ADD COLUMN deposit_amount numeric DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hotels' AND column_name='pet_friendly') THEN
    ALTER TABLE hotels ADD COLUMN pet_friendly boolean DEFAULT false;
  END IF;
END $$;
