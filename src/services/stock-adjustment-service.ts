import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  SaveStockAdjustmentPayload,
  SaveStockAdjustmentResponse,
  StockAdjustmentReportParams,
  StockAdjustmentReportResponse,
  StockAdjustmentReportItem,
} from "@/types";

export const saveStockAdjustment = async (
  payload: SaveStockAdjustmentPayload
): Promise<SaveStockAdjustmentResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.inventory.stockAdjustmentSaveUrl;

  const rootAdjustmentType = payload.adjustmentType || "IN";

  // Sanitize and structure items according to the backend Java model requirements
  const items = (payload.items || []).map((item) => {
    const adjType = (item.adjustmentType || rootAdjustmentType).toUpperCase() as "IN" | "OUT";
    return {
      productId: Number(item.productId),
      adjustmentQty: Number(item.adjustmentQty) || 0,
      adjustmentType: adjType === "OUT" ? "OUT" : "IN",
      price: Number(item.price) || 0,
      remarks: (item.remarks || item.note || payload.remarks || payload.note || "").trim(),
    };
  });

  const body: any = {
    accessUser,
    adjustmentType: rootAdjustmentType,
    date: payload.date || new Date().toISOString().split("T")[0],
    note: (payload.note || payload.remarks || "").trim(),
    remarks: (payload.remarks || payload.note || "").trim(),
    items,
  };

  const res: any = await postData<SaveStockAdjustmentResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error" || String(res?.status).toLowerCase() === "failed") {
    throw new Error(res?.msg || res?.message || "Failed to save stock adjustment");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "Stock adjustment saved successfully",
    data: res?.data,
  };
};

export const fetchStockAdjustmentReport = async (
  params?: StockAdjustmentReportParams
): Promise<StockAdjustmentReportResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.inventory.stockAdjustmentReportUrl;

  // Default date window: past 365 days to today if not specified
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const fromDate = params?.fromDate || oneYearAgo.toISOString().split("T")[0];
  const toDate = params?.toDate || now.toISOString().split("T")[0];

  const body = {
    accessUser,
    fromDate,
    toDate,
  };

  const res: any = await postData<StockAdjustmentReportResponse>({ url, body });

  // Normalize report list safely
  let rawList: any[] = [];
  if (Array.isArray(res?.data)) {
    rawList = res.data;
  } else if (Array.isArray(res?.reportList)) {
    rawList = res.reportList;
  } else if (Array.isArray(res)) {
    rawList = res;
  }

  const data: StockAdjustmentReportItem[] = rawList.map((item: any, index: number) => {
    const rawType = String(item.adjustmentType || "").trim().toUpperCase();
    const isOut = rawType.includes("OUT");
    const adjustmentType: "IN" | "OUT" = isOut ? "OUT" : "IN";

    return {
      adjustmentId: item.adjustmentId || item.id || index + 1,
      adjustmentNo: item.adjustmentNo || item.refNo || `SA-${item.adjustmentId || index + 1}`,
      adjustmentType,
      productName: item.productName || item.name || "Unknown Product",
      productId: item.productId || "",
      packSize: (() => {
        const raw = String(item.packSize || item.unit || "").trim();
        if (!raw || raw.toLowerCase().includes("dozen") || raw.toLowerCase() === "units" || raw.toLowerCase() === "unit") {
          return "Pcs";
        }
        return raw;
      })(),
      price: Number(item.price) || 0,
      previousQty: Number(item.previousQty) || 0,
      adjustmentQty: Number(item.adjustmentQty) || 0,
      newQty: Number(item.newQty) || 0,
      remarks: item.remarks || item.note || "",
      createdAt: item.createdAt || item.date || "",
    };
  });

  return {
    status: res?.status || "Success",
    msg: res?.msg || "Stock adjustment report loaded successfully",
    data,
  };
};

/**
 * 3. KPI / SUMMARY CALCULATION
 */
export interface StockAdjustmentKpi {
  totalAdjustments: number;
  totalInQty: number;
  totalOutQty: number;
  totalInValue: number;
  totalOutValue: number;
  netQuantityImpact: number;
  totalValueImpact: number;
}

export const calculateStockAdjustmentKpi = (
  items: StockAdjustmentReportItem[]
): StockAdjustmentKpi => {
  let totalInQty = 0;
  let totalOutQty = 0;
  let totalInValue = 0;
  let totalOutValue = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = Number(item.adjustmentQty) || 0;
    const price = Number(item.price) || 0;
    const value = qty * price;

    if (item.adjustmentType === "IN") {
      totalInQty += qty;
      totalInValue += value;
    } else {
      totalOutQty += qty;
      totalOutValue += value;
    }
  }

  const netQuantityImpact = totalInQty - totalOutQty;

  return {
    totalAdjustments: items.length,
    totalInQty,
    totalOutQty,
    totalInValue,
    totalOutValue,
    netQuantityImpact,
    totalValueImpact: totalInValue - totalOutValue,
  };
};
