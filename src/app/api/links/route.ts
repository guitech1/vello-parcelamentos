import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { centsToDecimal, parseBRLCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: 'Autenticação não configurada no servidor.' }, { status: 503 });
  }
  const sessionClient = await createServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Faça login para criar um link.' }, { status: 401 });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Criação de links não está configurada no servidor.' }, { status: 503 });

  let body: { description?: unknown; amount?: unknown; installmentCount?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const cents = typeof body.amount === 'string' ? parseBRLCents(body.amount) : null;
  const installmentCount = Number(body.installmentCount);
  if (description.length < 1 || description.length > 240) return NextResponse.json({ error: 'A descrição deve ter entre 1 e 240 caracteres.' }, { status: 400 });
  if (cents === null || cents < 100 || cents > 100000000) return NextResponse.json({ error: 'Informe um valor entre R$ 1,00 e R$ 1.000.000,00.' }, { status: 400 });
  if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 10) return NextResponse.json({ error: 'Escolha de 1 a 10 parcelas.' }, { status: 400 });

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: profile, error: profileError } = await admin.from('profiles').select('account_status').eq('user_id', user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: 'Não foi possível validar a conta.' }, { status: 503 });
  if (!profile || profile.account_status !== 'active') return NextResponse.json({ error: 'A conta não está habilitada para criar cobranças.' }, { status: 403 });

  const { data, error } = await admin.from('payment_links').insert({
    merchant_id: user.id,
    public_token: crypto.randomUUID(),
    description,
    total_amount: centsToDecimal(cents),
    installment_count: installmentCount,
    status: 'active',
  }).select('id,public_token,description,total_amount,installment_count,status,created_at').single();

  if (error || !data) return NextResponse.json({ error: 'Não foi possível criar o link de parcelamento.' }, { status: 503 });
  return NextResponse.json(data, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
