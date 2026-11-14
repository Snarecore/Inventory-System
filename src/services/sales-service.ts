import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  CheckSalesDeletePayload,
  CheckSalesDeleteResponse,
  DeleteSalesOrderPayload,
  DeleteSalesOrderResponse,
} from "@/types";

/**
 * Normalizes accessUser to { phone, orgId, branchId } structure expected by sales deletion APIs.
 */
export const getDeleteAccessUser = (customUser?: CheckSalesDeletePayload["accessUser"]) => {
  const current = buildAccessUser();
  return {
    phone: customUser?.phone !== undefined ? customUser.phone : (current.phone || ""),
    orgId: customUser?.orgId !== undefined ? customUser.orgId : current.orgId,
    branchId: customUser?.branchId !== undefined ? customUser.branchId : current.branchId,
  };
};

/**
 * 1. Checks if a sales order can be deleted using /check-sales-delete endpoint.
 *
 * Request Payload:
 * {
 *   "accessUser": {
 *     "phone": "",
 *     "orgId": ...,
 *     "branchId": ...
 *   },
 *   "invoiceNo": ""
 * }
 */
export const checkSalesDelete = async (
  payload: CheckSalesDeletePayload
): Promise<CheckSalesDeleteResponse> => {
  const accessUser = getDeleteAccessUser(payload.accessUser);
  const rawUrl = apiConfig.sales.checkSalesDeleteUrl || "check-sales-delete";
  const url = rawUrl.replace(/^\/+/, "");
  const invoiceNo = String(payload.invoiceNo || "").trim();

  const body = {
    accessUser,
    invoiceNo,
  };

  const res: any = await postData<CheckSalesDeleteResponse>({
    url,
    body,
    headers: {
      accessUser: JSON.stringify(accessUser),
    },
  });

  return res;
};

/**
 * Validates the checkSalesDelete response.
 * Returns canDelete boolean, user-friendly message, and raw server data if available.
 */
export const validateCheckSalesDeleteResult = (
  res: any
): { canDelete: boolean; message: string; data?: any } => {
  if (!res) {
    return { canDelete: false, message: "No response received from server" };
  }

  if (res.error === true) {
    return {
      canDelete: false,
      message: res.msg || res.message || "Failed to check sales delete status",
    };
  }

  const statusStr = String(res.status || "").toLowerCase();
  if (statusStr === "error" || statusStr === "failed" || statusStr === "fail") {
    return {
      canDelete: false,
      message: res.msg || res.message || "Sales order not found or cannot be deleted",
    };
  }

  if (res.canDelete === false || res.found === false || res.success === false) {
    return {
      canDelete: false,
      message: res.msg || res.message || "Sales order cannot be deleted",
    };
  }

  if (res.data === null && statusStr !== "success" && !res.msg) {
    return {
      canDelete: false,
      message: "Sales order not found for deletion",
    };
  }

  return {
    canDelete: true,
    message: res.msg || res.message || "Sales order found and eligible for deletion",
    data: res.data,
  };
};

/**
 * 2. Deletes a sales order using /delete-sales-order endpoint.
 *
 * Request Payload:
 * {
 *   "accessUser": {
 *     "phone": "",
 *     "orgId": ...,
 *     "branchId": ...
 *   },
 *   "invoiceNo": "",
 *   "reason": ""
 * }
 */
export const deleteSalesOrder = async (
  payload: DeleteSalesOrderPayload
): Promise<DeleteSalesOrderResponse> => {
  const accessUser = getDeleteAccessUser(payload.accessUser);
  const rawUrl = apiConfig.sales.deleteSalesOrderUrl || "delete-sales-order";
  const url = rawUrl.replace(/^\/+/, "");
  const invoiceNo = String(payload.invoiceNo || "").trim();
  const reason = String(payload.reason || "").trim();

  const body = {
    accessUser,
    invoiceNo,
    reason,
  };

  const res: any = await postData<DeleteSalesOrderResponse>({
    url,
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
    throw new Error(res?.msg || res?.message || "Failed to delete sales order");
  }

  return res;
};
