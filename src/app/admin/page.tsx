'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

type Row = Record<string, string | number | null | undefined>;
type AdminData = { users: Row[]; links: Row[]; payments: Row[]; withdrawals: Row[]; merchants?: Row[] };

const money = (value: unknown) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: unknown) => (value ? new Date(String(value)).toLocaleString('pt-BR') : '—');

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, merchantsRes] = await Promise.all([
        fetch('/api/admin/overview', { cache: 'no-store' }),
        fetch('/api/admin/merchants', { cache: 'no-store' }),
      ]);
      const body = await overviewRes.json();
      if (!overviewRes.ok) throw new Error(body.error || 'Não foi possível carregar o painel.');
      let merchants: Row[] = [];
      if (merchantsRes.ok) {
        const m = await merchantsRes.json();
        merchants = (m.merchants ?? []) as Row[];
      }
      setData({ ...(body as AdminData), merchants });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function review(id: string, action: 'approve' | 'reject') {
    const reason = action === 'reject' ? (window.prompt('Informe o motivo da rejeição:')?.trim() ?? '') : '';
    if (action === 'reject' && reason.length < 4) {
      setError('Para rejeitar, informe um motivo com pelo menos 4 caracteres.');
      return;
    }
    if (action === 'approve' && !window.confirm('Aprovar esta solicitação para processamento manual?')) return;
    setBusyId(id);
    setError('');
    try {
      const response = await fetch('/api/admin/withdrawals/' + encodeURIComponent(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível registrar a decisão.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível registrar a decisão.');
    } finally {
      setBusyId('');
    }
  }

  async function reviewMerchant(userId: string, status: 'active' | 'rejected' | 'suspended') {
    const reason = status !== 'active' ? (window.prompt('Informe o motivo:')?.trim() ?? '') : '';
    if (status !== 'active' && reason.length < 4) {
      setError('Informe um motivo com pelo menos 4 caracteres.');
      return;
    }
    if (status === 'active' && !window.confirm('Aprovar este lojista e liberar o acesso à plataforma?')) return;
    setBusyId(userId);
    setError('');
    try {
      const response = await fetch('/api/admin/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status, reason }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível atualizar o lojista.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar o lojista.');
    } finally {
      setBusyId('');
    }
  }

  const table = (title: string, rows: Row[], columns: [string, string, (row: Row) => string][]) => (
    <section className="panel section-panel admin-section">
      <h2>{title} <span className="admin-count">{rows.length}</span></h2>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={String(row.id ?? row.user_id ?? index)}>
                  {columns.map(([label, key, render]) => (
                    <td key={label}>{render(row) || String(row[key] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">Nenhum registro encontrado.</p>
      )}
    </section>
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Image src="/logo.svg" alt="Vello" width={120} height={32} className="brand-logo header" style={{ height: 32, width: 'auto' }} priority unoptimized />
          <span>Vello <b>Administração</b></span>
        </div>
        <Link href="/" className="secondary-button compact" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Voltar ao painel
        </Link>
      </header>
      <section className="content admin-content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Acesso restrito</p>
            <h1>Painel administrativo</h1>
            <p className="muted">Aprove contas de lojistas e gerencie saques. Dados limitados aos primeiros 100 registros.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>Atualizar</button>
        </div>
        {error && <p className="alert error" role="alert">{error}</p>}
        {loading && !data ? (
          <section className="panel section-panel">Verificando permissões e carregando dados…</section>
        ) : data ? (
          <>
            <section className="panel section-panel admin-section">
              <h2>Aprovação de lojistas <span className="admin-count">{(data.merchants ?? []).filter((m) => String(m.status) === 'pending').length}</span></h2>
              <p className="muted" style={{ marginBottom: 12 }}>Contas com status pending ficam bloqueadas até a aprovação.</p>
              {(data.merchants ?? []).length ? (
                <div className="data-list">
                  {(data.merchants ?? []).map((m) => (
                    <div className="data-row" key={String(m.user_id)}>
                      <div>
                        <b>{String(m.business_name || m.full_name || m.user_id)}</b>
                        <p>{String(m.full_name || '—')} · {date(m.created_at)}</p>
                        <span className="status-tag">{String(m.status || 'pending')}</span>
                      </div>
                      <div className="admin-actions">
                        {String(m.status) !== 'active' && (
                          <button type="button" className="primary-button compact" disabled={busyId === String(m.user_id)} onClick={() => void reviewMerchant(String(m.user_id), 'active')}>
                            {busyId === String(m.user_id) ? '…' : 'Aprovar'}
                          </button>
                        )}
                        {String(m.status) !== 'rejected' && (
                          <button type="button" className="secondary-button compact" disabled={busyId === String(m.user_id)} onClick={() => void reviewMerchant(String(m.user_id), 'rejected')}>
                            Recusar
                          </button>
                        )}
                        {String(m.status) === 'active' && (
                          <button type="button" className="secondary-button compact" disabled={busyId === String(m.user_id)} onClick={() => void reviewMerchant(String(m.user_id), 'suspended')}>
                            Suspender
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Nenhum lojista cadastrado.</p>
              )}
            </section>
            {table('Links de parcelamento', data.links, [
              ['Descrição', 'description', (r) => String(r.description || '—')],
              ['Valor', 'total_amount', (r) => money(r.total_amount)],
              ['Parcelas', 'installment_count', (r) => String(r.installment_count ?? '—')],
              ['Status', 'status', (r) => String(r.status || '—')],
              ['Criado em', 'created_at', (r) => date(r.created_at)],
            ])}
            {table('Pagamentos', data.payments, [
              ['ID', 'id', (r) => String(r.id ?? '—')],
              ['Lojista', 'merchant_id', (r) => String(r.merchant_id ?? '—')],
              ['Valor', 'amount', (r) => money(r.amount)],
              ['Status', 'status', (r) => String(r.status || '—')],
              ['Pago em', 'paid_at', (r) => date(r.paid_at)],
            ])}
            <section className="panel section-panel admin-section">
              <h2>Solicitações de saque</h2>
              {data.withdrawals.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Lojista</th><th>Valor</th><th>Status</th><th>Solicitado</th><th>Revisado</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                      {data.withdrawals.map((row) => (
                        <tr key={String(row.id)}>
                          <td>{String(row.merchant_id)}</td>
                          <td>{money(row.amount)}</td>
                          <td>{String(row.status)}</td>
                          <td>{date(row.created_at)}</td>
                          <td>{date(row.reviewed_at)}</td>
                          <td>
                            {row.status === 'pending' ? (
                              <div className="admin-actions">
                                <button type="button" className="primary-button compact" disabled={busyId === row.id} onClick={() => void review(String(row.id), 'approve')}>Aprovar</button>
                                <button type="button" className="secondary-button compact" disabled={busyId === row.id} onClick={() => void review(String(row.id), 'reject')}>Rejeitar</button>
                              </div>
                            ) : (
                              String(row.rejection_reason || '—')
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="empty-state">Nenhuma solicitação de saque.</p>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
