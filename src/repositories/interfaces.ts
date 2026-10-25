/**
 * Repository contracts.
 * Implementations:
 *  - DemoRepository (local / in-memory) for development
 *  - DatabaseRepository (future) — will use the real DB connection
 */

import type {
  User,
  Sale,
  Withdrawal,
  CreateSaleInput,
  CreateWithdrawalInput,
} from '../types/domain';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(filters?: { status?: string; search?: string }): Promise<User[]>;
  update(id: string, data: Partial<User>): Promise<User>;
}

export interface SaleRepository {
  create(ownerId: string, input: CreateSaleInput): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  listByOwner(ownerId: string, filters?: { status?: string; search?: string }): Promise<Sale[]>;
  listAll(filters?: { status?: string; search?: string }): Promise<Sale[]>;
  markInstallmentPaid(saleId: string, installmentNumber: number, paidAt: string, externalPaymentId?: string): Promise<Sale>;
}

export interface WithdrawalRepository {
  create(ownerId: string, input: CreateWithdrawalInput): Promise<Withdrawal>;
  listByOwner(ownerId: string): Promise<Withdrawal[]>;
  listPending(): Promise<Withdrawal[]>;
  approve(id: string): Promise<Withdrawal>;
  reject(id: string): Promise<Withdrawal>;
}

export interface UnitOfWork {
  users: UserRepository;
  sales: SaleRepository;
  withdrawals: WithdrawalRepository;
}
