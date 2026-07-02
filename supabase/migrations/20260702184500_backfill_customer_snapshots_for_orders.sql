/*
  # Backfill customer snapshot data for existing orders and subscriptions

  Populate order shipping snapshots so vendor users can see buyer name / phone /
  email even on legacy orders created before the checkout flow wrote snapshots.
*/

WITH order_snapshots AS (
  SELECT
    o.id AS order_id,
    jsonb_build_object(
      'customer_name', COALESCE(profile.display_name, auth_user.email, ''),
      'recipient_name', COALESCE(profile.display_name, auth_user.email, ''),
      'customer_phone', COALESCE(profile.phone, ''),
      'recipient_phone', COALESCE(profile.phone, ''),
      'customer_email', COALESCE(auth_user.email, ''),
      'recipient_email', COALESCE(auth_user.email, ''),
      'name', COALESCE(profile.display_name, auth_user.email, ''),
      'phone', COALESCE(profile.phone, ''),
      'email', COALESCE(auth_user.email, '')
    ) AS shipping_snapshot
  FROM public.orders o
  LEFT JOIN auth.users auth_user
    ON auth_user.id = o.user_id
  LEFT JOIN public.tbl_mn5wgzh0 profile
    ON profile.user_id = o.user_id
  WHERE o.shipping_address IS NULL
     OR o.shipping_address = '{}'::jsonb
)
UPDATE public.orders o
SET shipping_address = COALESCE(o.shipping_address, '{}'::jsonb) || s.shipping_snapshot,
    updated_at = now()
FROM order_snapshots s
WHERE o.id = s.order_id;

WITH subscription_snapshots AS (
  SELECT
    s.id AS subscription_id,
    jsonb_build_object(
      'customer_name', COALESCE(NULLIF(s.customer_name, ''), profile.display_name, auth_user.email, ''),
      'recipient_name', COALESCE(NULLIF(s.customer_name, ''), profile.display_name, auth_user.email, ''),
      'customer_phone', COALESCE(NULLIF(s.customer_phone, ''), profile.phone, ''),
      'recipient_phone', COALESCE(NULLIF(s.customer_phone, ''), profile.phone, ''),
      'customer_email', COALESCE(NULLIF(s.customer_email, ''), auth_user.email, ''),
      'recipient_email', COALESCE(NULLIF(s.customer_email, ''), auth_user.email, ''),
      'name', COALESCE(NULLIF(s.customer_name, ''), profile.display_name, auth_user.email, ''),
      'phone', COALESCE(NULLIF(s.customer_phone, ''), profile.phone, ''),
      'email', COALESCE(NULLIF(s.customer_email, ''), auth_user.email, '')
    ) AS shipping_snapshot
  FROM public.product_subscriptions s
  LEFT JOIN auth.users auth_user
    ON auth_user.id = s.user_id
  LEFT JOIN public.tbl_mn5wgzh0 profile
    ON profile.user_id = s.user_id
  WHERE s.shipping_address IS NULL
     OR s.shipping_address = '{}'::jsonb
)
UPDATE public.product_subscriptions s
SET shipping_address = COALESCE(s.shipping_address, '{}'::jsonb) || ss.shipping_snapshot,
    updated_at = now()
FROM subscription_snapshots ss
WHERE s.id = ss.subscription_id;

UPDATE public.orders o
SET shipping_address = COALESCE(o.shipping_address, '{}'::jsonb) || COALESCE(ss.shipping_address, '{}'::jsonb),
    updated_at = now()
FROM public.product_subscriptions ss
WHERE o.subscription_id = ss.id
  AND (o.shipping_address IS NULL OR o.shipping_address = '{}'::jsonb);

UPDATE public.purchase_records pr
SET shipping_address = COALESCE(pr.shipping_address, '{}'::jsonb) || COALESCE(o.shipping_address, '{}'::jsonb)
FROM public.orders o
WHERE pr.order_id = o.id
  AND (pr.shipping_address IS NULL OR pr.shipping_address = '{}'::jsonb)
  AND (o.shipping_address IS NOT NULL AND o.shipping_address <> '{}'::jsonb);
