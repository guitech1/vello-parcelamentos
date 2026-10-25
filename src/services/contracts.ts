/**
 * Application service contracts.
 * Frontend and future API routes must depend only on these interfaces.
 * Never call repositories directly from UI components.
 */

import type {
  User,
  Sale,
  Withdrawal,
  CreateSaleInput,
  CreateWithdrawalInput,
} from '../types/domain';

export interface AuthService {
  login(email: string, password: string): Promise<{ user: User; token: string }>;
  register(data: {
    name: string;
    email: string;
    phone: string;
    storeName: string;
    password: string;
    tiktok?: string;
  }): Promise<{ user: User; token: string }>;
  logout(): Promise<void>;
  getSession(): Promise<User | null>;
}

export interface MerchantService {
  getDashboard(userId: string): Promise<{
    availableCents: number;
    releaseCents: number;
    processingCents: number;
    receivedCents: number;
    salesCount: number;
    pendingInstallments: number;
    futureCents: number;
  }>;
  createSale(userId: string, input: CreateSaleInput): Promise<Sale>;
  listSales(userId: string, filters?: { status?: string; search?: string }): Promise<Sale[]>;
  getSale(userId: string, saleId: string): Promise<Sale | null>;
  requestWithdrawal(userId: string, input: CreateWithdrawalInput): Promise<Withdrawal>;
  listWithdrawals(userId: string): Promise<Withdrawal[]>;
  updateProfile(userId: string, data: Partial<User>): Promise<User>;
}

export interface AdminService {
  getDashboard(): Promise<{
    usersCount: number;
    pendingPayments: number;
    confirmedPayments: number;
    totalVolumeCents: number;
    pendingWithdrawalsCount: number;
    pendingWithdrawalsCents: number;
  }>;
  listUsers(filters?: { status?: string; search?: string }): Promise<User[]>;
  listSales(filters?: { status?: string; search?: string }): Promise<Sale[]>;
  listPendingWithdrawals(): Promise<Withdrawal[]>;
  approveWithdrawal(id: string): Promise<Withdrawal>;
  rejectWithdrawal(id: string): Promise<Withdrawal>;
  setMaintenanceMode(enabled: boolean): Promise<void>;
  getMaintenanceMode(): Promise<boolean>;
}

export interface PaymentGatewayService {
  createPixCharge(params: {
    amountCents: number;
    externalId: string;
    description?: string;
  }): Promise<{
    id: string;
    qrCode?: string;
    copyPaste?: string;
    expiresAt?: string;
  }>;
  getChargeStatus(id: string): Promise<{
    status: 'pending' | 'paid' | 'expired' | 'cancelled';
    paidAt?: string;
  }>;
}
