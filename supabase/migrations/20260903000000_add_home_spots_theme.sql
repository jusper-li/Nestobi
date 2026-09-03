-- Allow the homepage destination cards to be managed from theme banners.
ALTER TABLE public.theme_banners
  DROP CONSTRAINT IF EXISTS theme_banners_theme_key_check;

ALTER TABLE public.theme_banners
  ADD CONSTRAINT theme_banners_theme_key_check
  CHECK (theme_key IN ('home', 'home_spots', 'nestopia', 'genbon_travel', 'coffee_traveler'));
