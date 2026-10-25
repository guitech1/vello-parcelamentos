import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBRLCents } from '@/lib/money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validSignature(header: string | null, rawBody: string, secret: string): boolean {
  if (!header) return false;
  const fields = Object.fromEntries(header.split(',').map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part, ''] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }));
  const timestamp = Number(fields.t);
  const received = fields.v1 ?? '';
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = createHmac('sha256', secret).update(`${fields.t}.${rawBody}`).digest();
  const actual = Buffer.from(received, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  const secret = process.env.NEXUSPAG_WEBHOOK_SECRET;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) {
    return NextResponse.json({ error: 'Webhook não configurado no servidor.' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!validSignature(request.headers.get('x-webhook-signature'), rawBody, secret)) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const eventType = request.headers.get('x-webhook-event') ?? (typeof payload.event === 'string' ? payload.event : '');
  const externalId = typeof payload.external_id === 'string' ? payload.external_id : '';
  const transactionId = typeof payload.transaction_id === 'string' ? payload.transaction_id : '';
  const cents = typeof payload.amount === 'number' || typeof payload.amount === 'string' ? parseBRLCents(String(payload.amount)) : null;
  if (!eventType || !externalId || !transactionId || cents === null) {
    return NextResponse.json({ error: 'Campos obrigatórios do evento ausentes.' }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const providerEventId = `${eventType}:${externalId}:${transactionId}`;
  const { data, error } = await admin.rpc('process_nexuspag_payment_event', {
    p_provider_event_id: providerEventId,
    p_event_type: eventType,
    p_payload: payload,
    p_external_id: externalId,
    p_provider_payment_id: transactionId,
    p_amount: (cents / 100).toFixed(2),
    p_paid_at: typeof payload.paid_at === 'string' ? payload.paid_at : new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: 'Não foi possível processar o evento.' }, { status: 503 });
  }
  const result = data as string;
  if (result === 'processed' || result === 'duplicate' || result === 'ignored') {
    return NextResponse.json({ received: true, result }, { status: 200 });
  }
  return NextResponse.json({ received: false, result }, { status: result === 'payment_not_found' ? 404 : 400 });
}
