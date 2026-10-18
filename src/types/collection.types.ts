/**
 * Enterprise standard TypeScript definitions for Customer Collection & Due Management
 */

export interface CustomerDueItem {
  id?: string | number;
  customerId?: string | number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  totalDue?: number;
  total_due?: number;
  dueAmount?: number;
  due_amount?: number;
  invoiceCount?: number;
  invoicesCount?: number;
  lastSaleDate?: string;
  [key: string]: any;
}

export interface InvoiceDueItem {
  id?: string | number;
  invoiceNo: string;
  orderNo?: string;
  salesDate?: string;
  saleDate?: string;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount: number;
  paymentType?: string;
  status?: string;
  [key: string]: any;
}

export interface CollectionDetailPayload {
  invoiceNo: string;
  paidAmount: number;
  dueAmount: number;
  businessCode?: string;
  [key: string]: any;
}

export interface CollectionBankDetails {
  bankId: string | number;
  bankName: string;
  accountNumber: string;
  accountHolderName?: string;
}

export interface CollectionMfsDetails {
  mfsId?: string | number;
  mfsName?: string;
  mfsPhone?: string;
}

export interface CollectionDataPayload {
  customerId: string | number;
  customerName: string;
  customerPhone: string;
  collectionDate: string;
  totalAmount: number;
  totalDiscount?: number;
  paymentMode: "Cash" | "Bank" | "MFS" | "CASH" | "BANK" | string;
  remark?: string;
  osType: "WEB";
  businessCode: string;
  collectionDetails: CollectionDetailPayload[];
  bankDetails?: CollectionBankDetails | null;
  mfsDetails?: CollectionMfsDetails | null;
  cashAmount?: number;
  bankAmount?: number;
  mfsAmount?: number;
  [key: string]: any;
}

export interface CollectionRequestPayload {
  accessUser: Record<string, any>;
  collectionData: CollectionDataPayload;
}

export interface CollectionAllocation {
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

export interface AllocationResult {
  allocations: CollectionAllocation[];
  allocatedTotal: number;
  remainingTotalDue: number;
}

export interface CollectionReportDetailItem {
  invoiceNo: string;
  paidAmount: number;
  dueAmount: number;
  [key: string]: any;
}

export interface CollectionReportItem {
  id?: string | number;
  collectionNo?: string;
  customerId?: string | number;
  customerName?: string;
  customerPhone?: string;
  collectionDate?: string;
  totalAmount?: number;
  totalDiscount?: number;
  paymentMode?: string;
  remark?: string;
  collectionDetails?: CollectionReportDetailItem[];
  [key: string]: any;
}
