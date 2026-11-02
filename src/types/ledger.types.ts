export type LedgerPersonType = "CUSTOMER" | "SUPPLIER" | "OTHER";
export type LedgerPersonStatus = "Active" | "Inactive";
export type LedgerTransactionType =
  | "PABO"
  | "DIBO"
  | "Opening Balance PABO"
  | "Opening Balance DIBO"
  | string;
export type LedgerPaymentType = "CASH" | "BANK" | "MFS" | "";

export interface LedgerPerson {
  id: number;
  name: string;
  phone: string;
  address?: string | null;
  email?: string | null;
  type: LedgerPersonType | string;
  tag?: string | null;
  isSync?: number;
  addedBy?: string;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastSyncedAt?: string | null;
  status: LedgerPersonStatus | string;
  // Computed aggregations
  totalPabo?: number;
  totalDibo?: number;
  netBalance?: number;
  transactionCount?: number;
  lastTransactionDate?: string | null;
}

export interface SaveLedgerPersonPayload {
  id?: number;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  type: LedgerPersonType | string;
  tag?: string;
  status?: LedgerPersonStatus | string;
  openingDena?: number;
  openingPona?: number;
  openingDate?: string;
}

export interface LedgerTransaction {
  id: number;
  personId: number;
  personName?: string;
  transactionType: LedgerTransactionType;
  paymentType: LedgerPaymentType | string;
  amount: number;
  bankAccountNo?: string | null;
  mfsUserId?: string | number | null;
  note?: string | null;
  refNo?: string;
  commission?: number | null;
  addedBy?: string;
  createdAt?: string;
  createdDate?: string;
  transactionDate?: string;
  runningBalance?: number;
}

export interface CreateLedgerTransactionPayload {
  personId: number;
  transactionType: "PABO" | "DIBO";
  paymentType: "CASH" | "BANK" | "MFS";
  amount: number;
  note?: string;
  refNo?: string;
  bankAccountNo?: string | null;
  mfsUserId?: string | number | null;
  createdDate?: string;
  transactionDate?: string;
}

export interface UpdateLedgerTransactionPayload {
  transactionId: number;
  personId: number;
  transactionType: "PABO" | "DIBO";
  paymentType: "CASH" | "BANK" | "MFS";
  amount: number;
  note?: string;
  refNo?: string;
  bankAccountNo?: string | null;
  mfsUserId?: string | number | null;
  createdDate?: string;
  transactionDate?: string;
}

export interface LedgerPersonListResponse {
  status: string;
  msg: string;
  data: LedgerPerson[];
}

export interface LedgerTransactionListResponse {
  status: string;
  msg: string;
  data: LedgerTransaction[];
}

export interface LedgerActionResponse {
  status: string;
  msg: string;
  data?: any;
  orderNo?: any;
  updatedStock?: any;
}

export interface LedgerKpiMetrics {
  totalPersons: number;
  totalPabo: number;
  totalDibo: number;
  netBalance: number;
  totalTransactions: number;
}
