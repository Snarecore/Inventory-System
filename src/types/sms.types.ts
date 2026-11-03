export interface SmsBundleItem {
  id: number;
  bundleCode: string;
  name: string;
  nameBn?: string | null;
  smsCount: number;
  price: number;
  pricePerSms: number;
  validityMonths: number;
  validityLabel: string;
  popular?: boolean;
  displayOrder?: number;
  remarks?: string | null;
}

export interface SmsBundlePurchasePayload {
  bundleId: number;
  userId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  businessCode: string;
  requestAgent: string;
}

export interface SmsBundlePurchaseResponse {
  purchaseId?: number;
  customerOrderId?: string;
  bundleId?: number;
  bundleName?: string;
  smsCount?: number;
  amount?: number;
  validityMonths?: number;
  status?: string;
  epsTransactionId?: string;
  merchantTransactionId?: string;
  redirectUrl?: string;
  errorCode?: string | null;
  errorMessage?: string;
}

export interface SendSmsPayload {
  accessUser?: {
    phone: string;
    orgId: number | string;
    branchId: number | string;
  };
  type?: string;
  phoneNumber: string;
  msg: string;
}

export interface SmsBalanceData {
  smsPurchase: number;
  smsConsumed: number;
  smsBalance: number;
}

export interface SmsSendBackendData {
  phoneNumber: string;
  characterCount: number;
  segmentCount: number;
  encoding: "GSM7" | "UNICODE" | string;
  previousSmsBalance: number;
  currentSmsBalance: number;
  status: string;
}

export interface SmsHistoryItem {
  id: string;
  recipientName: string;
  recipientPhone: string;
  recipientType: "Customer" | "Supplier" | "Direct" | "Any";
  message: string;
  partsCount: number;
  creditsUsed: number;
  sentAt: string;
  status: "Delivered" | "Sent" | "Failed";
}
