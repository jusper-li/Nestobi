/* Schedule expired point reservations every five minutes. */

CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.point_audit_logs
  DROP CONSTRAINT IF EXISTS point_audit_logs_action_check;
ALTER TABLE public.point_audit_logs
  ADD CONSTRAINT point_audit_logs_action_check
  CHECK (action IN ('lookup', 'request_otp', 'verify_otp', 'redeem', 'refund', 'release', 'expired'));

CREATE OR REPLACE FUNCTION public.release_member_points(p_order_id uuid, p_reason text DEFAULT 'payment_failed')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE v_res public.point_reservations%ROWTYPE; v_status text; v_action text; v_released_at timestamptz;
BEGIN
  SELECT * INTO v_res FROM public.point_reservations WHERE order_id = p_order_id FOR UPDATE;
  IF v_res.id IS NULL THEN RETURN jsonb_build_object('success', true, 'released', false, 'reason', 'no_reservation'); END IF;
  IF v_res.status IN ('released', 'expired') THEN RETURN jsonb_build_object('success', true, 'released', true, 'idempotent', true, 'status', v_res.status); END IF;
  IF v_res.status <> 'reserved' THEN RAISE EXCEPTION 'RESERVATION_NOT_RELEASEABLE'; END IF;
  v_status := CASE WHEN p_reason = 'expired' THEN 'expired' ELSE 'released' END;
  v_action := CASE WHEN p_reason = 'expired' THEN 'expired' ELSE 'release' END;
  v_released_at := now();
  UPDATE public.member_point_balances
  SET reserved_points = greatest(0, reserved_points - v_res.points), updated_at = now()
  WHERE user_id = v_res.member_id;
  UPDATE public.point_reservations
  SET status = v_status, released_at = v_released_at, updated_at = now(), metadata = metadata || jsonb_build_object('reason', p_reason)
  WHERE id = v_res.id AND status = 'reserved';
  UPDATE public.point_redemption_sessions SET status = 'cancelled' WHERE id = v_res.redemption_session_id AND status = 'reserved';
  INSERT INTO public.point_audit_logs(user_id, session_id, action, status, points, discount_amount, metadata)
  VALUES (
    v_res.member_id,
    v_res.redemption_session_id,
    v_action,
    v_status,
    v_res.points,
    v_res.discount_amount,
    jsonb_build_object(
      'reservation_id', v_res.id,
      'member_id', v_res.member_id,
      'order_id', v_res.order_id,
      'points', v_res.points,
      'expired_at', v_res.expires_at,
      'released_at', v_released_at,
      'reason', p_reason
    )
  );
  RETURN jsonb_build_object('success', true, 'released', true, 'reservationId', v_res.id, 'points', v_res.points, 'status', v_status);
END;
$$;

DO $$
DECLARE v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'release-expired-point-reservations' LIMIT 1;
    IF v_job_id IS NULL THEN
      PERFORM cron.schedule(
        'release-expired-point-reservations',
        '*/5 * * * *',
        'SELECT public.release_expired_point_reservations();'
      );
    END IF;
  END IF;
END
$$;

REVOKE EXECUTE ON FUNCTION public.release_member_points(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_member_points(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.release_expired_point_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_point_reservations() TO service_role;
