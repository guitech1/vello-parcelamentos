CREATE OR REPLACE FUNCTION public.cancel_merchant_payment_link(
  p_merchant_id uuid,
  p_link_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_link public.payment_links%ROWTYPE;
BEGIN
  IF p_merchant_id IS NULL OR p_link_id IS NULL THEN
    RETURN 'invalid_request';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_link_id::text, 0));

  SELECT * INTO v_link
  FROM public.payment_links
  WHERE id = p_link_id AND merchant_id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_link.status <> 'active' THEN RETURN 'not_active'; END IF;

  -- Do not cancel a link once any provider payment exists; it may still be payable.
  IF EXISTS (SELECT 1 FROM public.payments WHERE payment_link_id = p_link_id) THEN
    RETURN 'payment_exists';
  END IF;

  UPDATE public.payment_links
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_link_id AND merchant_id = p_merchant_id;

  UPDATE public.installments
  SET status = 'cancelled'
  WHERE payment_link_id = p_link_id AND status IN ('pending', 'failed', 'expired');

  RETURN 'cancelled';
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_merchant_payment_link(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_merchant_payment_link(uuid, uuid) TO service_role;
