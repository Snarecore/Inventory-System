export type StockAdjustmentType = "IN" | "OUT";

export interface StockAdjustmentItemPayload {
  productId: number | string;
  adjustmentQty: number;
  adjustmentType: StockAdjustmentType;
  price?: number;
  remarks?: string;
  note?: string;
}

export interface SaveStockAdjustmentPayload {
  adjustmentType?: StockAdjustmentType;
  date?: string;
  remarks?: string;
  note?: string;
  items: StockAdjustmentItemPayload[];
}

export interface StockAdjustmentReportItem {
  adjustmentId: number;
  adjustmentNo: string;
  adjustmentType: StockAdjustmentType;
  productName: string;
  productId: string | number;
  packSize?: string;
  price: number;
  previousQty: number;
  adjustmentQty: number;
  newQty: number;
  remarks?: string | null;
  createdAt?: string;
}

export interface StockAdjustmentReportParams {
  fromDate?: string;
  toDate?: string;
}

export interface StockAdjustmentReportResponse {
  status: string;
  msg: string;
  data: StockAdjustmentReportItem[];
}

export interface SaveStockAdjustmentResponse {
  status: string;
  msg: string;
  data?: any;
}
