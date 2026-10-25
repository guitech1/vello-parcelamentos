import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: 'Link inválido ou indisponível.' }, { status: 404 });
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'O checkout público ainda não está configurado no servidor.' }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin
    .from('payment_links')
    .select('id,description,total_amount,installment_count,status,expires_at')
    .eq('public_token', token)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Não foi possível consultar este link.' }, { status: 503 });
  }
  if (!data || (data.expires_at && new Date(data.expires_at).getTime() <= Date.now())) {
    return NextResponse.json({ error: 'Este link não existe, expirou ou foi encerrado.' }, { status: 404 });
  }

  const { data: firstInstallment, error: installmentError } = await admin
    .from('installments')
    .select('amount')
    .eq('payment_link_id', data.id)
    .eq('installment_number', 1)
    .maybeSingle();
  if (installmentError || !firstInstallment) {
    return NextResponse.json({ error: 'As parcelas deste link ainda não estão disponíveis.' }, { status: 503 });
  }

  // Never return merchant IDs, payer details, payment records, or internal fields.
  return NextResponse.json({
    description: data.description,
    totalAmount: data.total_amount,
    installmentCount: data.installment_count,
    firstInstallmentAmount: firstInstallment.amount,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
