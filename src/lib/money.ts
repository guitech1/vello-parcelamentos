/** Formatação e cálculo monetário (centavos) */

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Divide o total em n parcelas iguais, ajustando a última para bater o total. */
export function splitInstallments(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n);
  return Array.from({ length: n }, (_, i) =>
    i < n - 1 ? base : totalCents - base * (n - 1)
  );
}

export function onlyDigits(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}
