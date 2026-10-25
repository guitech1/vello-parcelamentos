import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: 'Autenticação não configurada no servidor.' }, { status: 503 });
  }
  const sessionClient = await createServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Faça login para cancelar um link.' }, { status: 401 });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Cancelamento não configurado no servidor.' }, { status: 503 });

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await admin.rpc('cancel_merchant_payment_link', { p_merchant_id: user.id, p_link_id: id });
  if (error) return NextResponse.json({ error: 'Não foi possível cancelar o link.' }, { status: 503 });

  const messages: Record<string, string> = {
    invalid_request: 'Requisição inválida.',
    not_found: 'Link não encontrado para esta conta.',
    not_active: 'Este link não está ativo.',
    payment_exists: 'Este link já possui uma cobrança registrada e não pode ser cancelado automaticamente.',
  };
  if (data !== 'cancelled') return NextResponse.json({ error: messages[String(data)] ?? 'Não foi possível cancelar o link.' }, { status: data === 'not_found' ? 404 : 409 });
  return NextResponse.json({ status: 'cancelled' });
}
