import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { centsToDecimal, parseBRLCents } from '@/lib/money';

export const dynamic = 'force-dynamic';

type LinkRecord = { id: string; merchant_id: string; description: string; total_amount: string | number; installment_count: number; expires_at: string | null };
type InstallmentRecord = { id: string; amount: string | number; status: string; installment_number: number };

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.NEXUSPAG_API_KEY;
  const webhookSecret = process.env.NEXUSPAG_WEBHOOK_SECRET;
  const appUrl = process.env.APP_URL;
  if (!url || !serviceKey || !apiKey || !webhookSecret || !appUrl) {
    return NextResponse.json({ error: 'Pagamentos ainda não estão configurados no servidor.' }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: link, error: linkError } = await admin.from('payment_links')
    .select('id,merchant_id,description,total_amount,installment_count,expires_at')
    .eq('public_token', token).eq('status', 'active').maybeSingle();
  if (linkError) return NextResponse.json({ error: 'Não foi possível consultar a cobrança.' }, { status: 503 });
  const record = link as LinkRecord | null;
  if (!record || (record.expires_at && new Date(record.expires_at).getTime() <= Date.now())) {
    return NextResponse.json({ error: 'Este link não existe, expirou ou foi encerrado.' }, { status: 404 });
  }

  const { data: installmentData, error: installmentError } = await admin.from('installments')
    .select('id,amount,status,installment_number')
    .eq('payment_link_id', record.id).eq('installment_number', 1).maybeSingle();
  if (installmentError) return NextResponse.json({ error: 'Não foi possível preparar a parcela.' }, { status: 503 });
  const installment = installmentData as InstallmentRecord | null;
  if (!installment) return NextResponse.json({ error: 'As parcelas ainda não foram preparadas para este link.' }, { status: 409 });
  if (installment.status === 'paid') return NextResponse.json({ error: 'A primeira parcela já consta como paga.' }, { status: 409 });

  const cents = parseBRLCents(String(installment.amount));
  if (cents === null || cents < 100) return NextResponse.json({ error: 'Valor de parcela inválido.' }, { status: 400 });
  const externalId = `vello-installment-${installment.id}`;
  const { error: insertError } = await admin.from('payments').upsert({
    merchant_id: record.merchant_id,
    payment_link_id: record.id,
    installment_id: installment.id,
    provider: 'nexuspag',
    external_id: externalId,
    amount: centsToDecimal(cents),
    status: 'pending',
    provider_payload: {},
  }, { onConflict: 'external_id', ignoreDuplicates: true });
  if (insertError) return NextResponse.json({ error: 'Não foi possível registrar a cobrança.' }, { status: 503 });

  const { data: existing } = await admin.from('payments')
    .select('provider_payment_id,pix_copy_paste,provider_payload,status')
    .eq('external_id', externalId).maybeSingle();
  if (existing?.provider_payment_id && existing.pix_copy_paste && existing.status === 'pending') {
    const oldPayload = existing.provider_payload as { transaction?: { qr_code_base64?: string; expires_at?: string } } | null;
    return NextResponse.json({
      pixCopyPaste: existing.pix_copy_paste,
      qrCodeBase64: oldPayload?.transaction?.qr_code_base64 ?? null,
      expiresAt: oldPayload?.transaction?.expires_at ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch('https://nexuspag.com/api/pix/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        amount: Number((cents / 100).toFixed(2)),
        description: record.description.slice(0, 140),
        external_id: externalId,
        webhook_url: `${appUrl.replace(/\/$/, '')}/api/webhooks/nexuspag`,
        expiration: 1800,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ error: 'O provedor de pagamentos não respondeu. Você pode tentar novamente.' }, { status: 502 });
  }

  const body = await providerResponse.json().catch(() => null) as { success?: boolean; transaction?: { id?: string; status?: string; pix_copia_cola?: string; qr_code_base64?: string; expires_at?: string } } | null;
  if (!providerResponse.ok || !body?.transaction?.id || !body.transaction.pix_copia_cola) {
    return NextResponse.json({ error: 'O provedor não confirmou a criação da cobrança. Nenhum pagamento foi marcado como pago.' }, { status: 502 });
  }

  const { error: saveError } = await admin.from('payments').update({
    provider_payment_id: body.transaction.id,
    pix_copy_paste: body.transaction.pix_copia_cola,
    provider_payload: body,
    status: 'pending',
  }).eq('external_id', externalId);
  if (saveError) return NextResponse.json({ error: 'Cobrança criada no provedor, mas o registro local precisa ser reconciliado. Não tente criar outra cobrança.' }, { status: 503 });

  return NextResponse.json({
    pixCopyPaste: body.transaction.pix_copia_cola,
    qrCodeBase64: body.transaction.qr_code_base64 ?? null,
    expiresAt: body.transaction.expires_at ?? null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
