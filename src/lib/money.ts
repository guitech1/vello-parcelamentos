/** Operações monetárias em centavos inteiros. */

export function centsToDecimal(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Valor monetário inválido.');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function formatBRL(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error('Valor monetário inválido.');
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Lê valor em formato brasileiro ou decimal com ponto sem calcular centavos em ponto flutuante. */
export function parseBRLCents(input: string): number | null {
  const value = input.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!value) return null;

  let whole = '';
  let fraction = '';
  if (value.includes(',')) {
    if (!/^\d{1,3}(?:\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(value)) return null;
    const parts = value.split(',');
    whole = parts[0].replace(/\./g, '');
    fraction = parts[1];
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) {
    whole = value.replace(/\./g, '');
  } else if (/^\d+(?:\.\d{1,2})?$/.test(value)) {
    const parts = value.split('.');
    whole = parts[0];
    fraction = parts[1] ?? '';
  } else if (/^\d+$/.test(value)) {
    whole = value;
  } else {
    return null;
  }

  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(cents);
}

/** Divide o total em n parcelas iguais, ajustando os centavos restantes na última. */
export function splitInstallments(totalCents: number, n: number): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error('O valor total deve ser um inteiro positivo em centavos.');
  }
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    throw new Error('A quantidade de parcelas deve estar entre 1 e 10.');
  }
  if (totalCents < n) {
    throw new Error('O valor é insuficiente para gerar parcelas positivas em centavos.');
  }
  const base = Math.floor(totalCents / n);
  return Array.from({ length: n }, (_, i) =>
    i < n - 1 ? base : totalCents - base * (n - 1)
  );
}

export function onlyDigits(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/\D/g, '');
}
