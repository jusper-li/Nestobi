UPDATE public.theme_banners
SET
  title_zh = replace(title_zh, 'Nestopia', 'nestopi'),
  title_en = replace(title_en, 'Nestopia', 'nestopi'),
  title_ja = replace(title_ja, 'Nestopia', 'nestopi'),
  title_ko = replace(title_ko, 'Nestopia', 'nestopi'),
  subtitle_zh = replace(subtitle_zh, 'Nestopia', 'nestopi'),
  subtitle_en = replace(subtitle_en, 'Nestopia', 'nestopi'),
  subtitle_ja = replace(subtitle_ja, 'Nestopia', 'nestopi'),
  subtitle_ko = replace(subtitle_ko, 'Nestopia', 'nestopi'),
  link_label_zh = replace(link_label_zh, 'Nestopia', 'nestopi'),
  link_label_en = replace(link_label_en, 'Nestopia', 'nestopi'),
  link_label_ja = replace(link_label_ja, 'Nestopia', 'nestopi'),
  link_label_ko = replace(link_label_ko, 'Nestopia', 'nestopi')
WHERE theme_key IN ('home', 'nestopia')
  AND (
    title_zh LIKE '%Nestopia%' OR title_en LIKE '%Nestopia%' OR title_ja LIKE '%Nestopia%' OR title_ko LIKE '%Nestopia%'
    OR subtitle_zh LIKE '%Nestopia%' OR subtitle_en LIKE '%Nestopia%' OR subtitle_ja LIKE '%Nestopia%' OR subtitle_ko LIKE '%Nestopia%'
    OR link_label_zh LIKE '%Nestopia%' OR link_label_en LIKE '%Nestopia%' OR link_label_ja LIKE '%Nestopia%' OR link_label_ko LIKE '%Nestopia%'
  );
