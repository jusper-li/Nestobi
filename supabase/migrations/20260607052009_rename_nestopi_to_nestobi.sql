UPDATE public.theme_banners
SET
  title_zh = replace(title_zh, 'nestopi', 'nestobi'),
  title_en = replace(title_en, 'nestopi', 'nestobi'),
  title_ja = replace(title_ja, 'nestopi', 'nestobi'),
  title_ko = replace(title_ko, 'nestopi', 'nestobi'),
  subtitle_zh = replace(subtitle_zh, 'nestopi', 'nestobi'),
  subtitle_en = replace(subtitle_en, 'nestopi', 'nestobi'),
  subtitle_ja = replace(subtitle_ja, 'nestopi', 'nestobi'),
  subtitle_ko = replace(subtitle_ko, 'nestopi', 'nestobi'),
  link_label_zh = replace(link_label_zh, 'nestopi', 'nestobi'),
  link_label_en = replace(link_label_en, 'nestopi', 'nestobi'),
  link_label_ja = replace(link_label_ja, 'nestopi', 'nestobi'),
  link_label_ko = replace(link_label_ko, 'nestopi', 'nestobi')
WHERE theme_key IN ('home', 'nestopia')
  AND (
    title_zh LIKE '%nestopi%' OR title_en LIKE '%nestopi%' OR title_ja LIKE '%nestopi%' OR title_ko LIKE '%nestopi%'
    OR subtitle_zh LIKE '%nestopi%' OR subtitle_en LIKE '%nestopi%' OR subtitle_ja LIKE '%nestopi%' OR subtitle_ko LIKE '%nestopi%'
    OR link_label_zh LIKE '%nestopi%' OR link_label_en LIKE '%nestopi%' OR link_label_ja LIKE '%nestopi%' OR link_label_ko LIKE '%nestopi%'
  );
