export type BankAccountStatus = "Active" | "Inactive";
export type BankCardType = "debit" | "credit";

export interface BankAccountItem {
  bankId: number;
  bankName: string;
  bankAccountName: string;
  accountNo: string;
  branchName?: string;
  currentBalance: number;
  openingBalance?: number;
  status: BankAccountStatus | string;
  hasCard?: boolean;
  cardType?: string | null;
  cardNumber?: string | null;
  balanceDate?: string;
  transactionDate?: string;
  bankLogo?: string;
}

export interface BankNameItem {
  id?: number;
  bankName: string;
  bankShortCode?: string;
  bankType?: string;
  headquarters?: string;
  founded?: string;
  founder?: string;
  website?: string;
}

export interface BankInfoListResponse {
  status: string;
  msg: string;
  bankAccounts: BankAccountItem[];
}

export interface BankNameListResponse {
  status: string;
  msg: string;
  bankNameList: BankNameItem[];
}

export interface InsertBankAccountPayload {
  bankAccountName: string;
  bankName: string;
  accountNo: string;
  openingBalance: number;
  balanceDate: string;
  hasCard: boolean;
  cardType?: string | null;
  cardNumber?: string | null;
  status: BankAccountStatus | string;
  transactionDate: string;
}

export interface UpdateBankAccountPayload extends InsertBankAccountPayload {
  bankId: number;
}

export interface BankAccountActionResponse {
  status: string;
  msg: string;
  bankId?: number;
  accountNo?: string | null;
}
