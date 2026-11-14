import {
  checkTradeOrderDelete,
  deleteTradeOrder,
  validateCheckTradeDeleteResult,
  getTradeDeleteAccessUser,
  extractTradeInvoiceNo,
} from "./trade-delete-service";
import type {
  CheckPurchaseDeletePayload,
  CheckPurchaseDeleteResponse,
  DeletePurchaseOrderPayload,
  DeletePurchaseOrderResponse,
} from "@/types";

export const getPurchaseDeleteAccessUser = getTradeDeleteAccessUser;
export const extractPurchaseInvoiceNo = extractTradeInvoiceNo;

/**
 * 1. Checks if a purchase order can be deleted using /check-purchase-delete endpoint.
 */
export const checkPurchaseDelete = (
  payload: CheckPurchaseDeletePayload
): Promise<CheckPurchaseDeleteResponse> => {
  return checkTradeOrderDelete("purchase", payload);
};

/**
 * Validates the checkPurchaseDelete response.
 */
export const validateCheckPurchaseDeleteResult = (
  res: any
): { canDelete: boolean; message: string; data?: any } => {
  return validateCheckTradeDeleteResult(res, "Purchase order");
};

/**
 * 2. Deletes a purchase order using /delete-purchase-order endpoint.
 */
export const deletePurchaseOrder = (
  payload: DeletePurchaseOrderPayload
): Promise<DeletePurchaseOrderResponse> => {
  return deleteTradeOrder("purchase", payload);
};
