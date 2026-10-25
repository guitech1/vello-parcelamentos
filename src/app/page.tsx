'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { centsToDecimal, parseBRLCents } from '@/lib/money';

type LinkRow = { id: string; public_token: string; description: string; total_amount: string | number; installment_count: number; status: string; created_at: string };
type InstallmentRow = { id: string; amount: string | number; status: string; due_at: string; installment_number: number };
type TicketRow = { id: string; subject: string; status: string; created_at: string };
type WithdrawalRow = { id: string; amount: string | number; status: string; created_at: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient() : null;
const money = (value: number | string) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) => new Date(value).toLocaleDateString('pt-BR');

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [tab, setTab] = useState<'overview' | 'links' | 'installments' | 'withdrawals' | 'support' | 'profile'>('overview');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('1');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileBusiness, setProfileBusiness] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePixKey, setProfilePixKey] = useState('');
  const [profilePixType, setProfilePixType] = useState('random');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');

  const refreshData = useCallback(async (currentUser: User) => {
    if (!supabase) return;
    const [linkResult, installmentResult, ticketResult, profileResult, withdrawalResult] = await Promise.all([
      supabase.from('payment_links').select('id,public_token,description,total_amount,installment_count,status,created_at').eq('merchant_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('installments').select('id,amount,status,due_at,installment_number').eq('merchant_id', currentUser.id).order('due_at', { ascending: true }).limit(100),
      supabase.from('support_tickets').select('id,subject,status,created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('full_name,business_name,phone,pix_key,pix_key_type').eq('user_id', currentUser.id).maybeSingle(),
      supabase.from('withdrawals').select('id,amount,status,created_at').eq('merchant_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (linkResult.error) setError('Não foi possível carregar os links. Verifique as políticas RLS e tente novamente.');
    else setLinks((linkResult.data ?? []) as LinkRow[]);
    if (!installmentResult.error) setInstallments((installmentResult.data ?? []) as InstallmentRow[]);
    if (!ticketResult.error) setTickets((ticketResult.data ?? []) as TicketRow[]);
    if (!withdrawalResult.error) setWithdrawals((withdrawalResult.data ?? []) as WithdrawalRow[]);
    if (profileResult.data) {
      setProfileName(profileResult.data.full_name ?? '');
      setProfileBusiness(profileResult.data.business_name ?? '');
      setProfilePhone(profileResult.data.phone ?? '');
      setProfilePixKey(profileResult.data.pix_key ?? '');
      setProfilePixType(profileResult.data.pix_key_type ?? 'random');
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError('Configuração ausente. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no ambiente de deploy.');
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      if (data.user) void refreshData(data.user);
      setLoading(false);
    }).catch(() => { if (active) { setError('Não foi possível validar sua sessão.'); setLoading(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void refreshData(session.user);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [refreshData]);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'reset') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (authError) throw authError;
        setNotice('Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.');
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim(), business_name: businessName.trim() } } });
        if (authError) throw authError;
        if (data.session && data.user) {
          setUser(data.user);
          setNotice('Cadastro concluído.');
        } else {
          setNotice('Cadastro recebido. Confira seu e-mail para confirmar a conta antes de entrar.');
          setMode('login');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        setUser(data.user);
        setNotice('Login realizado.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir a solicitação.');
    } finally { setBusy(false); }
  }

  async function createLink(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    setError(''); setNotice('');
    const cents = parseBRLCents(amount);
    const installmentsCount = Number(count);
    if (!description.trim()) { setError('Informe a descrição da cobrança.'); return; }
    if (cents === null || !Number.isSafeInteger(cents) || cents < 100 || cents > 100000000) { setError('Informe um valor entre R$ 1,00 e R$ 1.000.000,00.'); return; }
    if (!Number.isInteger(installmentsCount) || installmentsCount < 1 || installmentsCount > 10) { setError('Escolha de 1 a 10 parcelas.'); return; }
    setBusy(true);
    try {
      const { error: insertError } = await supabase.from('payment_links').insert({
        merchant_id: user.id,
        public_token: crypto.randomUUID(),
        description: description.trim(),
        total_amount: centsToDecimal(cents),
        installment_count: installmentsCount,
        status: 'active',
      });
      if (insertError) throw insertError;
      setDescription(''); setAmount(''); setCount('1');
      setNotice('Link criado. A cobrança Pix real permanece indisponível até a integração de pagamentos ser configurada.');
      await refreshData(user);
      setTab('links');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar o link. Confira as permissões da conta.');
    } finally { setBusy(false); }
  }

  async function createTicket(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    if (ticketSubject.trim().length < 4 || ticketMessage.trim().length < 10) { setError('Informe um assunto e uma mensagem com pelo menos 10 caracteres.'); return; }
    setBusy(true); setError(''); setNotice('');
    const { error: insertError } = await supabase.from('support_tickets').insert({ user_id: user.id, subject: ticketSubject.trim(), message: ticketMessage.trim() });
    if (insertError) setError('Não foi possível abrir o chamado. Tente novamente.');
    else { setTicketSubject(''); setTicketMessage(''); setNotice('Chamado registrado.'); await refreshData(user); }
    setBusy(false);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    if (!profileName.trim() || !profileBusiness.trim()) { setError('Informe seu nome e o nome da loja.'); return; }
    setBusy(true); setError(''); setNotice('');
    const { error: updateError } = await supabase.from('profiles').update({ full_name: profileName.trim(), business_name: profileBusiness.trim(), phone: profilePhone.trim(), pix_key: profilePixKey.trim(), pix_key_type: profilePixType }).eq('user_id', user.id);
    if (updateError) setError('Não foi possível salvar o perfil. Confira as permissões RLS.');
    else setNotice('Perfil atualizado.');
    setBusy(false);
  }

  async function createWithdrawal(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const cents = parseBRLCents(withdrawalAmount);
    if (cents === null || cents < 100) { setError('Informe um valor válido de pelo menos R$ 1,00.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: withdrawalAmount, requestKey: crypto.randomUUID() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível solicitar o saque.');
      setWithdrawalAmount('');
      setNotice('Solicitação registrada para análise. A transferência não é automática.');
      await refreshData(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível solicitar o saque.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError('Não foi possível encerrar a sessão.');
    else { setUser(null); setLinks([]); setInstallments([]); setTickets([]); setNotice('Sessão encerrada.'); }
  }

  if (loading) return <main className="center-screen"><section className="panel"><div className="brand-mark">V</div><h1>Vello Parcelamentos</h1><p>Validando sessão...</p></section></main>;

  if (!user) return <main className="auth-screen"><section className="auth-card">
    <div className="brand-mark">V</div><p className="eyebrow">GESTÃO DE PARCELAMENTOS</p><h1>{mode === 'login' ? 'Acesse sua conta' : mode === 'signup' ? 'Criar conta de lojista' : 'Recuperar acesso'}</h1>
    <p className="muted">Gerencie links e acompanhe suas parcelas em um único lugar.</p>
    {error && <p className="alert error" role="alert">{error}</p>}{notice && <p className="alert success" role="status">{notice}</p>}
    <form onSubmit={submitAuth} className="form-stack">
      {mode === 'signup' && <><label>Nome completo<input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" required maxLength={120} /></label><label>Nome da loja<input value={businessName} onChange={e => setBusinessName(e.target.value)} required maxLength={120} /></label></>}
      <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required maxLength={254} /></label>
      {mode !== 'reset' && <label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} /></label>}
      <button className="primary-button" disabled={busy}>{busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar instruções'}</button>
    </form>
    <div className="auth-links">
      {mode !== 'login' && <button onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Voltar ao login</button>}
      {mode === 'login' && <><button onClick={() => { setMode('signup'); setError(''); setNotice(''); }}>Criar conta</button><button onClick={() => { setMode('reset'); setError(''); setNotice(''); }}>Esqueci minha senha</button></>}
    </div>
    <p className="small-note">Os dados são carregados da sua conta autenticada. Nenhum pagamento é confirmado nesta tela.</p>
  </section></main>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark small-mark">V</span><span>Vello <b>Parcelamentos</b></span></div><div className="account"><span>{user.email}</span><button className="secondary-button" onClick={signOut}>Sair</button></div></header>
    <div className="layout"><aside className="sidebar"><p className="eyebrow">ÁREA DO LOJISTA</p>{([['overview','Visão geral'],['links','Links de cobrança'],['installments','Parcelas'],['withdrawals','Saques'],['support','Suporte'],['profile','Perfil']] as const).map(([id,label]) => <button key={id} className={tab === id ? 'nav-item active' : 'nav-item'} onClick={() => { setTab(id); setError(''); setNotice(''); }}>{label}</button>)}</aside>
      <section className="content"><div className="page-heading"><div><p className="eyebrow">PAINEL DO LOJISTA</p><h1>{tab === 'overview' ? 'Visão geral' : tab === 'links' ? 'Links de cobrança' : tab === 'installments' ? 'Parcelas' : tab === 'withdrawals' ? 'Saques' : tab === 'support' ? 'Central de suporte' : 'Perfil da loja'}</h1></div><span className="live-tag">Dados da conta</span></div>
      {error && <p className="alert error" role="alert">{error}</p>}{notice && <p className="alert success" role="status">{notice}</p>}
      {tab === 'overview' && <><div className="stats-grid"><article className="stat-card"><p>Links criados</p><strong>{links.length}</strong><span>Últimos 50 registros</span></article><article className="stat-card"><p>Parcelas registradas</p><strong>{installments.length}</strong><span>Dados retornados pelo banco</span></article><article className="stat-card"><p>Chamados de suporte</p><strong>{tickets.length}</strong><span>Histórico da sua conta</span></article></div><div className="panel section-panel"><div className="section-title"><h2>Links recentes</h2><button className="text-button" onClick={() => setTab('links')}>Ver todos</button></div>{links.length ? <div className="data-list">{links.slice(0,5).map(link => <div className="data-row" key={link.id}><div><b>{link.description}</b><p>{date(link.created_at)} · {link.installment_count}x</p></div><strong>{money(link.total_amount)}</strong></div>)}</div> : <div className="empty-state"><b>Nenhum link cadastrado</b><p>Crie um link para começar a organizar suas cobranças.</p><button className="primary-button compact" onClick={() => setTab('links')}>Criar link</button></div>}</div></>}
      {tab === 'links' && <div className="two-column"><section className="panel section-panel"><h2>Novo link de parcelamento</h2><p className="muted">Cria o registro no banco. A cobrança Pix depende da integração de pagamentos.</p><form onSubmit={createLink} className="form-stack"><label>Descrição<input value={description} onChange={e => setDescription(e.target.value)} required maxLength={160} placeholder="Ex.: Pedido 1042" /></label><label>Valor total (R$)<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="150,00" /></label><label>Quantidade de parcelas<select value={count} onChange={e => setCount(e.target.value)}>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}x</option>)}</select></label><button className="primary-button" disabled={busy}>{busy ? 'Salvando...' : 'Criar link'}</button></form></section><section className="panel section-panel"><h2>Seus links</h2>{links.length ? <div className="data-list">{links.map(link=><div className="data-row" key={link.id}><div><b>{link.description}</b><p>{link.installment_count}x · {date(link.created_at)} · {link.status}</p><a href={'/checkout/'+encodeURIComponent(link.public_token)}>{typeof window !== 'undefined' ? window.location.origin : ''}/checkout/{link.public_token}</a></div><strong>{money(link.total_amount)}</strong></div>)}</div> : <p className="empty-state">Os links criados aparecerão aqui.</p>}</section></div>}
      {tab === 'installments' && <section className="panel section-panel"><h2>Histórico de parcelas</h2>{installments.length ? <div className="table-wrap"><table><thead><tr><th>Parcela</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead><tbody>{installments.map(item=><tr key={item.id}><td>{item.installment_number}</td><td>{money(item.amount)}</td><td>{date(item.due_at)}</td><td>{item.status}</td></tr>)}</tbody></table></div> : <div className="empty-state"><b>Nenhuma parcela encontrada</b><p>As parcelas serão exibidas quando existirem registros no banco.</p></div>}</section>}
      {tab === 'support' && <div className="two-column"><section className="panel section-panel"><h2>Abrir chamado</h2><form onSubmit={createTicket} className="form-stack"><label>Assunto<input value={ticketSubject} onChange={e=>setTicketSubject(e.target.value)} required minLength={4} maxLength={120}/></label><label>Mensagem<textarea value={ticketMessage} onChange={e=>setTicketMessage(e.target.value)} required minLength={10} maxLength={3000}/></label><button className="primary-button" disabled={busy}>{busy ? 'Enviando...' : 'Enviar chamado'}</button></form></section><section className="panel section-panel"><h2>Seus chamados</h2>{tickets.length ? tickets.map(ticket=><div className="data-row" key={ticket.id}><div><b>{ticket.subject}</b><p>{date(ticket.created_at)}</p></div><span className="status-tag">{ticket.status}</span></div>) : <p className="empty-state">Você ainda não abriu chamados.</p>}</section></div>}
      {tab === 'profile' && <section className="panel section-panel profile-form"><h2>Dados da loja</h2><p className="muted">E-mail da conta: {user.email}</p><form onSubmit={saveProfile} className="form-stack"><label>Nome completo<input value={profileName} onChange={e=>setProfileName(e.target.value)} required maxLength={120}/></label><label>Nome da loja<input value={profileBusiness} onChange={e=>setProfileBusiness(e.target.value)} required maxLength={120}/></label><label>Telefone<input value={profilePhone} onChange={e=>setProfilePhone(e.target.value)} inputMode="tel" maxLength={24}/></label><label>Chave Pix<input value={profilePixKey} onChange={e=>setProfilePixKey(e.target.value)} maxLength={255} placeholder="Cadastre a chave para saque"/></label><label>Tipo de chave Pix<select value={profilePixType} onChange={e=>setProfilePixType(e.target.value)}><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option></select></label><button className="primary-button" disabled={busy}>{busy ? 'Salvando...' : 'Salvar perfil'}</button></form></section>}
      <p className="footnote">Os valores e status apresentados vêm do banco de dados. Cobranças, confirmações de pagamento e saques reais não estão habilitados sem o backend financeiro seguro.</p>
      </section>
    </div>
  </main>;
}
