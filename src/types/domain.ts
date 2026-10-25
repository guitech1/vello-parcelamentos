/** Domain models for Vello Parcelamentos — ready for database mapping */

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
  id?: string;
  number: number;
  valueCents: number;
  dueDate: string;
  paidAt: string | null;
  status: InstallmentStatus;
  externalPaymentId?: string | null;
}

export interface Sale {
  id: string;
  ownerId: string;
  storeName: string;
  buyer: Buyer;
  totalCents: number;
  installmentCount: number;
  summary: string;
  status: SaleStatus;
  installments: Installment[];
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  storeName: string;
  email: string;
  phone: string;
  tiktok?: string;
  status: UserStatus;
  balanceCents: number;
  releaseCents: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Withdrawal {
  id: string;
  ownerId: string;
  storeName: string;
  amountCents: number;
  keyType: PixKeyType;
  key: string;
  holder: string;
  status: WithdrawalStatus;
  createdAt: string;
  processedAt?: string | null;
}

export interface CreateSaleInput {
  totalCents: number;
  installmentCount: number;
  buyer: Buyer;
  summary: string;
}

export interface CreateWithdrawalInput {
  amountCents: number;
  keyType: PixKeyType;
  key: string;
  holder: string;
}
