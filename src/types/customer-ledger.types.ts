export interface CustomerLedgerProductItem {
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

export interface CustomerLedgerEntry {
  date: string;
  time: string;
  particulars: string;
  refNo: string;
  orderNo: string;
  debit: number;
  credit: number;
  balance: number;
  products: CustomerLedgerProductItem[];
  // Breakdown specific fields
  typeLabel?: string;
  collectionMethod?: string;
  description?: string;
  salesAmount?: number;
  collectionAmount?: number;
  dateTimeStr?: string;
  [key: string]: any;
}

export interface CustomerLedgerBreakdownItem {
  id?: string;
  sl: number;
  date: string;
  time: string;
  dateTimeStr: string;
  type: string;
  collectionMethod: string;
  description: string;
  salesAmount: number;
  collectionAmount: number;
  balance: number;
  products: CustomerLedgerProductItem[];
  raw?: any;
}

export interface CustomerLedgerFilterParams {
  customerId?: string | number;
  partyId?: string | number;
  customerPhone?: string;
  customerName?: string;
  salesList?: any[];
  rawPartyData?: any;
  collections?: any[];
  startDate?: string;
  endDate?: string;
}

export interface CustomerLedgerStats {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  totalSales: number;
  totalCollected: number;
  finalBalance: number;
  entryCount: number;
}
