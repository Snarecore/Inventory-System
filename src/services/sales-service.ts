import {
  checkTradeOrderDelete,
  deleteTradeOrder,
  validateCheckTradeDeleteResult,
  getTradeDeleteAccessUser,
  extractTradeInvoiceNo,
} from "./trade-delete-service";
import type {
  CheckSalesDeletePayload,
  CheckSalesDeleteResponse,
  DeleteSalesOrderPayload,
  DeleteSalesOrderResponse,
} from "@/types";

export const getDeleteAccessUser = getTradeDeleteAccessUser;
export const getSalesDeleteAccessUser = getTradeDeleteAccessUser;
export const extractSalesInvoiceNo = extractTradeInvoiceNo;

/**
 * 1. Checks if a sales order can be deleted using /check-sales-delete endpoint.
 */
export const checkSalesDelete = (
  payload: CheckSalesDeletePayload
): Promise<CheckSalesDeleteResponse> => {
  return checkTradeOrderDelete("sales", payload);
};

/**
 * Validates the checkSalesDelete response.
 */
export const validateCheckSalesDeleteResult = (
  res: any
): { canDelete: boolean; message: string; data?: any } => {
  return validateCheckTradeDeleteResult(res, "Sales order");
};

/**
 * 2. Deletes a sales order using /delete-sales-order endpoint.
 */
export const deleteSalesOrder = (
  payload: DeleteSalesOrderPayload
): Promise<DeleteSalesOrderResponse> => {
  return deleteTradeOrder("sales", payload);
};
