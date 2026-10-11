import type { IconType } from 'react-icons'

export type Theme = 'light' | 'dark' | 'system'

export interface NavItem {
  label: string
  href: string
  icon?: IconType
}

export interface FeatureItem {
  title: string
  description: string
  icon: IconType
}

export interface ProductItem {
  id?: string | number
  productId?: string | number
  name?: string
  productName?: string
  pcode?: string
  productCode?: string
  sku?: string
  barcode?: string
  category?: string
  categoryName?: string
  unit?: string
  secondary_unit?: string
  secondaryUnit?: string
  secondary_price?: number | string
  secondaryPrice?: number | string
  quantity?: number | string
  stock?: number | string
  buy_price?: number | string
  buyPrice?: number | string
  sell_price?: number | string
  sellPrice?: number | string
  low_stock_threshold?: number | string
  lowStockThreshold?: number | string
  packing_levels?: string
  packingLevels?: string
  status?: 'active' | 'inactive' | string | boolean
  featuredImage?: string
  image?: string
  imageUrl?: string
  branchId?: number | string
  orgId?: number | string
  [key: string]: any
}

export type PartyType = 'CUSTOMER' | 'SUPPLIER'

export interface PartyItem {
  id?: string | number
  partyId?: string | number
  party_id?: string | number
  name?: string
  partyName?: string
  party_name?: string
  type?: PartyType | string
  partyType?: PartyType | string
  party_type?: PartyType | string
  phone?: string
  phoneNumber?: string
  partyPhone?: string
  party_phone?: string
  email?: string
  partyEmail?: string
  address?: string
  partyAddress?: string
  openingBalance?: number | string
  opening_balance?: number | string
  balance?: number | string
  dueAmount?: number | string
  due_amount?: number | string
  status?: 'active' | 'inactive' | string | boolean
  branchId?: number | string
  orgId?: number | string
  created_at?: string
  updated_at?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: any
}

export interface PurchaseDetailItem {
  id?: string | number
  productId: string | number
  productCode?: string
  pcode?: string
  productName: string
  unit?: string
  quantity: number
  buyPrice: number
  discount?: number
  vat?: number
  delivery_charge?: number
  total: number
  status?: string
  advenType?: string
  [key: string]: any
}

export interface PurchaseItem {
  id?: string | number
  purchaseId?: string | number
  invoiceNo?: string
  supplierId?: string | number
  supplierName?: string
  supplierPhone?: string
  supplierAddress?: string
  purchaseDate?: string
  challanNo?: string
  vehicleNo?: string
  driverName?: string
  driverPhone?: string
  transportCost?: number
  totalAmount?: number
  discount?: number
  discountType?: 'FLAT' | 'PERCENT'
  vat?: number
  delivery_charge?: number
  grandTotal?: number
  paidAmount?: number
  dueAmount?: number
  paymentType?: 'CASH' | 'CREDIT' | 'BANK' | 'MFS' | string
  status?: string
  osType?: string
  note?: string
  cashReceived?: number
  cardReceived?: number
  mfsReceived?: number
  bankId?: string | number | null
  bankName?: string | null
  accountNo?: string | null
  bankAccountName?: string | null
  mfsId?: string | number | null
  mfsName?: string | null
  mfsMethod?: string | null
  mfsPhone?: string | null
  customerPaid?: number
  returnAmount?: number
  purchaseDetails?: PurchaseDetailItem[]
  attachment?: string | null
  attachmentUrl?: string | null
  challanImage?: string | null
  documentUrl?: string | null
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
  [key: string]: any
}

export interface PurchaseChallanSettings {
  id?: number | string | null;
  orgId?: number | string | null;
  branchId?: number | string | null;
  showChallanRefNo?: boolean;
  showChallanDate?: boolean;
  showVatChallan?: boolean;
  showVatChallanDate?: boolean;
  attachments?: boolean;
  remarks?: boolean;
  vehicleNumber?: boolean;
  capacityCft?: boolean;
  driverName?: boolean;
  driverPhone?: boolean;
  businessCode?: string | null;
  phoneNumber?: string | null;
  addedBy?: string | null;
  addedDate?: string | null;
  updatedBy?: string | null;
  updatedDate?: string | null;
  // Aliases for compatibility
  showChallanNo?: boolean;
  showVehicleNo?: boolean;
  showDriverName?: boolean;
  showDriverPhone?: boolean;
  showTransportCost?: boolean;
  showDeliveryDate?: boolean;
  showNotes?: boolean;
  showPoNumber?: boolean;
  enableAttachments?: boolean;
  showAttachments?: boolean;
  [key: string]: any;
}

export interface SaleDetailItem {
  id?: string | number;
  saleDetailId?: string | number;
  sale_detail_id?: string | number;
  productId: string | number;
  product_id?: string | number;
  productCode?: string;
  pcode?: string;
  productName: string;
  name?: string;
  unit?: string;
  quantity: number;
  qty?: number;
  sellPrice: number;
  sell_price?: number;
  unitPrice?: number;
  buyPrice?: number;
  discount?: number;
  vat?: number;
  delivery_charge?: number;
  total: number;
  status?: string;
  advenType?: string;
  stock?: number | string;
  [key: string]: any;
}

export interface SaleItem {
  id?: string | number;
  saleId?: string | number;
  sale_id?: string | number;
  invoiceNo?: string;
  invoice_no?: string;
  customerId?: string | number;
  customer_id?: string | number;
  customerName?: string;
  customer_name?: string;
  customerPhone?: string;
  customer_phone?: string;
  customerAddress?: string;
  customer_address?: string;
  salesDate?: string;
  saleDate?: string;
  sales_date?: string;
  date?: string;
  totalAmount?: number;
  total_amount?: number;
  discount?: number;
  discountType?: 'FLAT' | 'PERCENT';
  vat?: number;
  delivery_charge?: number;
  deliveryCharge?: number;
  grandTotal?: number;
  grand_total?: number;
  paidAmount?: number;
  paid_amount?: number;
  dueAmount?: number;
  due_amount?: number;
  paymentType?: 'CASH' | 'CREDIT' | 'BANK' | 'MFS' | string;
  payment_type?: string;
  status?: string;
  osType?: string;
  note?: string;
  remarks?: string;
  cashReceived?: number;
  cardReceived?: number;
  mfsReceived?: number;
  bankId?: string | number | null;
  bankName?: string | null;
  accountNo?: string | null;
  bankAccountName?: string | null;
  mfsId?: string | number | null;
  mfsName?: string | null;
  mfsMethod?: string | null;
  mfsPhone?: string | null;
  customerPaid?: number;
  returnAmount?: number;
  salesDetails?: SaleDetailItem[];
  saleDetails?: SaleDetailItem[];
  itemCount?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  branchId?: string | number;
  orgId?: string | number;
  [key: string]: any;
}

export interface SalesReturnDetailItem {
  id?: string | number;
  returnDetailId?: string | number;
  productId: string | number;
  productCode?: string;
  productName: string;
  unit?: string;
  soldQuantity?: number;
  quantity: number;
  returnQuantity?: number;
  sellPrice: number;
  discount?: number;
  vat?: number;
  deliveryCharge?: number;
  total: number;
  returnReason?: string;
  packSize?: string | null;
  expiryDate?: string | null;
  [key: string]: any;
}

export interface SalesReturnItem {
  id?: string | number;
  returnId?: string | number;
  returnNo?: string;
  orderNo?: string;
  salesInvoiceNo: string;
  invoiceNo?: string;
  customerId: string | number;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  returnDate: string;
  totalAmount: number;
  discount?: number;
  vat?: number;
  deliveryCharge?: number;
  grandTotal: number;
  refundAmount: number;
  paymentType: "CASH" | "CREDIT" | "MFS" | "BANK" | string;
  status: string;
  note?: string;
  osType?: string;
  returnDetails?: SalesReturnDetailItem[];
  itemsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface SaleTransactionReportItem {
  id?: string | number;
  invoiceNo?: string;
  date?: string;
  salesDate?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount?: number;
  discount?: number;
  vat?: number;
  deliveryCharge?: number;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentType?: string;
  status?: string;
  salesDetails?: SaleDetailItem[];
  [key: string]: any;
}


