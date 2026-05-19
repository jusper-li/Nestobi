/*
  # Create Properties Table

  1. New Tables
    - `properties`
      - `id` (uuid, primary key) - Unique identifier for each property
      - `name` (text) - Property name (e.g., "The Bisho House")
      - `location` (text) - Property location (e.g., "Kyoto, Japan")
      - `price_per_share` (numeric) - Price per share in USD
      - `status` (text) - Property status (e.g., "Waitlist Open", "Sold Out", "Available")
      - `image_url` (text) - URL to property image
      - `description` (text) - Property description
      - `total_shares` (integer) - Total number of shares available
      - `available_shares` (integer) - Number of shares still available
      - `created_at` (timestamptz) - Timestamp of creation
      
  2. Security
    - Enable RLS on `properties` table
    - Add policy for public read access (unauthenticated users can view properties)
*/

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  price_per_share numeric NOT NULL,
  status text NOT NULL DEFAULT 'Available',
  image_url text NOT NULL,
  description text DEFAULT '',
  total_shares integer DEFAULT 100,
  available_shares integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view properties"
  ON properties
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert sample properties
INSERT INTO properties (name, location, price_per_share, status, image_url, description, total_shares, available_shares)
VALUES 
  (
    'The Bisho House',
    'Kyoto, Japan',
    15000,
    'Waitlist Open',
    'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'A stunning example of traditional Japanese architecture with modern amenities',
    100,
    45
  ),
  (
    'Villa Serenity',
    'Bali, Indonesia',
    12500,
    'Available',
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Tropical paradise featuring contemporary design and ocean views',
    100,
    78
  ),
  (
    'The Horizon Residence',
    'Santorini, Greece',
    22000,
    'Sold Out',
    'https://images.pexels.com/photos/1531660/pexels-photo-1531660.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Iconic white-washed villa overlooking the Aegean Sea',
    100,
    0
  ),
  (
    'Mountain Refuge',
    'Aspen, Colorado',
    18500,
    'Waitlist Open',
    'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Luxurious alpine retreat with panoramic mountain views',
    100,
    23
  ),
  (
    'Casa Moderna',
    'Barcelona, Spain',
    16000,
    'Available',
    'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Modernist masterpiece in the heart of Barcelona',
    100,
    62
  ),
  (
    'The Garden Estate',
    'Tuscany, Italy',
    20000,
    'Waitlist Open',
    'https://images.pexels.com/photos/1838554/pexels-photo-1838554.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Historic villa surrounded by vineyards and olive groves',
    100,
    34
  )
;