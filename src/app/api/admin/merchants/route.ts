import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function getAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { error: NextResponse.json({ error: 'Autenticação não configurada no servidor.' }, { status: 503 }) };
  }

  const sessionClient = await createServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 }) };
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return { error: NextResponse.json({ error: 'Administração não configurada no servidor.' }, { status: 503 }) };
  }

  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: isAdmin, error: adminCheckError } = await admin.rpc('is_vello_admin', {
    p_user_id: user.id,
  });
  if (adminCheckError) {
    return { error: NextResponse.json({ error: 'Não foi possível verificar as permissões administrativas.' }, { status: 503 }) };
  }
  if (isAdmin !== true) {
    return { error: NextResponse.json({ error: 'Acesso restrito à equipe administrativa.' }, { status: 403 }) };
  }

  return { user, admin };
}

export async function GET() {
  const result = await getAdminClient();
  if ('error' in result && result.error) return result.error;
  const { admin } = result as { admin: ReturnType<typeof createAdminClient> };

  const { data, error } = await admin
    .from('profiles')
    .select('user_id, full_name, business_name, phone, account_status, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    // Fallback se a coluna status ainda não existir
    const fallback = await admin
      .from('profiles')
      .select('user_id, full_name, business_name, phone, account_status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fallback.error) {
      return NextResponse.json({ error: 'Não foi possível listar os lojistas.' }, { status: 500 });
    }

    const merchants = (fallback.data ?? []).map((row) => ({
      ...row,
      status: row.account_status ?? 'pending',
    }));
    return NextResponse.json({ merchants }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const merchants = (data ?? []).map((row) => ({
    ...row,
    status: row.status ?? row.account_status ?? 'pending',
  }));

  return NextResponse.json({ merchants }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const result = await getAdminClient();
  if ('error' in result && result.error) return result.error;
  const { admin, user } = result as {
    admin: ReturnType<typeof createAdminClient>;
    user: { id: string };
  };

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId ?? '').trim();
  const status = String(body.status ?? '').trim();
  const reason = String(body.reason ?? '').trim();

  if (!userId || !['active', 'pending', 'suspended', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
  }
  if ((status === 'rejected' || status === 'suspended') && reason.length < 4) {
    return NextResponse.json({ error: 'Informe um motivo com pelo menos 4 caracteres.' }, { status: 400 });
  }

  // Atualiza status e account_status para compatibilidade com o schema atual
  const payload: Record<string, string> = {
    account_status: status,
    updated_at: new Date().toISOString(),
  };

  let { error } = await admin.from('profiles').update({ ...payload, status }).eq('user_id', userId);

  if (error) {
    const retry = await admin.from('profiles').update(payload).eq('user_id', userId);
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: 'Não foi possível atualizar o status da conta.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, userId, status, reviewedBy: user.id });
}
