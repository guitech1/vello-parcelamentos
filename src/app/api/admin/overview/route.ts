import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: 'Autenticação não configurada no servidor.' }, { status: 503 });
  }
  const sessionClient = await createServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Administração não configurada no servidor.' }, { status: 503 });

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: isAdmin, error: adminCheckError } = await admin.rpc('is_vello_admin', { p_user_id: user.id });
  if (adminCheckError) return NextResponse.json({ error: 'Não foi possível verificar as permissões administrativas.' }, { status: 503 });
  if (isAdmin !== true) return NextResponse.json({ error: 'Acesso restrito à equipe administrativa.' }, { status: 403 });

  const [profiles, links, payments, withdrawals, users] = await Promise.all([
    admin.from('profiles').select('user_id,full_name,business_name,account_status,created_at').order('created_at', { ascending: false }).limit(100),
    admin.from('payment_links').select('id,merchant_id,description,total_amount,installment_count,status,created_at').order('created_at', { ascending: false }).limit(100),
    admin.from('payments').select('id,merchant_id,payment_link_id,amount,status,provider_payment_id,created_at,paid_at').order('created_at', { ascending: false }).limit(100),
    admin.from('withdrawals').select('id,merchant_id,amount,status,created_at,reviewed_at,rejection_reason').order('created_at', { ascending: false }).limit(100),
    admin.auth.admin.listUsers({ page: 1, perPage: 100 }),
  ]);

  if (profiles.error || links.error || payments.error || withdrawals.error || users.error) {
    return NextResponse.json({ error: 'Não foi possível carregar todos os dados administrativos.' }, { status: 503 });
  }

  const emailById = new Map((users.data.users ?? []).map(item => [item.id, item.email ?? '']));
  return NextResponse.json({
    users: (profiles.data ?? []).map(item => ({ ...item, email: emailById.get(item.user_id) ?? '' })),
    links: links.data ?? [],
    payments: payments.data ?? [],
    withdrawals: withdrawals.data ?? [],
    limits: { users: 100, links: 100, payments: 100, withdrawals: 100 },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
