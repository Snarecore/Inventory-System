import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  CheckPurchaseDeletePayload,
  CheckPurchaseDeleteResponse,
  DeletePurchaseOrderPayload,
  DeletePurchaseOrderResponse,
} from "@/types";

/**
 * Normalizes accessUser to { phone, orgId, branchId } structure expected by purchase deletion APIs.
 */
export const getPurchaseDeleteAccessUser = (customUser?: CheckPurchaseDeletePayload["accessUser"]) => {
  const current = buildAccessUser();
  return {
    phone: customUser?.phone !== undefined ? customUser.phone : (current.phone || ""),
    orgId: customUser?.orgId !== undefined ? customUser.orgId : current.orgId,
    branchId: customUser?.branchId !== undefined ? customUser.branchId : current.branchId,
  };
};

/**
 * 1. Checks if a purchase order can be deleted using /check-purchase-delete endpoint.
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
export const checkPurchaseDelete = async (
  payload: CheckPurchaseDeletePayload
): Promise<CheckPurchaseDeleteResponse> => {
  const accessUser = getPurchaseDeleteAccessUser(payload.accessUser);
  const rawUrl = apiConfig.purchase.checkPurchaseDeleteUrl || "check-purchase-delete";
  const url = rawUrl.replace(/^\/+/, "");
  const invoiceNo = String(payload.invoiceNo || "").trim();

  const body = {
    accessUser,
    invoiceNo,
  };

  const res: any = await postData<CheckPurchaseDeleteResponse>({
    url,
    body,
    headers: {
      accessUser: JSON.stringify(accessUser),
    },
  });

  return res;
};

/**
 * Validates the checkPurchaseDelete response.
 * Returns canDelete boolean, user-friendly message, and raw server data if available.
 */
export const validateCheckPurchaseDeleteResult = (
  res: any
): { canDelete: boolean; message: string; data?: any } => {
  if (!res) {
    return { canDelete: false, message: "No response received from server" };
  }

  if (res.error === true) {
    return {
      canDelete: false,
      message: res.msg || res.message || "Failed to check purchase delete status",
    };
  }

  const statusStr = String(res.status || "").toLowerCase();
  if (statusStr === "error" || statusStr === "failed" || statusStr === "fail") {
    return {
      canDelete: false,
      message: res.msg || res.message || "Purchase order not found or cannot be deleted",
    };
  }

  if (res.canDelete === false || res.found === false || res.success === false) {
    return {
      canDelete: false,
      message: res.msg || res.message || "Purchase order cannot be deleted",
    };
  }

  if (res.data === null && statusStr !== "success" && !res.msg) {
    return {
      canDelete: false,
      message: "Purchase order not found for deletion",
    };
  }

  return {
    canDelete: true,
    message: res.msg || res.message || "Purchase order found and eligible for deletion",
    data: res.data,
  };
};

/**
 * 2. Deletes a purchase order using /delete-purchase-order endpoint.
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
export const deletePurchaseOrder = async (
  payload: DeletePurchaseOrderPayload
): Promise<DeletePurchaseOrderResponse> => {
  const accessUser = getPurchaseDeleteAccessUser(payload.accessUser);
  const rawUrl = apiConfig.purchase.deletePurchaseOrderUrl || "delete-purchase-order";
  const url = rawUrl.replace(/^\/+/, "");
  const invoiceNo = String(payload.invoiceNo || "").trim();
  const reason = String(payload.reason || "").trim();

  const body = {
    accessUser,
    invoiceNo,
    reason,
  };

  const res: any = await postData<DeletePurchaseOrderResponse>({
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
    throw new Error(res?.msg || res?.message || "Failed to delete purchase order");
  }

  return res;
};
