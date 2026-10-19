/**
 * Enterprise standard TypeScript definitions for Supplier Payment & Due Management
 */

export interface SupplierDueItem {
  id?: string | number;
  supplierId?: string | number;
  supplierName?: string;
  supplierPhone?: string;
  supplierAddress?: string;
  totalDue?: number;
  total_due?: number;
  dueAmount?: number;
  due_amount?: number;
  invoiceCount?: number;
  invoicesCount?: number;
  lastPurchaseDate?: string;
  [key: string]: any;
}

export interface PurchaseInvoiceDueItem {
  id?: string | number;
  invoiceNo: string;
  purchaseNo?: string;
  orderNo?: string;
  purchaseDate?: string;
  salesDate?: string;
  saleDate?: string;
  date?: string;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount: number;
  paymentType?: string;
  status?: string;
  [key: string]: any;
}

export interface PaymentDetailPayload {
  invoiceNo: string;
  paidAmount: number;
  dueAmount: number;
  discountAmount?: number;
  discount?: number;
  businessCode?: string;
  [key: string]: any;
}

export interface PaymentBankDetails {
  bankId: string | number;
  bankName: string;
  accountNumber: string;
  accountHolderName?: string;
}

export interface PaymentMfsDetails {
  mfsId?: string | number;
  method?: string;
  phoneNumber?: string;
  name?: string;
  mfsName?: string;
  mfsPhone?: string;
}

export interface PaymentDataPayload {
  customerPhone: string; // The Java DTO uses customerPhone even for suppliers
  customerName: string;  // The Java DTO uses customerName even for suppliers
  paymentDate: string;
  totalAmount: number;
  totalDiscount?: number;
  paymentMode: "Cash" | "Bank" | "MFS" | "CASH" | "BANK" | string;
  remark?: string;
  osType: "WEB";
  paymentDetails: PaymentDetailPayload[];
  bankDetails?: PaymentBankDetails | null;
  mfsDetails?: PaymentMfsDetails | null;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
  [key: string]: any;
}

export interface PaymentRequestPayload {
  accessUser: Record<string, any>;
  paymentData: PaymentDataPayload;
}

export interface PaymentAllocation {
  invoiceNo: string;
  originalDue: number;
  allocatedAmount: number;
  allocatedPaid?: number;
  allocatedDiscount?: number;
  remainingDue: number;
  paidAmount?: number;
  discountAmount?: number;
  dueAmount?: number;
}

export interface PaymentAllocationResult {
  allocations: PaymentAllocation[];
  allocatedTotal: number;
  remainingTotalDue: number;
}

export interface PaymentReportDetailItem {
  invoiceNo: string;
  paidAmount: number;
  dueAmount: number;
  [key: string]: any;
}

export interface PaymentReportItem {
  id?: string | number;
  paymentNo?: string;
  voucherNo?: string;
  supplierId?: string | number;
  customerId?: string | number;
  supplierName?: string;
  customerName?: string;
  supplierPhone?: string;
  customerPhone?: string;
  paymentDate?: string;
  collectionDate?: string;
  totalAmount?: number;
  totalDiscount?: number;
  paymentMode?: string;
  remark?: string;
  details?: PaymentReportDetailItem[];
  paymentDetails?: PaymentReportDetailItem[];
  [key: string]: any;
}

export interface PaymentReceiptData {
  receiptNo: string;
  paymentDate: string;
  supplierName: string;
  supplierPhone: string;
  supplierId?: string | number;
  totalAmount: number;
  totalDiscount?: number;
  paymentMode: string;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  } | null;
  mfsDetails?: {
    mfsName?: string;
    mfsPhone?: string;
  } | null;
  remark?: string;
  allocations: {
    invoiceNo: string;
    paidAmount: number;
    discountAmount?: number;
    dueAmount: number;
  }[];
}
