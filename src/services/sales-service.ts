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
  CheckSalesDeletePayload,
  CheckSalesDeleteResponse,
  DeleteSalesOrderPayload,
  DeleteSalesOrderResponse,
} from "@/types";

export const getDeleteAccessUser = getTradeDeleteAccessUser;
export const getSalesDeleteAccessUser = getTradeDeleteAccessUser;
export const extractSalesInvoiceNo = extractTradeInvoiceNo;

export const saveSale = async (
  payload: Record<string, unknown>,
  isEditMode: boolean
): Promise<unknown> => {
  const url = isEditMode
    ? apiConfig.sales.updateSalesUrl
    : apiConfig.sales.insertSalesUrl;
  const response = await postData<unknown>({ url, body: payload });

  return assertApiSuccess(response, "Failed to save sale transaction");
};

export async function fetchSalesTransactionReport(
  startDate: string,
  endDate: string
): Promise<unknown> {
  const accessUser = buildAccessUser();
  return postData<unknown>({
    url: apiConfig.sales.salesTransactionReportUrl,
    body: {
      accessUser,
      startDate,
      endDate,
      fromDate: startDate,
      toDate: endDate,
    },
  });
}

export async function fetchSalesListResponse(): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.sales.salesListUrl,
    body: { accessUser: buildAccessUser() },
  });
}

export async function fetchSalesAndReturnSources(): Promise<
  [PromiseSettledResult<unknown>, PromiseSettledResult<unknown>]
> {
  const accessUser = buildAccessUser();
  return Promise.allSettled([
    postData<unknown>({
      url: apiConfig.salesReturn.getSalesAndReturnUrl,
      body: { accessUser },
    }),
    postData<unknown>({
      url: apiConfig.finance.getFinancialTransactionUrl,
      body: { accessUser, startDate: "", endDate: "", type: "EXPENSE" },
    }),
  ]);
}

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
