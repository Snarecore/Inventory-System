import apiConfig from "@/config/api.json";
import { assertApiSuccess, postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type { PurchaseChallanSettings } from "@/types";

export async function fetchPurchaseChallanSettings(): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.purchase.purchaseChallanSettingsUrl,
    body: { accessUser: buildAccessUser() },
  });
}

export async function savePurchaseChallanSettings(
  settings: PurchaseChallanSettings
): Promise<unknown> {
  const payload: Record<string, unknown> = {
    accessUser: buildAccessUser(),
    showChallanRefNo: Boolean(settings.showChallanRefNo),
    showChallanDate: Boolean(settings.showChallanDate),
    showVatChallan: Boolean(settings.showVatChallan),
    showVatChallanDate: Boolean(settings.showVatChallanDate),
    attachments: Boolean(settings.attachments),
    remarks: Boolean(settings.remarks),
    vehicleNumber: Boolean(settings.vehicleNumber),
    capacityCft: Boolean(settings.capacityCft),
    driverName: Boolean(settings.driverName),
    driverPhone: Boolean(settings.driverPhone),
    showChallanNo: Boolean(settings.showChallanRefNo),
    showDeliveryDate: Boolean(settings.showChallanDate),
    showNotes: Boolean(settings.remarks),
    showVehicleNo: Boolean(settings.vehicleNumber),
    enableAttachments: Boolean(settings.attachments),
    showAttachments: Boolean(settings.attachments),
  };

  if (settings.id) payload.id = settings.id;

  const response = await postData<unknown>({
    url: apiConfig.purchase.insertOrUpdatePurchaseChallanSettingsUrl,
    body: payload,
  });

  return assertApiSuccess(response, "Failed to update challan settings");
}
