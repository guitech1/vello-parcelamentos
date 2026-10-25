-- Reserve withdrawals atomically against confirmed net payment proceeds.
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS request_key text;

CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_merchant_request_key_uidx
  ON public.withdrawals (merchant_id, request_key)
  WHERE request_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.request_merchant_withdrawal(
  p_merchant_id uuid,
  p_amount numeric,
  p_request_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_existing public.withdrawals%ROWTYPE;
  v_available numeric(14,2);
  v_reserved numeric(14,2);
  v_id uuid;
BEGIN
  IF p_merchant_id IS NULL OR p_request_key IS NULL OR length(p_request_key) < 16 OR length(p_request_key) > 100 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_request');
  END IF;
  IF p_amount IS NULL OR p_amount < 1 OR p_amount <> round(p_amount, 2) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_amount');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_merchant_id::text, 0));

  SELECT * INTO v_existing
  FROM public.withdrawals
  WHERE merchant_id = p_merchant_id AND request_key = p_request_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'id', v_existing.id, 'status', v_existing.status, 'duplicate', true);
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_merchant_id
  FOR UPDATE;
  IF NOT FOUND OR v_profile.account_status <> 'active'
     OR length(trim(v_profile.pix_key)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'profile_or_pix_key_unavailable');
  END IF;

  -- Only count confirmed proceeds whose provider payload includes a net amount.
  SELECT COALESCE(SUM(
    COALESCE(
      NULLIF(provider_payload->>'net_amount', '')::numeric,
      NULLIF(provider_payload->'transaction'->>'net_amount', '')::numeric,
      0
    )
  ), 0)::numeric(14,2)
  INTO v_available
  FROM public.payments
  WHERE merchant_id = p_merchant_id AND status = 'paid';

  SELECT COALESCE(SUM(amount), 0)::numeric(14,2)
  INTO v_reserved
  FROM public.withdrawals
  WHERE merchant_id = p_merchant_id
    AND status IN ('pending', 'approved', 'processing', 'paid');

  v_available := GREATEST(v_available - v_reserved, 0);
  IF p_amount > v_available THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'insufficient_balance', 'available_amount', v_available);
  END IF;

  INSERT INTO public.withdrawals (
    merchant_id, amount, pix_key, pix_key_type, status, request_key
  ) VALUES (
    p_merchant_id, p_amount, v_profile.pix_key, v_profile.pix_key_type, 'pending', p_request_key
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_id, 'status', 'pending',
    'available_amount', v_available - p_amount, 'duplicate', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_merchant_withdrawal(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_merchant_withdrawal(uuid, numeric, text) TO service_role;
