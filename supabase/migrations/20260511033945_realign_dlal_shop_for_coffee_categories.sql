/*
  # Realign DLAL shop-for-coffee categories

  Keeps the Shop for coffee facet aligned with:
  https://www.dlalshop.com/categories/shop-for-coffee

  Names use Unicode escapes to keep this migration ASCII-safe across shells.
*/

CREATE TEMP TABLE _official_dlal_shop_coffee_categories (
  slug text PRIMARY KEY,
  name text NOT NULL,
  parent_slug text NOT NULL,
  sort_order integer NOT NULL
) ON COMMIT DROP;

INSERT INTO _official_dlal_shop_coffee_categories (slug, name, parent_slug, sort_order) VALUES
  ('shop-featured-goods', U&'\7CBE\9078\55AE\54C1', 'dlal-shop-for-coffee', 10),
  ('shop-limited', U&'\671F\9593\9650\5B9A', 'dlal-shop-for-coffee', 20),
  ('shop-craftsmans-recipe', U&'\8077\4EBA\914D\65B9', 'dlal-shop-for-coffee', 30),
  ('shop-roast-degree', U&'\70D8\7119\5EA6', 'dlal-shop-for-coffee', 40),
  ('shop-processing-methods', U&'\8655\7406\6CD5', 'dlal-shop-for-coffee', 50),
  ('shop-flavor', U&'\98A8\5473', 'dlal-shop-for-coffee', 60),
  ('shop-drip-bag', U&'\639B\8033\5305/\6FFE\6CE1\5305/\6FFE\639B\5496\5561', 'dlal-shop-for-coffee', 70),
  ('roast-light', U&'\6DFA\70D8\7119', 'shop-roast-degree', 410),
  ('roast-light-medium', U&'\6DFA\4E2D\7119', 'shop-roast-degree', 420),
  ('roast-medium', U&'\4E2D\70D8\7119', 'shop-roast-degree', 430),
  ('roast-medium-dark', U&'\4E2D\6DF1\7119', 'shop-roast-degree', 440),
  ('roast-dark', U&'\6DF1\70D8\7119', 'shop-roast-degree', 450),
  ('process-wet', U&'\6C34\6D17\8655\7406\6CD5', 'shop-processing-methods', 510),
  ('process-natural', U&'\65E5\66EC\8655\7406\6CD5', 'shop-processing-methods', 520),
  ('process-honey', U&'\871C\8655\7406\6CD5', 'shop-processing-methods', 530),
  ('flavor-nutty', U&'\5805\679C\9999\6FC3', 'shop-flavor', 610),
  ('flavor-floral', U&'\82B1\9999\512A\96C5', 'shop-flavor', 620),
  ('flavor-fruity', U&'\679C\9178\6E05\723D', 'shop-flavor', 630),
  ('flavor-balanced', U&'\5713\6F64\5E73\8861', 'shop-flavor', 640),
  ('flavor-spice-wine', U&'\9999\6599/\9152\611F', 'shop-flavor', 650);

UPDATE categories
SET name = U&'\9078\8CFC\5496\5561',
    updated_at = now()
WHERE slug = 'dlal-shop-for-coffee';

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT official.name, official.slug, root.id, now()
FROM _official_dlal_shop_coffee_categories official
CROSS JOIN categories root
WHERE root.slug = 'dlal-shop-for-coffee'
  AND official.parent_slug = 'dlal-shop-for-coffee'
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT official.name, official.slug, parent.id, now()
FROM _official_dlal_shop_coffee_categories official
JOIN categories parent ON parent.slug = official.parent_slug
WHERE official.parent_slug <> 'dlal-shop-for-coffee'
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

WITH RECURSIVE root AS (
  SELECT id FROM categories WHERE slug = 'dlal-shop-for-coffee'
),
shop_scope AS (
  SELECT c.id, c.slug
  FROM categories c
  JOIN root ON c.parent_id = root.id
  UNION ALL
  SELECT child.id, child.slug
  FROM categories child
  JOIN shop_scope parent ON child.parent_id = parent.id
),
obsolete AS (
  SELECT scope.id
  FROM shop_scope scope
  LEFT JOIN _official_dlal_shop_coffee_categories official ON official.slug = scope.slug
  WHERE official.slug IS NULL
)
UPDATE products p
SET category_id = root.id,
    updated_at = now()
FROM root, obsolete old
WHERE p.category_id = old.id;

WITH RECURSIVE root AS (
  SELECT id FROM categories WHERE slug = 'dlal-shop-for-coffee'
),
shop_scope AS (
  SELECT c.id, c.slug
  FROM categories c
  JOIN root ON c.parent_id = root.id
  UNION ALL
  SELECT child.id, child.slug
  FROM categories child
  JOIN shop_scope parent ON child.parent_id = parent.id
),
obsolete AS (
  SELECT scope.id
  FROM shop_scope scope
  LEFT JOIN _official_dlal_shop_coffee_categories official ON official.slug = scope.slug
  WHERE official.slug IS NULL
)
DELETE FROM product_category_links links
USING obsolete old
WHERE links.category_id = old.id;

WITH RECURSIVE root AS (
  SELECT id FROM categories WHERE slug = 'dlal-shop-for-coffee'
),
shop_scope AS (
  SELECT c.id, c.slug
  FROM categories c
  JOIN root ON c.parent_id = root.id
  UNION ALL
  SELECT child.id, child.slug
  FROM categories child
  JOIN shop_scope parent ON child.parent_id = parent.id
),
obsolete AS (
  SELECT scope.id
  FROM shop_scope scope
  LEFT JOIN _official_dlal_shop_coffee_categories official ON official.slug = scope.slug
  WHERE official.slug IS NULL
)
DELETE FROM categories c
USING obsolete old
WHERE c.id = old.id;

WITH RECURSIVE ancestors AS (
  SELECT links.product_id, parent.id AS category_id
  FROM product_category_links links
  JOIN categories child ON child.id = links.category_id
  JOIN categories parent ON parent.id = child.parent_id
  UNION
  SELECT ancestors.product_id, parent.id
  FROM ancestors
  JOIN categories child ON child.id = ancestors.category_id
  JOIN categories parent ON parent.id = child.parent_id
)
INSERT INTO product_category_links (product_id, category_id)
SELECT product_id, category_id
FROM ancestors
ON CONFLICT DO NOTHING;
