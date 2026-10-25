'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type CheckoutInfo = { description: string; totalAmount: string | number; installmentCount: number; firstInstallmentAmount: string | number };
type PixInfo = { pixCopyPaste: string; qrCodeBase64: string | null; expiresAt: string | null };

export default function CheckoutPage() {
  const params = useParams<{ token: string }>();
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [pix, setPix] = useState<PixInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch('/api/checkout/' + encodeURIComponent(params.token), { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Este link está indisponível.');
        setInfo(body as CheckoutInfo);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Não foi possível abrir o checkout.'))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function createPix() {
    setPaying(true);
    setError('');
    try {
      const response = await fetch('/api/checkout/' + encodeURIComponent(params.token) + '/payment', { method: 'POST', cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível preparar o Pix.');
      setPix(body as PixInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível preparar o Pix.');
    } finally {
      setPaying(false);
    }
  }

  const amount = info ? Number(info.totalAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
  return <main className="auth-screen"><section className="auth-card">
    <div className="brand-mark">V</div><p className="eyebrow">VELLO PARCELAMENTOS</p>
    {loading ? <><h1>Consultando cobrança</h1><p className="muted">Validando o link com o servidor.</p></> :
      error && !info ? <><h1>Checkout indisponível</h1><p className="alert error" role="alert">{error}</p></> :
      info ? <><h1>{info.description}</h1><p className="muted">Resumo da cobrança</p><div className="stat-card"><p>Valor total</p><strong>{amount}</strong><span>Parcelamento em até {info.installmentCount}x</span></div><div className="stat-card installment-highlight"><p>Valor da primeira parcela</p><strong>{Number(info.firstInstallmentAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div>
        {error && <p className="alert error" role="alert">{error}</p>}
        {pix ? <div className="pix-panel"><h2>Pix gerado pelo provedor</h2>{pix.qrCodeBase64 && <img className="qr-code" src={pix.qrCodeBase64} alt="QR Code Pix" /> }<label className="pix-label">Código Pix copia e cola<textarea readOnly value={pix.pixCopyPaste} /></label><button className="secondary-button" onClick={() => { void navigator.clipboard.writeText(pix.pixCopyPaste).catch(() => setError('Não foi possível copiar automaticamente. Selecione e copie o código.')); }}>Copiar código Pix</button>{pix.expiresAt && <p className="small-note">Expira em: {new Date(pix.expiresAt).toLocaleString('pt-BR')}</p>}</div> : <><p className="small-note">A cobrança só será criada se as credenciais do provedor estiverem configuradas no servidor.</p><button className="primary-button" onClick={() => void createPix()} disabled={paying}>{paying ? 'Preparando Pix...' : 'Gerar Pix da primeira parcela'}</button></>}
      </> : null}
    <p className="small-note">A Vello só considera um pagamento confirmado após receber e validar a confirmação autenticada do provedor.</p>
  </section></main>;
}
