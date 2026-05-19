/*
  # Realign DLAL subscription and tools categories

  Keeps the Coffee Subscription and Tools/gadget facets aligned with:
  https://www.dlalshop.com/categories/subscription
  https://www.dlalshop.com/categories/tools

  Names use Unicode escapes to keep this migration ASCII-safe across shells.
*/

CREATE TEMP TABLE _official_dlal_subscription_tools_categories (
  root_slug text NOT NULL,
  slug text PRIMARY KEY,
  name text NOT NULL,
  parent_slug text NOT NULL,
  sort_order integer NOT NULL
) ON COMMIT DROP;

INSERT INTO _official_dlal_subscription_tools_categories (root_slug, slug, name, parent_slug, sort_order) VALUES
  ('dlal-subscription', 'subscription-drip-bag', U&'\5496\5561\6FFE\639B\5305', 'dlal-subscription', 10),
  ('dlal-subscription', 'subscription-beans-200g', U&'\5496\5561\8C46200g/\8F15\5DE7\65C5\884C\7D44', 'dlal-subscription', 20),
  ('dlal-subscription', 'subscription-beans-400g', U&'\5496\5561\8C46400g/\5962\83EF\63A2\96AA\7D44', 'dlal-subscription', 30),
  ('dlal-subscription', 'subscription-plan-time', U&'\4F9D\6642\9593\9031\671F', 'dlal-subscription', 40),
  ('dlal-subscription', 'subscription-3-months', U&'3\500B\6708(\4E00\5B63)', 'subscription-plan-time', 410),
  ('dlal-subscription', 'subscription-6-months', U&'6\500B\6708(\534A\5E74)', 'subscription-plan-time', 420),
  ('dlal-subscription', 'subscription-12-months', U&'12\500B\6708(\4E00\5E74)', 'subscription-plan-time', 430),
  ('dlal-tools', 'tools-coffee-tools', U&'\5496\5561\5668\5177', 'dlal-tools', 10),
  ('dlal-tools', 'tools-cups-plates', U&'\676F\76E4', 'dlal-tools', 20),
  ('dlal-tools', 'tools-goods', U&'\96DC\8CA8', 'dlal-tools', 30);

UPDATE categories
SET name = U&'\5496\5561\5B9A\671F\4FBF',
    updated_at = now()
WHERE slug = 'dlal-subscription';

UPDATE categories
SET name = U&'\5668\5177/\7528\54C1',
    updated_at = now()
WHERE slug = 'dlal-tools';

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT official.name, official.slug, parent.id, now()
FROM _official_dlal_subscription_tools_categories official
JOIN categories parent ON parent.slug = official.parent_slug
WHERE official.parent_slug IN ('dlal-subscription', 'dlal-tools')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

INSERT INTO categories (name, slug, parent_id, updated_at)
SELECT official.name, official.slug, parent.id, now()
FROM _official_dlal_subscription_tools_categories official
JOIN categories parent ON parent.slug = official.parent_slug
WHERE official.parent_slug NOT IN ('dlal-subscription', 'dlal-tools')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

WITH RECURSIVE roots AS (
  SELECT id, slug FROM categories WHERE slug IN ('dlal-subscription', 'dlal-tools')
),
category_scope AS (
  SELECT roots.id AS root_id, roots.slug AS root_slug, child.id, child.slug
  FROM categories child
  JOIN roots ON child.parent_id = roots.id
  UNION ALL
  SELECT scope.root_id, scope.root_slug, child.id, child.slug
  FROM categories child
  JOIN category_scope scope ON child.parent_id = scope.id
),
obsolete AS (
  SELECT scope.root_id, scope.id
  FROM category_scope scope
  LEFT JOIN _official_dlal_subscription_tools_categories official
    ON official.root_slug = scope.root_slug
   AND official.slug = scope.slug
  WHERE official.slug IS NULL
)
UPDATE products p
SET category_id = obsolete.root_id,
    updated_at = now()
FROM obsolete
WHERE p.category_id = obsolete.id;

WITH RECURSIVE roots AS (
  SELECT id, slug FROM categories WHERE slug IN ('dlal-subscription', 'dlal-tools')
),
category_scope AS (
  SELECT roots.id AS root_id, roots.slug AS root_slug, child.id, child.slug
  FROM categories child
  JOIN roots ON child.parent_id = roots.id
  UNION ALL
  SELECT scope.root_id, scope.root_slug, child.id, child.slug
  FROM categories child
  JOIN category_scope scope ON child.parent_id = scope.id
),
obsolete AS (
  SELECT scope.id
  FROM category_scope scope
  LEFT JOIN _official_dlal_subscription_tools_categories official
    ON official.root_slug = scope.root_slug
   AND official.slug = scope.slug
  WHERE official.slug IS NULL
)
DELETE FROM product_category_links links
USING obsolete
WHERE links.category_id = obsolete.id;

WITH RECURSIVE roots AS (
  SELECT id, slug FROM categories WHERE slug IN ('dlal-subscription', 'dlal-tools')
),
category_scope AS (
  SELECT roots.id AS root_id, roots.slug AS root_slug, child.id, child.slug
  FROM categories child
  JOIN roots ON child.parent_id = roots.id
  UNION ALL
  SELECT scope.root_id, scope.root_slug, child.id, child.slug
  FROM categories child
  JOIN category_scope scope ON child.parent_id = scope.id
),
obsolete AS (
  SELECT scope.id
  FROM category_scope scope
  LEFT JOIN _official_dlal_subscription_tools_categories official
    ON official.root_slug = scope.root_slug
   AND official.slug = scope.slug
  WHERE official.slug IS NULL
)
DELETE FROM categories c
USING obsolete
WHERE c.id = obsolete.id;

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
