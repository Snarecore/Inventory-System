export interface PurchaseLedgerProductItem {
  id?: string | number;
  productId?: string | number;
  productName?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  price?: number;
  rate?: number;
  total?: number;
  subtotal?: number;
  discount?: number;
  [key: string]: any;
}

export interface PurchaseLedgerEntry {
  date: string;
  time: string;
  particulars: string;
  refNo: string;
  orderNo: string;
  debit: number;
  credit: number;
  balance: number;
  products: PurchaseLedgerProductItem[];
  // Breakdown specific fields
  typeLabel?: string;
  paymentMethod?: string;
  description?: string;
  billAmount?: number;
  paymentAmount?: number;
  dateTimeStr?: string;
  [key: string]: any;
}

export interface PurchaseLedgerBreakdownItem {
  id?: string;
  sl: number;
  date: string;
  time: string;
  dateTimeStr: string;
  type: string;
  paymentMethod: string;
  description: string;
  billAmount: number;
  paymentAmount: number;
  balance: number;
  products: PurchaseLedgerProductItem[];
  raw?: any;
}

export interface PurchaseLedgerFilterParams {
  supplierId?: string | number;
  partyId?: string | number;
  supplierPhone?: string;
  supplierName?: string;
  purchasesList?: any[];
  returnRecords?: any[];
  rawPartyData?: any;
  payments?: any[];
  startDate?: string;
  endDate?: string;
}

export interface PurchaseLedgerStats {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  totalPurchases: number;
  totalPaid: number;
  finalBalance: number;
  entryCount: number;
}
