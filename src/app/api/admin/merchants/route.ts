import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

async function assertAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return { error: NextResponse.json({ error: 'Servidor sem configuração de administração.' }, { status: 500 }) }
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: isAdmin } = await admin.schema('private').from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 }) }
  }
  return { user, admin }
}

export async function GET() {
  const result = await assertAdmin()
  if ('error' in result && result.error) return result.error
  const { admin } = result as { admin: ReturnType<typeof createClient> }

  const { data, error } = await admin
    .from('profiles')
    .select('user_id, full_name, business_name, phone, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: 'Não foi possível listar os lojistas.' }, { status: 500 })
  }
  return NextResponse.json({ merchants: data ?? [] })
}

export async function POST(request: NextRequest) {
  const result = await assertAdmin()
  if ('error' in result && result.error) return result.error
  const { admin, user } = result as { admin: ReturnType<typeof createClient>; user: { id: string } }

  const body = await request.json().catch(() => ({}))
  const userId = String(body.userId ?? '').trim()
  const status = String(body.status ?? '').trim()
  const reason = String(body.reason ?? '').trim()

  if (!userId || !['active', 'pending', 'suspended', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
  }
  if ((status === 'rejected' || status === 'suspended') && reason.length < 4) {
    return NextResponse.json({ error: 'Informe um motivo com pelo menos 4 caracteres.' }, { status: 400 })
  }

  const { error } = await admin
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: 'Não foi possível atualizar o status da conta.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId, status, reviewedBy: user.id })
}
