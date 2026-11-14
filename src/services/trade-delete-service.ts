import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  CheckTradeDeletePayload,
  CheckTradeDeleteResponse,
  DeleteTradeOrderPayload,
  DeleteTradeOrderResponse,
  TradeDeleteAccessUser,
} from "@/types";

export type TradeOrderType = "sales" | "purchase";

/**
 * Normalizes accessUser to { phone, orgId, branchId } structure expected by trade deletion APIs.
 */
export const getTradeDeleteAccessUser = (
  customUser?: CheckTradeDeletePayload["accessUser"]
): TradeDeleteAccessUser => {
  const current = buildAccessUser();
  return {
    phone: customUser?.phone !== undefined ? customUser.phone : (current.phone || ""),
    orgId: customUser?.orgId !== undefined ? customUser.orgId : current.orgId,
    branchId: customUser?.branchId !== undefined ? customUser.branchId : current.branchId,
  };
};

/**
 * Resolves endpoints and labels for sales vs purchase operations.
 */
export const getTradeDeleteEndpoints = (type: TradeOrderType) => {
  if (type === "sales") {
    const rawCheck = (apiConfig as any).sales?.checkSalesDeleteUrl || "check-sales-delete";
    const rawDelete = (apiConfig as any).sales?.deleteSalesOrderUrl || "delete-sales-order";
    return {
      checkUrl: rawCheck.replace(/^\/+/, ""),
      deleteUrl: rawDelete.replace(/^\/+/, ""),
      label: "Sales order",
    };
  }

  const rawCheck = (apiConfig as any).purchase?.checkPurchaseDeleteUrl || "check-purchase-delete";
  const rawDelete = (apiConfig as any).purchase?.deletePurchaseOrderUrl || "delete-purchase-order";
  return {
    checkUrl: rawCheck.replace(/^\/+/, ""),
    deleteUrl: rawDelete.replace(/^\/+/, ""),
    label: "Purchase order",
  };
};

/**
 * Robust invoice number extractor from any sale or purchase item object.
 */
export const extractTradeInvoiceNo = (item: any): string => {
  if (!item) return "";
  return String(
    item.invoiceNo ||
    item.salesInvoiceNo ||
    item.purchaseInvoiceNo ||
    item.invoice_no ||
    item.orderNo ||
    item.order_no ||
    item.challanNo ||
    item.id ||
    ""
  ).trim();
};

/**
 * 1. Step 1: Checks if a trade order (sale or purchase) can be deleted via backend check API.
 */
export const checkTradeOrderDelete = async (
  type: TradeOrderType,
  payload: CheckTradeDeletePayload
): Promise<CheckTradeDeleteResponse> => {
  const accessUser = getTradeDeleteAccessUser(payload.accessUser);
  const { checkUrl } = getTradeDeleteEndpoints(type);
  const invoiceNo = String(payload.invoiceNo || "").trim();

  const body = {
    accessUser,
    invoiceNo,
  };

  const res: any = await postData<CheckTradeDeleteResponse>({
    url: checkUrl,
    body,
    headers: {
      accessUser: JSON.stringify(accessUser),
    },
  });

  return res;
};

/**
 * Validates the check delete response received from the backend.
 * Returns canDelete boolean, user-friendly message, and raw server data if available.
 */
export const validateCheckTradeDeleteResult = (
  res: any,
  entityLabel: string = "Order"
): { canDelete: boolean; message: string; data?: any } => {
  if (!res) {
    return { canDelete: false, message: "No response received from server" };
  }

  if (res.error === true) {
    return {
      canDelete: false,
      message: res.msg || res.message || `Failed to check ${entityLabel.toLowerCase()} delete status`,
    };
  }

  const statusStr = String(res.status || "").toLowerCase();
  if (statusStr === "error" || statusStr === "failed" || statusStr === "fail") {
    return {
      canDelete: false,
      message: res.msg || res.message || `${entityLabel} not found or cannot be deleted`,
    };
  }

  if (res.canDelete === false || res.found === false || res.success === false) {
    return {
      canDelete: false,
      message: res.msg || res.message || `${entityLabel} cannot be deleted`,
    };
  }

  if (res.data === null && statusStr !== "success" && !res.msg) {
    return {
      canDelete: false,
      message: `${entityLabel} not found for deletion`,
    };
  }

  return {
    canDelete: true,
    message: res.msg || res.message || `${entityLabel} found and eligible for deletion`,
    data: res.data,
  };
};

/**
 * 2. Step 2: Deletes a trade order (sale or purchase) via backend delete API.
 */
export const deleteTradeOrder = async (
  type: TradeOrderType,
  payload: DeleteTradeOrderPayload
): Promise<DeleteTradeOrderResponse> => {
  const accessUser = getTradeDeleteAccessUser(payload.accessUser);
  const { deleteUrl, label } = getTradeDeleteEndpoints(type);
  const invoiceNo = String(payload.invoiceNo || "").trim();
  const reason = String(payload.reason || "").trim();

  const body = {
    accessUser,
    invoiceNo,
    reason,
  };

  const res: any = await postData<DeleteTradeOrderResponse>({
    url: deleteUrl,
    body,
    headers: {
      accessUser: JSON.stringify(accessUser),
    },
  });

  if (
    res?.error === true ||
    String(res?.status).toLowerCase() === "error" ||
    String(res?.status).toLowerCase() === "failed" ||
    String(res?.status).toLowerCase() === "fail"
  ) {
    throw new Error(res?.msg || res?.message || `Failed to delete ${label.toLowerCase()}`);
  }

  return res;
};
