/* Secure, short-lived point redemption sessions for shop checkout. */

CREATE TABLE IF NOT EXISTS public.point_redemption_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_points integer NOT NULL CHECK (requested_points > 0),
  calculated_discount numeric NOT NULL CHECK (calculated_discount > 0),
  status text NOT NULL DEFAULT 'pending_otp'
    CHECK (status IN ('pending_otp', 'verified', 'redeemed', 'cancelled', 'expired')),
  verification_channel text CHECK (verification_channel IN ('email', 'sms')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.point_otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.point_redemption_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  masked_identifier text,
  otp_hash text NOT NULL,
  requested_points integer NOT NULL CHECK (requested_points > 0),
  calculated_discount numeric NOT NULL CHECK (calculated_discount > 0),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  verified_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.point_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.point_redemption_sessions(id) ON DELETE SET NULL,
  otp_request_id uuid REFERENCES public.point_otp_requests(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('lookup', 'request_otp', 'verify_otp', 'redeem', 'refund', 'release')),
  status text NOT NULL,
  channel text,
  points integer,
  discount_amount numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS point_redemption_sessions_user_status_idx
  ON public.point_redemption_sessions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS point_otp_requests_session_idx
  ON public.point_otp_requests(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS point_audit_logs_user_created_idx
  ON public.point_audit_logs(user_id, created_at DESC);

ALTER TABLE public.point_redemption_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.point_redemption_sessions, public.point_otp_requests, public.point_audit_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_member_points(p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.tbl_mn5wgzh0%ROWTYPE;
  v_email text;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM public.tbl_mn5wgzh0 WHERE user_id = v_user_id;
  SELECT coalesce(email, '') INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_phone <> '' AND regexp_replace(coalesce(v_profile.phone, ''), '[^0-9+]', '', 'g') <> v_phone THEN
    RETURN jsonb_build_object('success', true, 'matched', false);
  END IF;
  IF nullif(trim(coalesce(p_email, '')), '') IS NOT NULL
    AND lower(trim(p_email)) <> lower(v_email) THEN
    RETURN jsonb_build_object('success', true, 'matched', false);
  END IF;
  INSERT INTO public.point_audit_logs(user_id, action, status, metadata)
  VALUES (v_user_id, 'lookup', 'success', jsonb_build_object('phone_provided', v_phone <> '', 'email_provided', nullif(trim(coalesce(p_email, '')), '') IS NOT NULL));
  RETURN jsonb_build_object(
    'success', true,
    'matched', true,
    'maskedPhone', CASE WHEN length(coalesce(v_profile.phone, '')) >= 7 THEN left(v_profile.phone, 2) || '•••••' || right(v_profile.phone, 3) ELSE NULL END,
    'maskedEmail', CASE WHEN position('@' in v_email) > 2 THEN left(v_email, 2) || '••••@' || split_part(v_email, '@', 2) ELSE NULL END,
    'availablePoints', (SELECT coalesce(current_points, 0) FROM public.member_point_balances WHERE user_id = v_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_point_redemption_session(p_requested_points integer, p_channel text DEFAULT 'email')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_subtotal numeric;
  v_points integer;
  v_session uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_channel NOT IN ('email', 'sms') THEN RAISE EXCEPTION 'Unsupported verification channel'; END IF;
  SELECT coalesce(current_points, 0) INTO v_balance FROM public.member_point_balances WHERE user_id = v_user_id FOR UPDATE;
  SELECT coalesce(sum(p.price * c.quantity), 0) INTO v_subtotal
  FROM public.tbl_mn5uxems c JOIN public.products p ON p.id = c.product_id
  WHERE c.user_id = v_user_id AND p.is_active = true AND coalesce(p.stock_quantity, 0) >= c.quantity;
  v_points := least(greatest(coalesce(p_requested_points, 0), 0), v_balance, floor(v_subtotal)::integer);
  IF v_points <= 0 THEN RAISE EXCEPTION 'No redeemable points'; END IF;
  UPDATE public.point_redemption_sessions SET status = 'expired'
  WHERE user_id = v_user_id AND status IN ('pending_otp', 'verified') AND expires_at <= now();
  INSERT INTO public.point_redemption_sessions(user_id, requested_points, calculated_discount, verification_channel)
  VALUES (v_user_id, v_points, v_points, p_channel) RETURNING id INTO v_session;
  INSERT INTO public.point_audit_logs(user_id, session_id, action, status, channel, points, discount_amount)
  VALUES (v_user_id, v_session, 'request_otp', 'session_created', p_channel, v_points, v_points);
  RETURN jsonb_build_object('success', true, 'sessionId', v_session, 'requestedPoints', v_points, 'discountAmount', v_points, 'availablePoints', v_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_point_otp(p_request_id uuid, p_otp_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_req public.point_otp_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.point_otp_requests WHERE id = p_request_id AND user_id = auth.uid() FOR UPDATE;
  IF v_req.id IS NULL OR v_req.used_at IS NOT NULL OR v_req.verified_at IS NOT NULL THEN RAISE EXCEPTION 'OTP request is invalid'; END IF;
  IF v_req.expires_at <= now() THEN RAISE EXCEPTION 'OTP expired'; END IF;
  IF v_req.attempts >= v_req.max_attempts THEN RAISE EXCEPTION 'OTP attempts exceeded'; END IF;
  IF v_req.otp_hash <> p_otp_hash THEN
    UPDATE public.point_otp_requests SET attempts = attempts + 1 WHERE id = v_req.id;
    INSERT INTO public.point_audit_logs(user_id, session_id, otp_request_id, action, status, channel)
    VALUES (auth.uid(), v_req.session_id, v_req.id, 'verify_otp', 'failed', v_req.channel);
    RAISE EXCEPTION 'Invalid OTP';
  END IF;
  UPDATE public.point_otp_requests SET verified_at = now() WHERE id = v_req.id;
  UPDATE public.point_redemption_sessions SET status = 'verified', verified_at = now() WHERE id = v_req.session_id AND status = 'pending_otp';
  INSERT INTO public.point_audit_logs(user_id, session_id, otp_request_id, action, status, channel, points, discount_amount)
  VALUES (auth.uid(), v_req.session_id, v_req.id, 'verify_otp', 'success', v_req.channel, v_req.requested_points, v_req.calculated_discount);
  RETURN jsonb_build_object('success', true, 'sessionId', v_req.session_id, 'requestedPoints', v_req.requested_points, 'discountAmount', v_req.calculated_discount);
END;
$$;

CREATE OR REPLACE FUNCTION private.require_verified_shop_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_session public.point_redemption_sessions%ROWTYPE;
BEGIN
  IF NEW.description = 'Shop points discount' AND NEW.amount < 0 THEN
    SELECT * INTO v_session FROM public.point_redemption_sessions
    WHERE user_id = NEW.user_id AND status = 'verified' AND requested_points = abs(NEW.amount) AND expires_at > now()
    ORDER BY verified_at DESC NULLS LAST LIMIT 1 FOR UPDATE;
    IF v_session.id IS NULL THEN RAISE EXCEPTION 'Verified point redemption required'; END IF;
    UPDATE public.point_redemption_sessions SET status = 'redeemed', redeemed_at = now() WHERE id = v_session.id;
    INSERT INTO public.point_audit_logs(user_id, session_id, action, status, points, discount_amount)
    VALUES (NEW.user_id, v_session.id, 'redeem', 'success', abs(NEW.amount), abs(NEW.amount));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_verified_shop_points ON public.points;
CREATE TRIGGER trg_require_verified_shop_points
BEFORE INSERT ON public.points
FOR EACH ROW EXECUTE FUNCTION private.require_verified_shop_points();

GRANT EXECUTE ON FUNCTION public.lookup_member_points(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_point_redemption_session(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_point_otp(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_member_points(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_point_redemption_session(integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_point_otp(uuid, text) FROM PUBLIC, anon;
