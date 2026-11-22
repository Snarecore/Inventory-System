import { postData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import {
  OrderSerialSettingsState,
  UpdateOrderSerialSettingPayload,
  EMPTY_ORDER_SERIAL_STATE,
} from "@/types/order-serial.types";

/**
 * Normalizes backend response from /get-order-serial-settings
 * Actual backend structure:
 * {
 *   "status": "Success",
 *   "msg": "Order serial settings fetched successfully",
 *   "serialList": [
 *     { "serialType": "SALE", "lastNumber": 40, "padLength": 6, "nextOrderNo": "000041" },
 *     { "serialType": "PURCHASE", "lastNumber": 359, "padLength": 6, "nextOrderNo": "000360" }
 *   ]
 * }
 */
export function normalizeOrderSerialSettings(raw: any): OrderSerialSettingsState {
  if (!raw) return { ...EMPTY_ORDER_SERIAL_STATE };

  const list: any[] = Array.isArray(raw?.serialList)
    ? raw.serialList
    : Array.isArray(raw)
    ? raw
    : [];

  const saleItem = list.find((item: any) => item?.serialType?.toUpperCase() === "SALE");
  const purchaseItem = list.find((item: any) => item?.serialType?.toUpperCase() === "PURCHASE");

  return {
    sale: {
      serialType: "SALE",
      lastNumber: Number(saleItem?.lastNumber ?? 0),
      padLength: Number(saleItem?.padLength ?? 6),
      nextOrderNo: String(saleItem?.nextOrderNo ?? ""),
    },
    purchase: {
      serialType: "PURCHASE",
      lastNumber: Number(purchaseItem?.lastNumber ?? 0),
      padLength: Number(purchaseItem?.padLength ?? 6),
      nextOrderNo: String(purchaseItem?.nextOrderNo ?? ""),
    },
  };
}

/**
 * Fetch Order Serial Settings: POST /get-order-serial-settings
 */
export async function getOrderSerialSettings(): Promise<OrderSerialSettingsState> {
  const endpointUrl =
    (apiConfig as any).orderSerial?.getOrderSerialSettingsUrl ||
    "get-order-serial-settings";

  const accessUser = buildAccessUser();

  const res: any = await postData<any>({
    url: endpointUrl,
    body: { accessUser },
  });

  if (res?.error || res?.status === "Error") {
    return { ...EMPTY_ORDER_SERIAL_STATE };
  }

  return normalizeOrderSerialSettings(res);
}

/**
 * Update Order Serial Setting: POST /update-order-serial-settings
 * Payload structure:
 * {
 *   "serialType": "SALE",
 *   "startNumber": "00001",
 *   "accessUser": { ... }
 * }
 */
export async function updateOrderSerialSetting(
  payload: UpdateOrderSerialSettingPayload
): Promise<any> {
  const endpointUrl =
    (apiConfig as any).orderSerial?.updateOrderSerialSettingsUrl ||
    "update-order-serial-settings";

  const accessUser = buildAccessUser();

  const body = {
    serialType: payload.serialType,
    startNumber: String(payload.startNumber).trim(),
    accessUser,
  };

  const res: any = await postData<any>({
    url: endpointUrl,
    body,
  });

  if (res?.error || res?.status === "Error") {
    const errorMsg = res?.msg || res?.message || "Failed to update order serial settings";
    throw new Error(errorMsg);
  }

  return res;
}
