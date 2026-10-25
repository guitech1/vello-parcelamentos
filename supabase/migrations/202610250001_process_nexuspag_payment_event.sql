-- Atomic, idempotent NexusPag payment confirmation.
-- Apply through the project's migration workflow before enabling the webhook endpoint.
CREATE OR REPLACE FUNCTION public.process_nexuspag_payment_event(
  p_provider_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_external_id text,
  p_provider_payment_id text,
  p_amount numeric,
  p_paid_at timestamptz DEFAULT now()
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_event_status text;
  v_rows integer;
BEGIN
  INSERT INTO public.webhook_events (
    provider, provider_event_id, event_type, payload, processing_status, received_at
  ) VALUES (
    'nexuspag', p_provider_event_id, p_event_type, p_payload, 'processing', now()
  ) ON CONFLICT (provider, provider_event_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT processing_status INTO v_event_status
    FROM public.webhook_events
    WHERE provider = 'nexuspag' AND provider_event_id = p_provider_event_id
    FOR UPDATE;

    IF v_event_status = 'processed' THEN
      RETURN 'duplicate';
    END IF;

    UPDATE public.webhook_events
    SET processing_status = 'processing', payload = p_payload, error_message = NULL
    WHERE provider = 'nexuspag' AND provider_event_id = p_provider_event_id;
  END IF;

  IF p_event_type <> 'payment.confirmed' THEN
    UPDATE public.webhook_events
    SET processing_status = 'ignored', processed_at = now()
    WHERE provider = 'nexuspag' AND provider_event_id = p_provider_event_id;
    RETURN 'ignored';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE provider = 'nexuspag' AND external_id = p_external_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.webhook_events
    SET processing_status = 'failed', error_message = 'Payment reference not found'
    WHERE provider = 'nexuspag' AND provider_event_id = p_provider_event_id;
    RETURN 'payment_not_found';
  END IF;

  IF v_payment.amount::numeric <> p_amount THEN
    UPDATE public.webhook_events
    SET processing_status = 'failed', error_message = 'Payment amount mismatch'
    WHERE provider = 'nexuspag' AND provider_event_id = p_provider_event_id;
    RETURN 'amount_mismatch';
  END IF;

  IF v_payment.provider_payment_id IS NOT NULL
     AND v_payment.provider_payment_id <> p_provider_payment_id THEN
    UPDATE public.webhook_events
    SET processing_status = 'failed', error_message = 'Provider transaction ID mismatch'
    WHERE provider = 'nexuspag' AND provider_event_id = p_provider_event_id;
    RETURN 'transaction_mismatch';
  END IF;

  UPDATE public.payments
  SET status = 'paid',
      provider_payment_id = COALESCE(provider_payment_id, p_provider_payment_id),
      paid_at = COALESCE(p_paid_at, now()),
      provider_payload = p_payload
  WHERE id = v_payment.id
    AND status <> 'paid';

  IF v_payment.installment_id IS NOT NULL THEN
    UPDATE public.installments
    SET status = 'paid', paid_at = COALESCE(p_paid_at, now())
    WHERE id = v_payment.installment_id
      AND status <> 'paid';
  END IF;

  UPDATE public.webhook_events
  SET processing_status = 'processed', processed_at = now(), error_message = NULL
  WHERE provider = 'nexuspag' AND provider_event_id = p_provider_event_id;

  RETURN 'processed';
END;
$$;

REVOKE ALL ON FUNCTION public.process_nexuspag_payment_event(text, text, jsonb, text, text, numeric, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_nexuspag_payment_event(text, text, jsonb, text, text, numeric, timestamptz) TO service_role;
