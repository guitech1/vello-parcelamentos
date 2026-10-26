'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { parseBRLCents } from '@/lib/money';

type LinkRow = { id: string; public_token: string; description: string; total_amount: string | number; installment_count: number; status: string; created_at: string };
type InstallmentRow = { id: string; amount: string | number; status: string; due_at: string; installment_number: number };
type TicketRow = { id: string; subject: string; status: string; created_at: string };
type WithdrawalRow = { id: string; amount: string | number; status: string; created_at: string };
type Tab = 'overview' | 'links' | 'installments' | 'withdrawals' | 'support' | 'profile' | 'integrate';
type Gateway = 'vello' | 'fluxpay' | null;
type IntegrateStep = 'loading' | 'select' | 'credentials' | 'confirm';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient() : null;
const money = (value: number | string) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) => new Date(value).toLocaleDateString('pt-BR');

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Início', icon: <svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"/></svg> },
  { id: 'links', label: 'Links', icon: <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
  { id: 'installments', label: 'Parcelas', icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg> },
  { id: 'withdrawals', label: 'Saques', icon: <svg viewBox="0 0 24 24"><path d="M12 2v20M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { id: 'integrate', label: 'Integrar', icon: <svg viewBox="0 0 24 24"><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/></svg> },
  { id: 'support', label: 'Suporte', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/></svg> },
  { id: 'profile', label: 'Perfil', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg> },
];

function Orb3D() {
  return (
    <div className="orb-scene" aria-hidden="true">
      <div className="orb"><div className="orb-ring" /><div className="orb-ring" /><div className="orb-core" /></div>
    </div>
  );
}

function NavCircles({ tab, setTab, mobile }: { tab: Tab; setTab: (t: Tab) => void; mobile?: boolean }) {
  const items = mobile ? NAV.filter(n => ['overview', 'links', 'integrate', 'withdrawals', 'profile'].includes(n.id)) : NAV;
  return (
    <div className={mobile ? 'bottom-nav' : 'nav-grid'}>
      {items.map(item => (
        <button key={item.id} type="button" className={`nav-circle${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}>
          <span className="circle">{item.icon}</span><span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(supabase ? '' : 'Configuração ausente.');
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
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
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [integrateStep, setIntegrateStep] = useState<IntegrateStep>('loading');
  const [selectedGateway, setSelectedGateway] = useState<Gateway>(null);
  const [sessionCreds, setSessionCreds] = useState<{ id: string; key: string } | null>(null);
  const [confirmedSave, setConfirmedSave] = useState(false);
  const [copied, setCopied] = useState('');

  const refreshData = useCallback(async (currentUser: User) => {
    if (!supabase) return;
    const [linkResult, installmentResult, ticketResult, profileResult, withdrawalResult] = await Promise.all([
      supabase.from('payment_links').select('id,public_token,description,total_amount,installment_count,status,created_at').eq('merchant_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('installments').select('id,amount,status,due_at,installment_number').eq('merchant_id', currentUser.id).order('due_at', { ascending: true }).limit(100),
      supabase.from('support_tickets').select('id,subject,status,created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('full_name,business_name,phone,pix_key,pix_key_type,status').eq('user_id', currentUser.id).maybeSingle(),
      supabase.from('withdrawals').select('id,amount,status,created_at').eq('merchant_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (linkResult.error) setError('Não foi possível carregar os links.');
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
      setAccountStatus(profileResult.data.status ?? 'pending');
    } else {
      setAccountStatus('pending');
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      if (data.user) void refreshData(data.user);
      setLoading(false);
    }).catch(() => { if (active) { setError('Não foi possível validar sua sessão.'); setLoading(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT') setRecoveryMode(false);
      setUser(session?.user ?? null);
      if (session?.user) void refreshData(session.user);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [refreshData]);

  useEffect(() => {
    if (!user || !supabase || accountStatus !== 'pending') return;
    const id = setInterval(() => { void refreshData(user); }, 8000);
    return () => clearInterval(id);
  }, [user, accountStatus, refreshData]);

  useEffect(() => {
    if (tab !== 'integrate') {
      setIntegrateStep('loading');
      setSelectedGateway(null);
      setSessionCreds(null);
      setConfirmedSave(false);
      return;
    }
    setIntegrateStep('loading');
    const t = setTimeout(() => setIntegrateStep('select'), 2800);
    return () => clearTimeout(t);
  }, [tab]);

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
          setAccountStatus('pending');
          setNotice('Cadastro recebido. Sua conta ficará em análise até a aprovação.');
        } else {
          setNotice('Cadastro recebido. Confirme seu e-mail antes de entrar.');
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
      const response = await fetch('/api/links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: description.trim(), amount, installmentCount: installmentsCount }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível criar o link.');
      setDescription(''); setAmount(''); setCount('1');
      setNotice('Link criado com sucesso.');
      await refreshData(user);
      setTab('links');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar o link.');
    } finally { setBusy(false); }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (!supabase || newPassword.length < 8) { setError('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    setBusy(true); setError(''); setNotice('');
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) setError('Não foi possível atualizar a senha.');
    else { setRecoveryMode(false); setNewPassword(''); setNotice('Senha atualizada.'); }
    setBusy(false);
  }

  async function cancelLink(link: LinkRow) {
    if (!user || !window.confirm('Cancelar este link?')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/links/' + encodeURIComponent(link.id) + '/cancel', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível cancelar o link.');
      setNotice('Link cancelado.');
      await refreshData(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível cancelar o link.');
    } finally { setBusy(false); }
  }

  async function createTicket(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    if (ticketSubject.trim().length < 4 || ticketMessage.trim().length < 10) { setError('Informe um assunto e uma mensagem com pelo menos 10 caracteres.'); return; }
    setBusy(true); setError(''); setNotice('');
    const { error: insertError } = await supabase.from('support_tickets').insert({ user_id: user.id, subject: ticketSubject.trim(), message: ticketMessage.trim() });
    if (insertError) setError('Não foi possível abrir o chamado.');
    else { setTicketSubject(''); setTicketMessage(''); setNotice('Chamado registrado.'); await refreshData(user); }
    setBusy(false);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    if (!profileName.trim() || !profileBusiness.trim()) { setError('Informe seu nome e o nome da loja.'); return; }
    setBusy(true); setError(''); setNotice('');
    const { error: updateError } = await supabase.from('profiles').update({ full_name: profileName.trim(), business_name: profileBusiness.trim(), phone: profilePhone.trim(), pix_key: profilePixKey.trim(), pix_key_type: profilePixType }).eq('user_id', user.id);
    if (updateError) setError('Não foi possível salvar o perfil.');
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
      const response = await fetch('/api/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: withdrawalAmount, requestKey: crypto.randomUUID() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível solicitar o saque.');
      setWithdrawalAmount('');
      setNotice('Solicitação de saque registrada.');
      await refreshData(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível solicitar o saque.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError('Não foi possível encerrar a sessão.');
    else { setUser(null); setLinks([]); setInstallments([]); setTickets([]); setAccountStatus(null); setNotice('Sessão encerrada.'); }
  }

  function selectGateway(gw: Gateway) {
    setSelectedGateway(gw);
    const id = `${gw === 'vello' ? 'VL' : 'FP'}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    const key = `sk_live_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    setSessionCreds({ id, key });
    setIntegrateStep('credentials');
    setConfirmedSave(false);
  }

  function copyText(label: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => { setCopied(label); setTimeout(() => setCopied(''), 2000); });
  }

  function leaveIntegration() {
    if (sessionCreds && !confirmedSave) {
      const ok = window.confirm('As credenciais desta sessão serão descartadas e podem não ser exibidas novamente. Deseja sair mesmo assim?');
      if (!ok) return;
    }
    setSessionCreds(null);
    setSelectedGateway(null);
    setConfirmedSave(false);
    setTab('overview');
  }

  if (loading) {
    return (
      <main className="center-screen">
        <section className="auth-card" style={{ textAlign: 'center' }}>
          <div className="brand-row"><Image src="/logo.png" alt="Vello" width={140} height={42} className="brand-logo" style={{ height: 42, width: 'auto' }} priority /></div>
          <h1>Vello Parcelamentos</h1>
          <p className="muted">Validando sessão…</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <div className="auth-layout">
          <div className="auth-visual">
            <Orb3D />
            <h2>Parcelamento no Pix com controle total</h2>
            <p>Crie links, acompanhe parcelas e gerencie saques em uma plataforma feita para lojistas.</p>
          </div>
          <section className="auth-card">
            <div className="brand-row"><Image src="/logo.png" alt="Vello" width={140} height={42} className="brand-logo" style={{ height: 42, width: 'auto' }} priority /></div>
            <p className="eyebrow">Gestão de parcelamentos</p>
            <h1>{mode === 'login' ? 'Acesse sua conta' : mode === 'signup' ? 'Criar conta' : 'Recuperar acesso'}</h1>
            <p className="muted">{mode === 'login' ? 'Entre para gerenciar links, parcelas e saques.' : mode === 'signup' ? 'Cadastre sua loja. O acesso é liberado após análise.' : 'Informe o e-mail cadastrado para redefinir a senha.'}</p>
            {error && <p className="alert error" role="alert">{error}</p>}
            {notice && <p className="alert success" role="status">{notice}</p>}
            <form onSubmit={submitAuth} className="form-stack">
              {mode === 'signup' && (<><label>Nome completo<input value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" required maxLength={120} /></label><label>Nome da loja<input value={businessName} onChange={e => setBusinessName(e.target.value)} required maxLength={120} /></label></>)}
              <label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required maxLength={254} /></label>
              {mode !== 'reset' && (<label>Senha<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} /></label>)}
              <button className="primary-button" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar instruções'}</button>
            </form>
            <div className="auth-links">
              {mode !== 'login' && <button type="button" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Voltar ao login</button>}
              {mode === 'login' && (<><button type="button" onClick={() => { setMode('signup'); setError(''); setNotice(''); }}>Criar conta</button><button type="button" onClick={() => { setMode('reset'); setError(''); setNotice(''); }}>Esqueci minha senha</button></>)}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (recoveryMode) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="brand-row"><Image src="/logo.png" alt="Vello" width={140} height={42} className="brand-logo" style={{ height: 42, width: 'auto' }} priority /></div>
          <p className="eyebrow">Recuperação de acesso</p>
          <h1>Definir nova senha</h1>
          {error && <p className="alert error" role="alert">{error}</p>}
          <form onSubmit={updatePassword} className="form-stack">
            <label>Nova senha<input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
            <button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Atualizar senha'}</button>
          </form>
        </section>
      </main>
    );
  }

  if (user && accountStatus && accountStatus !== 'active') {
    const isPending = accountStatus === 'pending';
    const isRejected = accountStatus === 'rejected' || accountStatus === 'suspended';
    return (
      <main className="auth-screen">
        <section className="auth-card" style={{ textAlign: 'center', maxWidth: 440 }}>
          <div className="brand-row"><Image src="/logo.png" alt="Vello" width={140} height={42} className="brand-logo" style={{ height: 42, width: 'auto' }} priority /></div>
          {isPending && (
            <>
              <div className="loader-wrap" style={{ padding: '24px 0' }}><div className="loader-ring" aria-hidden="true" /></div>
              <p className="eyebrow">Análise de conta</p>
              <h1>Sua conta está em análise</h1>
              <p className="muted">Recebemos o seu cadastro. Nossa equipe está revisando os dados antes de liberar o acesso à plataforma. Esta tela atualiza automaticamente quando a conta for aprovada.</p>
              <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>E-mail: {user.email}</p>
            </>
          )}
          {isRejected && (
            <>
              <p className="eyebrow">Acesso restrito</p>
              <h1>{accountStatus === 'suspended' ? 'Conta suspensa' : 'Cadastro não aprovado'}</h1>
              <p className="muted">No momento não é possível utilizar a plataforma com esta conta. Se acredita que houve um engano, entre em contato com o suporte.</p>
              <p className="muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>E-mail: {user.email}</p>
            </>
          )}
          <div style={{ marginTop: 24 }}><button type="button" className="secondary-button" onClick={signOut}>Sair da conta</button></div>
        </section>
      </main>
    );
  }

  if (tab === 'integrate') {
    return (
      <main className="integration-screen">
        <section className="integration-card">
          {integrateStep === 'loading' && (<div className="loader-wrap"><div className="loader-ring" aria-hidden="true" /><p className="muted">Preparando a configuração de integração…</p></div>)}
          {integrateStep === 'select' && (
            <>
              <h1>Selecione sua gateway de recebimento</h1>
              <p className="muted">Escolha a gateway que será utilizada para configurar sua integração de parcelamentos.</p>
              <div className="gateway-options">
                <button type="button" className={`gateway-card${selectedGateway === 'vello' ? ' selected' : ''}`} onClick={() => selectGateway('vello')}><p className="gw-name">Vello</p><p className="gw-desc">Gateway nativa da plataforma.</p></button>
                <button type="button" className={`gateway-card${selectedGateway === 'fluxpay' ? ' selected' : ''}`} onClick={() => selectGateway('fluxpay')}><p className="gw-name">FluxPay</p><p className="gw-desc">Integração FluxPay para recebimentos.</p></button>
              </div>
              <button type="button" className="secondary-button" style={{ width: '100%' }} onClick={leaveIntegration}>Voltar ao painel</button>
            </>
          )}
          {integrateStep === 'credentials' && sessionCreds && (
            <>
              <h1>Credenciais de integração</h1>
              <p className="muted">Gateway: <strong style={{ color: 'var(--text)' }}>{selectedGateway === 'vello' ? 'Vello' : 'FluxPay'}</strong></p>
              <div className="cred-block"><label>Identificador</label><div className="cred-row"><code>{sessionCreds.id}</code><button type="button" className="copy-btn" onClick={() => copyText('id', sessionCreds.id)}>{copied === 'id' ? 'Copiado' : 'Copiar'}</button></div></div>
              <div className="cred-block"><label>Chave</label><div className="cred-row"><code>{sessionCreds.key}</code><button type="button" className="copy-btn" onClick={() => copyText('key', sessionCreds.key)}>{copied === 'key' ? 'Copiado' : 'Copiar'}</button></div></div>
              <p className="security-note">Credenciais exibidas apenas nesta sessão e não são armazenadas. Em produção, a geração real depende da conexão com o serviço da gateway.</p>
              <div className="confirm-box">
                <h3>Guarde suas credenciais de integração</h3>
                <p>Confirme que armazenou as informações necessárias antes de continuar.</p>
                <label className="checkbox"><input type="checkbox" checked={confirmedSave} onChange={e => setConfirmedSave(e.target.checked)} /><span>Confirmo que guardei meu identificador e minha chave.</span></label>
                <div className="btn-row">
                  <button type="button" className="primary-button" disabled={!confirmedSave} onClick={() => { setSessionCreds(null); setTab('overview'); }}>Confirmar e continuar</button>
                  <button type="button" className="secondary-button">Continuar na integração</button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><Image src="/logo.png" alt="Vello" width={110} height={30} className="brand-logo" style={{ height: 30, width: 'auto' }} priority /><span>Vello <b>Parcelamentos</b></span></div>
        <div className="account"><span>{user.email}</span><button type="button" className="secondary-button" onClick={signOut}>Sair</button></div>
      </header>
      <div className="layout">
        <aside className="sidebar"><p className="eyebrow">Área do lojista</p><NavCircles tab={tab} setTab={(t) => { setTab(t); setError(''); setNotice(''); }} /></aside>
        <section className="content">
          <div className="page-heading"><div><p className="eyebrow">Painel do lojista</p><h1>{tab === 'overview' ? 'Visão geral' : tab === 'links' ? 'Links de cobrança' : tab === 'installments' ? 'Parcelas' : tab === 'withdrawals' ? 'Saques' : tab === 'support' ? 'Central de suporte' : 'Perfil da loja'}</h1></div><span className="live-tag">Conta ativa</span></div>
          {error && <p className="alert error" role="alert">{error}</p>}
          {notice && <p className="alert success" role="status">{notice}</p>}
          {tab === 'overview' && (<><div className="stats-grid"><article className="stat-card"><p>Links criados</p><strong>{links.length}</strong><span>Últimos 50 registros</span></article><article className="stat-card"><p>Parcelas</p><strong>{installments.length}</strong><span>Parcelas da conta</span></article><article className="stat-card"><p>Chamados</p><strong>{tickets.length}</strong><span>Histórico de suporte</span></article></div><div className="panel section-panel"><div className="section-title"><h2>Links recentes</h2><button type="button" className="text-button" onClick={() => setTab('links')}>Ver todos</button></div>{links.length ? <div className="data-list">{links.slice(0, 5).map(link => <div className="data-row" key={link.id}><div><b>{link.description}</b><p>{date(link.created_at)} · {link.installment_count}x</p></div><strong>{money(link.total_amount)}</strong></div>)}</div> : <div className="empty-state"><b>Nenhum link cadastrado</b><p>Crie um link para começar.</p><button type="button" className="primary-button compact" onClick={() => setTab('links')}>Criar link</button></div>}</div></>)}
          {tab === 'links' && (<div className="two-column"><section className="panel section-panel"><h2>Novo link de parcelamento</h2><form onSubmit={createLink} className="form-stack" style={{ marginTop: 16 }}><label>Descrição<input value={description} onChange={e => setDescription(e.target.value)} required maxLength={160} /></label><label>Valor total (R$)<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="150,00" /></label><label>Parcelas<select value={count} onChange={e => setCount(e.target.value)}>{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={String(n)}>{n}x</option>)}</select></label><button className="primary-button" disabled={busy}>{busy ? 'Criando…' : 'Gerar link'}</button></form></section><section className="panel section-panel"><h2>Seus links</h2>{links.length ? <div className="data-list">{links.map(link => <div className="data-row" key={link.id}><div><b>{link.description}</b><p>{date(link.created_at)} · {link.installment_count}x · {link.status}</p></div><div className="row-actions"><strong>{money(link.total_amount)}</strong><button type="button" className="text-button" onClick={() => cancelLink(link)} disabled={busy}>Cancelar</button></div></div>)}</div> : <p className="empty-state">Nenhum link criado ainda.</p>}</section></div>)}
          {tab === 'installments' && (<section className="panel section-panel"><h2>Parcelas</h2>{installments.length ? <div className="data-list">{installments.map(item => <div className="data-row" key={item.id}><div><b>Parcela {item.installment_number}</b><p>Vencimento {date(item.due_at)}</p></div><div className="row-actions"><strong>{money(item.amount)}</strong><span className="status-tag">{item.status}</span></div></div>)}</div> : <p className="empty-state">Nenhuma parcela registrada.</p>}</section>)}
          {tab === 'withdrawals' && (<div className="two-column"><section className="panel section-panel"><h2>Solicitar saque</h2><form onSubmit={createWithdrawal} className="form-stack" style={{ marginTop: 12 }}><label>Valor (R$)<input inputMode="decimal" value={withdrawalAmount} onChange={e => setWithdrawalAmount(e.target.value)} required placeholder="100,00" /></label><button className="primary-button" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar saque'}</button></form></section><section className="panel section-panel"><h2>Histórico de saques</h2>{withdrawals.length ? <div className="data-list">{withdrawals.map(w => <div className="data-row" key={w.id}><div><b>{money(w.amount)}</b><p>{date(w.created_at)}</p></div><span className="status-tag">{w.status}</span></div>)}</div> : <p className="empty-state">Nenhuma solicitação de saque registrada.</p>}</section></div>)}
          {tab === 'support' && (<div className="two-column"><section className="panel section-panel"><h2>Abrir chamado</h2><form onSubmit={createTicket} className="form-stack" style={{ marginTop: 12 }}><label>Assunto<input value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} required minLength={4} maxLength={120} /></label><label>Mensagem<textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} required minLength={10} maxLength={3000} rows={4} /></label><button className="primary-button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar chamado'}</button></form></section><section className="panel section-panel"><h2>Seus chamados</h2>{tickets.length ? tickets.map(ticket => <div className="data-row" key={ticket.id}><div><b>{ticket.subject}</b><p>{date(ticket.created_at)}</p></div><span className="status-tag">{ticket.status}</span></div>) : <p className="empty-state">Você ainda não abriu chamados.</p>}</section></div>)}
          {tab === 'profile' && (<section className="panel section-panel"><h2>Dados da loja</h2><p className="muted">E-mail: {user.email}</p><form onSubmit={saveProfile} className="form-stack" style={{ marginTop: 16 }}><label>Nome completo<input value={profileName} onChange={e => setProfileName(e.target.value)} required maxLength={120} /></label><label>Nome da loja<input value={profileBusiness} onChange={e => setProfileBusiness(e.target.value)} required maxLength={120} /></label><label>Telefone<input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} inputMode="tel" maxLength={24} /></label><label>Chave Pix<input value={profilePixKey} onChange={e => setProfilePixKey(e.target.value)} maxLength={255} /></label><label>Tipo de chave Pix<select value={profilePixType} onChange={e => setProfilePixType(e.target.value)}><option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option></select></label><button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar perfil'}</button></form></section>)}
        </section>
      </div>
      <NavCircles tab={tab} setTab={(t) => { setTab(t); setError(''); setNotice(''); }} mobile />
    </main>
  );
}
