-- Keep merchant-editable fields separate from server-controlled account state.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (full_name, business_name, phone, pix_key, pix_key_type)
  ON TABLE public.profiles TO authenticated;

-- Payment-link creation must go through the authenticated server endpoint so the
-- server validates the request and generates the public token.
REVOKE INSERT ON TABLE public.payment_links FROM authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_pix_key_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_pix_key_type_check
      CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random'));
  END IF;
END;
$$;
