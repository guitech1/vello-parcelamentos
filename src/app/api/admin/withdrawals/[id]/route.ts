import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Solicitação inválida.' }, { status: 404 });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: 'Autenticação não configurada no servidor.' }, { status: 503 });
  }
  const sessionClient = await createServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: 'Administração não configurada no servidor.' }, { status: 503 });

  let body: { action?: unknown; reason?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const action = body.action === 'approve' || body.action === 'reject' ? body.action : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!action || (action === 'reject' && reason.length < 4)) {
    return NextResponse.json({ error: 'Escolha uma ação válida e informe o motivo da rejeição.' }, { status: 400 });
  }

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: isAdmin, error: adminCheckError } = await admin.rpc('is_vello_admin', { p_user_id: user.id });
  if (adminCheckError) return NextResponse.json({ error: 'Não foi possível verificar as permissões administrativas.' }, { status: 503 });
  if (isAdmin !== true) return NextResponse.json({ error: 'Acesso restrito à equipe administrativa.' }, { status: 403 });

  const { data, error } = await admin.rpc('review_vello_withdrawal', {
    p_admin_user_id: user.id,
    p_withdrawal_id: id,
    p_action: action,
    p_reason: action === 'reject' ? reason : null,
  });
  if (error) return NextResponse.json({ error: 'Não foi possível registrar a decisão.' }, { status: 503 });
  const result = String(data);
  if (result === 'approved' || result === 'rejected') return NextResponse.json({ status: result });
  const messages: Record<string, string> = {
    not_admin: 'Acesso restrito à equipe administrativa.',
    invalid_action: 'Ação inválida.',
    reason_required: 'Informe o motivo da rejeição.',
    not_found: 'Solicitação não encontrada.',
    not_pending: 'A solicitação já foi analisada.',
  };
  return NextResponse.json({ error: messages[result] ?? 'Não foi possível concluir a operação.' }, { status: result === 'not_admin' ? 403 : 409 });
}
