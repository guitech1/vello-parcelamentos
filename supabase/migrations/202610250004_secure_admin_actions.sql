CREATE OR REPLACE FUNCTION public.is_vello_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
  SELECT EXISTS (SELECT 1 FROM private.app_admins WHERE user_id = p_user_id);
$$;

REVOKE ALL ON FUNCTION public.is_vello_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_vello_admin(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.review_vello_withdrawal(
  p_admin_user_id uuid,
  p_withdrawal_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_withdrawal public.withdrawals%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.app_admins WHERE user_id = p_admin_user_id) THEN
    RETURN 'not_admin';
  END IF;
  IF p_action NOT IN ('approve', 'reject') THEN RETURN 'invalid_action'; END IF;
  IF p_action = 'reject' AND length(trim(COALESCE(p_reason, ''))) < 4 THEN
    RETURN 'reason_required';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_withdrawal.status <> 'pending' THEN RETURN 'not_pending'; END IF;

  UPDATE public.withdrawals
  SET status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
      reviewed_by = p_admin_user_id,
      reviewed_at = now(),
      rejection_reason = CASE WHEN p_action = 'reject' THEN left(trim(p_reason), 1000) ELSE NULL END,
      updated_at = now()
  WHERE id = p_withdrawal_id;

  RETURN CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END;
END;
$$;

REVOKE ALL ON FUNCTION public.review_vello_withdrawal(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_vello_withdrawal(uuid, uuid, text, text) TO service_role;
