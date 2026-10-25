import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F7F9F7] flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="inline-flex items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-[#22C55E] text-[#052E14] font-extrabold grid place-items-center text-lg">
            V
          </span>
          <span className="text-2xl font-bold tracking-tight text-[#111713]">
            Vello Parcelamentos
          </span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-[#111713]">
          Parcelamento no Pix, com cada parcela sob controle.
        </h1>

        <p className="text-[#66716A] leading-relaxed">
          Demonstração completa do frontend. Todos os dados são fictícios.
          Nenhum pagamento real é processado.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <a
            href="/index.html"
            className="inline-flex items-center justify-center min-h-[42px] px-6 rounded-[10px] bg-[#22C55E] text-[#052E14] font-semibold hover:bg-[#1DB655] transition"
          >
            Abrir demonstração
          </a>
          <Link
            href="https://github.com/guitech1/vello-parcelamentos"
            className="inline-flex items-center justify-center min-h-[42px] px-6 rounded-[10px] border border-[#E5EAE6] bg-white text-[#111713] font-semibold hover:bg-[#DCFCE7] transition"
          >
            Ver repositório
          </Link>
        </div>

        <p className="text-sm text-[#66716A] pt-4">
          Área do lojista · Checkout público · Painel administrativo
        </p>
      </div>
    </main>
  );
}
