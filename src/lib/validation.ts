import { onlyDigits } from './money';

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

export function isValidCpf(v: string): boolean {
  const d = onlyDigits(v);
  return d.length === 11 && !/^(\d)\1+$/.test(d);
}

export function isValidPhone(v: string): boolean {
  const len = onlyDigits(v).length;
  return len === 10 || len === 11;
}

export function maskCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length > 6) {
    const mid = d.length > 10 ? 7 : 6;
    return `(${d.slice(0, 2)}) ${d.slice(2, mid)}-${d.slice(mid)}`;
  }
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d;
}
