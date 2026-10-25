import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { centsToDecimal, parseBRLCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const sessionClient = await createServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Faça login para solicitar um saque.' }, { status: 401 });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Solicitações de saque não estão configuradas no servidor.' }, { status: 503 });

  let body: { amount?: unknown; requestKey?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }

  const cents = typeof body.amount === 'string' ? parseBRLCents(body.amount) : null;
  const requestKey = typeof body.requestKey === 'string' ? body.requestKey : '';
  if (cents === null || cents < 100 || !/^[0-9a-f-]{36}$/i.test(requestKey)) {
    return NextResponse.json({ error: 'Informe um valor válido de pelo menos R$ 1,00.' }, { status: 400 });
  }

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await admin.rpc('request_merchant_withdrawal', {
    p_merchant_id: user.id,
    p_amount: centsToDecimal(cents),
    p_request_key: requestKey,
  });
  if (error || !data) return NextResponse.json({ error: 'Não foi possível registrar a solicitação.' }, { status: 503 });

  const result = data as { ok?: boolean; reason?: string; id?: string; status?: string; available_amount?: string | number; duplicate?: boolean };
  if (!result.ok) {
    const messages: Record<string, string> = {
      invalid_amount: 'O valor mínimo para saque é R$ 1,00.',
      invalid_request: 'Requisição inválida. Tente novamente.',
      profile_or_pix_key_unavailable: 'Complete seu perfil e cadastre uma chave Pix válida antes de solicitar saque.',
      insufficient_balance: 'Saldo disponível insuficiente para esse valor.',
    };
    return NextResponse.json({ error: messages[result.reason ?? ''] ?? 'Não foi possível solicitar o saque.' }, { status: 409 });
  }

  return NextResponse.json({
    id: result.id,
    status: result.status,
    availableAmount: result.available_amount ?? null,
    duplicate: result.duplicate ?? false,
  }, { status: 201 });
}
