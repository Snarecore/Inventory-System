export interface ReferrerInfo {
  userId: number;
  name?: string;
  phoneNumber?: string;
  referralCode?: string;
  tier?: string;
  tierLabel?: string;
  firstSalePct?: number;
  renewalPct?: number;
  codeClaimedAt?: string;
  memberSince?: string;
}

export interface ReferralRegistrations {
  total: number;
  active: number;
  underReview: number;
  blocked: number;
  purchased: number;
  notPurchased: number;
}

export interface PurchaseSequenceItem {
  sequence: number;
  label: string;
  purchaseCount: number;
  purchaseAmountPoisha: number;
  commissionPoisha: number;
}

export interface ReferralPurchases {
  totalCount: number;
  totalAmountPoisha: number;
  firstSaleCount: number;
  renewalCount: number;
  bySequence: PurchaseSequenceItem[];
}

export interface ReferralCommission {
  totalEarnedPoisha: number;
  firstSalePoisha: number;
  renewalPoisha: number;
  reversedPoisha: number;
  thisMonthPoisha: number;
}

export interface ReferralWithdrawalsSummary {
  paidPoisha: number;
  paidCount: number;
  pendingPoisha: number;
  pendingCount: number;
  rejectedCount: number;
}

export interface ReferralPackagePurchases {
  spentPoisha: number;
  count: number;
}

export interface ReferralWalletSummary {
  heldPoisha: number;
  availablePoisha: number;
}

export interface ReferralShare {
  referralCode: string;
  referralLink: string;
}

export interface ReferralTierLadderItem {
  tier: string;
  label: string;
  labelBn: string;
  hoursBn?: string;
  firstSalePct: number;
  renewalPct: number;
  minSales: number;
}

export interface ReferralTierStanding {
  tier: string;
  tierLabel: string;
  tierLabelBn?: string;
  firstSalePct: number;
  renewalPct: number;
  salesThisMonth: number;
  locked: boolean;
  progressPct: number;
  nextTier?: string;
  nextTierLabelBn?: string;
  nextRenewalPct?: number;
  salesToNextTier?: number;
  ladder: ReferralTierLadderItem[];
}

export interface ReferralMonthToDate {
  firstSaleCount: number;
  firstSalePoisha: number;
  renewalCount: number;
  renewalPoisha: number;
  totalCount: number;
  totalPoisha: number;
}

export interface PayoutAccount {
  method?: "BKASH" | "NAGAD" | string;
  accountNumberMasked?: string;
  accountName?: string | null;
  verified?: boolean;
  updatedAt?: string;
}

export interface ReferralConfig {
  holdDays: number;
  minWithdrawalPoisha: number;
  minPaymentPoisha: number;
  withdrawalsEnabled: boolean;
  heldSpendable: boolean;
  payoutMethods: string[];
  tiers: ReferralTierLadderItem[];
}

export interface ReferralSummary {
  referrer?: ReferrerInfo;
  registrations?: ReferralRegistrations;
  purchases?: ReferralPurchases;
  commission?: ReferralCommission;
  withdrawals?: ReferralWithdrawalsSummary;
  packagePurchases?: ReferralPackagePurchases;
  wallet?: ReferralWalletSummary;
  share?: ReferralShare;
  tierStanding?: ReferralTierStanding;
  monthToDate?: ReferralMonthToDate;
  payoutAccount?: PayoutAccount | null;
  config?: ReferralConfig;
}

export interface ReferralMe {
  userId: number;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  tier?: string;
  firstSalePct?: number;
  renewalPct?: number;
  salesThisMonth?: number;
  salesToNextTier?: number;
  referralLink?: string;
  heldPoisha?: number;
  availablePoisha?: number;
  spendablePoisha?: number;
  withdrawablePoisha?: number;
}

export interface WalletBalance {
  heldPoisha: number;
  availablePoisha: number;
  spendablePoisha: number;
  withdrawablePoisha: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface EarningItem {
  id: number | string;
  referredUserId?: number | string;
  referredUserName?: string;
  type?: "FIRST_SALE" | "RENEWAL" | string;
  status?: "AVAILABLE" | "HELD" | "REVERSED" | "PAID" | string;
  amountPoisha: number;
  ratePct?: number;
  holdUntil?: string;
  createdAt?: string;
  orderId?: string | number;
}

export interface WalletTransactionItem {
  id: number | string;
  type?: "CREDIT" | "DEBIT" | "WITHDRAWAL" | "COMMISSION" | "PACKAGE_PAYMENT" | string;
  direction?: "IN" | "OUT" | string;
  amountPoisha: number;
  balanceAfterPoisha?: number;
  description?: string;
  referenceId?: string;
  createdAt?: string;
}

export interface WithdrawalItem {
  id: number | string;
  amountPoisha: number;
  feePoisha?: number;
  netAmountPoisha?: number;
  payoutMethod?: "BKASH" | "NAGAD" | string;
  accountNumberMasked?: string;
  status?: "PENDING" | "PAID" | "REJECTED" | string;
  rejectionReason?: string;
  requestedAt?: string;
  processedAt?: string;
}

export interface GenerateCodePayload {
  userId: number;
}

export interface GenerateCodeResponse {
  userId: number;
  referralCode: string;
}

export interface AttributePayload {
  userId: number;
  referralCode: string;
}

export interface SavePayoutAccountPayload {
  userId: number;
  method: "BKASH" | "NAGAD" | string;
  accountNumber: string;
  accountName?: string;
}

export interface RequestWithdrawalPayload {
  userId: number;
  amountPoisha: number;
  idempotencyKey?: string;
}

export interface CheckoutDebitPayload {
  userId: number;
  amountPoisha: number;
}
