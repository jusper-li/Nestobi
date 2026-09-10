CREATE OR REPLACE FUNCTION public.lookup_guest_member(p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS TABLE(member_id uuid, member_email text, available_points integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
BEGIN
  IF v_phone = '' AND nullif(trim(coalesce(p_email, '')), '') IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT u.id, coalesce(u.email, '')::text,
    greatest(0, coalesce(b.current_points, 0) - coalesce(b.reserved_points, 0))::integer
  FROM auth.users u
  LEFT JOIN public.tbl_mn5wgzh0 p ON p.user_id = u.id
  LEFT JOIN public.member_point_balances b ON b.user_id = u.id
  WHERE (v_phone <> '' AND regexp_replace(coalesce(p.phone, ''), '[^0-9+]', '', 'g') = v_phone)
     OR (nullif(trim(coalesce(p_email, '')), '') IS NOT NULL AND lower(u.email) = lower(trim(p_email)))
  ORDER BY u.created_at
  LIMIT 1;
END;
$$;
