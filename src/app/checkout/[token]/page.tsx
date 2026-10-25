'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

type CheckoutInfo = {
  description: string;
  totalAmount: string | number;
  installmentCount: number;
  firstInstallmentAmount: string | number;
};

type PixInfo = {
  pixCopyPaste: string;
  qrCodeBase64: string | null;
  expiresAt: string | null;
};

const money = (value: number | string) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CheckoutPage() {
  const params = useParams<{ token: string }>();
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [pix, setPix] = useState<PixInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/checkout/' + encodeURIComponent(params.token), { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Este link está indisponível.');
        if (!cancelled) setInfo(body as CheckoutInfo);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Não foi possível abrir o checkout.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [params.token]);

  const createPix = useCallback(async () => {
    setPaying(true);
    setError('');
    try {
      const response = await fetch('/api/checkout/' + encodeURIComponent(params.token) + '/payment', {
        method: 'POST',
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível preparar o Pix.');
      setPix(body as PixInfo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível preparar o Pix.');
    } finally {
      setPaying(false);
    }
  }, [params.token]);

  async function copyPix() {
    if (!pix?.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(pix.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Não foi possível copiar automaticamente. Selecione e copie o código.');
    }
  }

  return (
    <main className="checkout-shell">
      <section className="checkout-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Image src="/logo.png" alt="Vello" width={160} height={48} className="brand-logo large" style={{ height: 48, width: 'auto' }} priority />
        </div>
        <p className="eyebrow" style={{ textAlign: 'center' }}>Pagamento seguro</p>

        {loading && (
          <>
            <h1 style={{ textAlign: 'center' }}>Consultando cobrança</h1>
            <p className="muted" style={{ textAlign: 'center' }}>Validando o link com o servidor…</p>
            <div className="skeleton" style={{ height: 120, marginTop: 16 }} />
          </>
        )}

        {!loading && error && !info && (
          <>
            <h1 style={{ textAlign: 'center' }}>Checkout indisponível</h1>
            <p className="alert error" role="alert">{error}</p>
          </>
        )}

        {!loading && info && (
          <>
            <h1 style={{ textAlign: 'center', fontSize: '1.35rem' }}>{info.description}</h1>
            <p className="muted" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Resumo da cobrança</p>

            <div className="checkout-amount">
              <div className="label">Valor total</div>
              <div className="value">{money(info.totalAmount)}</div>
              <div className="sub">Parcelamento em até {info.installmentCount}x</div>
            </div>

            <div className="stat-card installment-highlight" style={{ marginBottom: 12 }}>
              <p>Valor da 1ª parcela a pagar agora</p>
              <strong>{money(info.firstInstallmentAmount)}</strong>
              <span>Demais parcelas conforme acordo com o lojista</span>
            </div>

            {error && <p className="alert error" role="alert">{error}</p>}

            {pix ? (
              <div className="pix-panel">
                <h2>Pix gerado</h2>
                <p className="small-note" style={{ marginTop: 0, marginBottom: 12 }}>
                  Escaneie o QR Code ou copie o código. O pagamento só é confirmado após validação do provedor.
                </p>
                {pix.qrCodeBase64 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="qr-code"
                    src={pix.qrCodeBase64.startsWith('data:') ? pix.qrCodeBase64 : `data:image/png;base64,${pix.qrCodeBase64}`}
                    alt="QR Code Pix"
                  />
                )}
                <label className="pix-label">
                  Código Pix copia e cola
                  <textarea readOnly value={pix.pixCopyPaste} rows={4} />
                </label>
                <button type="button" className="primary-button" style={{ width: '100%', marginTop: 12 }} onClick={() => void copyPix()}>
                  {copied ? 'Código copiado!' : 'Copiar código Pix'}
                </button>
                {pix.expiresAt && (
                  <p className="small-note">Expira em: {new Date(pix.expiresAt).toLocaleString('pt-BR')}</p>
                )}
              </div>
            ) : (
              <>
                <p className="small-note" style={{ marginBottom: 16 }}>
                  A cobrança só será criada no provedor quando as credenciais estiverem configuradas no servidor. Nenhum pagamento é marcado como pago apenas por abrir esta tela.
                </p>
                <button type="button" className="primary-button" style={{ width: '100%' }} onClick={() => void createPix()} disabled={paying}>
                  {paying ? 'Preparando Pix…' : 'Gerar Pix da 1ª parcela'}
                </button>
              </>
            )}
          </>
        )}

        <p className="small-note" style={{ textAlign: 'center' }}>
          A Vello só considera um pagamento confirmado após receber e validar a confirmação autenticada do provedor.
        </p>
      </section>
    </main>
  );
}
