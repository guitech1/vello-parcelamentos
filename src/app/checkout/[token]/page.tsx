'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type CheckoutInfo = { description: string; totalAmount: string | number; installmentCount: number };
export default function CheckoutPage() {
  const params = useParams<{ token: string }>();
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = encodeURIComponent(params.token);
    fetch('/api/checkout/' + token, { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Este link está indisponível.');
        setInfo(body as CheckoutInfo);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Não foi possível abrir o checkout.'))
      .finally(() => setLoading(false));
  }, [params.token]);

  const amount = info ? Number(info.totalAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
  return <main className="auth-screen"><section className="auth-card">
    <div className="brand-mark">V</div><p className="eyebrow">VELLO PARCELAMENTOS</p>
    {loading ? <><h1>Consultando cobrança</h1><p className="muted">Validando o link com o servidor.</p></> :
      error ? <><h1>Checkout indisponível</h1><p className="alert error" role="alert">{error}</p></> :
      info ? <><h1>{info.description}</h1><p className="muted">Resumo da cobrança</p><div className="stat-card"><p>Valor total</p><strong>{amount}</strong><span>Parcelamento em até {info.installmentCount}x</span></div><p className="alert success">Este link foi consultado no servidor. A geração de Pix ainda não está habilitada até a integração autenticada com o provedor.</p></> : null}
    <p className="small-note">Não envie dados de pagamento em resposta a mensagens. A Vello não confirma pagamentos nesta página.</p>
  </section></main>;
}
