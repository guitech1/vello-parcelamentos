/** Tipos centrais da Vello Parcelamentos */

export type SaleStatus = 'Aguardando' | 'Ativa' | 'Quitada' | 'Expirada';
export type InstallmentStatus = 'Paga' | 'Pendente' | 'Vencida';
export type WithdrawalStatus = 'Aguardando aprovação' | 'Concluído' | 'Rejeitado';
export type UserStatus = 'Ativo' | 'Pendente' | 'Suspenso';
export type PixKeyType = 'CPF' | 'CNPJ' | 'E-mail' | 'Telefone' | 'Chave aleatória';

export interface Buyer {
  name: string;
  cpf: string;
  phone: string;
}

export interface Installment {
  n: number;
  value: number; // centavos
  due: string;   // ISO
  paidAt: string | null;
}

export interface Sale {
  id: string;
  owner: string;
  store: string;
  buyer: Buyer;
  total: number; // centavos
  n: number;
  created: string;
  summary: string;
  status: SaleStatus;
  inst: Installment[];
}

export interface User {
  id: string;
  name: string;
  store: string;
  email: string;
  phone: string;
  tiktok: string;
  reg: string;
  status: UserStatus;
  bal: number;   // centavos disponíveis
  rel: number;   // centavos a liberar
}

export interface Withdrawal {
  id: string;
  owner: string;
  store: string;
  name: string;
  amount: number; // centavos
  keyType: PixKeyType;
  key: string;
  holder: string;
  date: string;
  status: WithdrawalStatus;
}

export interface MerchantDashboard {
  avail: number;
  rel: number;
  proc: number;
  received: number;
  sales: number;
  pend: number;
  future: number;
  months: { l: string; m: number; y: number; v: number }[];
  recent: Array<{ s: Sale; n: number; value: number; paidAt: string }>;
  next: Array<{ s: Sale; n: number; value: number; due: string }>;
}

export interface CreateSaleInput {
  total: number;
  n: number;
  buyer: Buyer;
  summary: string;
}

export interface WithdrawalRequest {
  amount: number;
  keyType: PixKeyType;
  key: string;
  holder: string;
}
