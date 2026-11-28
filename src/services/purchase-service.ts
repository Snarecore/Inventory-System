import {
  checkTradeOrderDelete,
  deleteTradeOrder,
  validateCheckTradeDeleteResult,
  getTradeDeleteAccessUser,
  extractTradeInvoiceNo,
} from "./trade-delete-service";
import apiConfig from "@/config/api.json";
import { assertApiSuccess, postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  CheckPurchaseDeletePayload,
  CheckPurchaseDeleteResponse,
  DeletePurchaseOrderPayload,
  DeletePurchaseOrderResponse,
} from "@/types";

export const getPurchaseDeleteAccessUser = getTradeDeleteAccessUser;
export const extractPurchaseInvoiceNo = extractTradeInvoiceNo;

export const savePurchase = async (
  payload: Record<string, unknown>,
  isEditMode: boolean
): Promise<unknown> => {
  const url = isEditMode
    ? apiConfig.purchase.updatePurchasesUrl
    : apiConfig.purchase.insertPurchasesUrl;
  const response = await postData<unknown>({ url, body: payload });

  return assertApiSuccess(response, "Failed to save purchase");
};

export async function fetchPurchasesListResponse(): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.purchase.purchaseListUrl,
    body: { accessUser: buildAccessUser() },
  });
}

export async function fetchPurchaseAndReturnSources(): Promise<
  [PromiseSettledResult<unknown>, PromiseSettledResult<unknown>]
> {
  const accessUser = buildAccessUser();
  return Promise.allSettled([
    postData<unknown>({
      url: apiConfig.purchaseReturn.getPurchaseAndReturnListUrl,
      body: { accessUser },
    }),
    postData<unknown>({
      url: apiConfig.finance.getFinancialTransactionUrl,
      body: { accessUser, startDate: "", endDate: "", type: "INCOME" },
    }),
  ]);
}

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
