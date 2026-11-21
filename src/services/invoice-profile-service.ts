import { getData, postData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import {
  InvoiceProfileSetupData,
  InvoiceProfileSetupSavePayload,
  DEFAULT_INVOICE_PROFILE_SETUP,
} from "@/types/invoice-profile.types";

function normalizeInvoiceProfile(raw: any, defaultOrgId?: number, defaultBranchId?: number): InvoiceProfileSetupData {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_INVOICE_PROFILE_SETUP };
  }

  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    orgId: raw.orgId != null ? Number(raw.orgId) : defaultOrgId,
    branchId: raw.branchId != null ? Number(raw.branchId) : defaultBranchId,
    showLogo: typeof raw.showLogo === "boolean" ? raw.showLogo : true,
    showBusinessName: typeof raw.showBusinessName === "boolean" ? raw.showBusinessName : true,
    showPhone1: typeof raw.showPhone1 === "boolean" ? raw.showPhone1 : true,
    showPhone2: typeof raw.showPhone2 === "boolean" ? raw.showPhone2 : true,
    showEmail: typeof raw.showEmail === "boolean" ? raw.showEmail : true,
    showAddress: typeof raw.showAddress === "boolean" ? raw.showAddress : true,
    showWebsite: typeof raw.showWebsite === "boolean" ? raw.showWebsite : true,
    showTradeLicenseNo: typeof raw.showTradeLicenseNo === "boolean" ? raw.showTradeLicenseNo : true,
    showTinNo: typeof raw.showTinNo === "boolean" ? raw.showTinNo : true,
    showBinNo: typeof raw.showBinNo === "boolean" ? raw.showBinNo : true,
    showFooterMessage: typeof raw.showFooterMessage === "boolean" ? raw.showFooterMessage : true,
    status: raw.status,
    addedBy: raw.addedBy,
    updatedBy: raw.updatedBy,
    addedDate: raw.addedDate,
    updatedDate: raw.updatedDate,
    userId: raw.userId ?? null,
  };
}

export async function getInvoiceProfileSetup(
  orgIdParam?: number | string,
  branchIdParam?: number | string
): Promise<InvoiceProfileSetupData> {
  const accessUser = buildAccessUser();
  const orgId = orgIdParam ? Number(orgIdParam) : (accessUser.orgId ? Number(accessUser.orgId) : undefined);
  const branchId = branchIdParam ? Number(branchIdParam) : (accessUser.branchId ? Number(accessUser.branchId) : undefined);

  if (!orgId || !branchId) {
    return { ...DEFAULT_INVOICE_PROFILE_SETUP };
  }

  const endpointUrl = `${apiConfig.business.invoiceProfileSetupUrl}/org/${orgId}/branch/${branchId}`;

  const res = (await getData<any>({
    url: endpointUrl,
  })) as any;

  if (res?.error || res?.status === "Error") {
    return { ...DEFAULT_INVOICE_PROFILE_SETUP, orgId, branchId };
  }

  const data = res?.data ?? res;
  return normalizeInvoiceProfile(data, orgId, branchId);
}

/**
 * Fetch invoice profile setup by user phone number: GET /invoice-profile-setup/{phone}
 * Resolves session org and branch or queries endpoint directly.
 */
export async function getInvoiceProfileSetupByPhone(phone?: string): Promise<InvoiceProfileSetupData> {
  const accessUser = buildAccessUser();
  const targetPhone = phone || accessUser.phone;

  // If org and branch are already established in session, use org/branch contract
  if (accessUser.orgId && accessUser.branchId) {
    return getInvoiceProfileSetup(accessUser.orgId, accessUser.branchId);
  }

  if (!targetPhone) {
    return { ...DEFAULT_INVOICE_PROFILE_SETUP };
  }

  const endpointUrl = `${apiConfig.business.invoiceProfileSetupUrl}/${encodeURIComponent(targetPhone)}`;

  const res = (await getData<any>({
    url: endpointUrl,
  })) as any;

  if (res?.error || res?.status === "Error") {
    return { ...DEFAULT_INVOICE_PROFILE_SETUP };
  }

  const data = res?.data ?? res;
  return normalizeInvoiceProfile(data);
}

/**
 * Save invoice profile setup: POST /invoice-profile-setup-save
 */
export async function saveInvoiceProfileSetup(
  payload: InvoiceProfileSetupSavePayload
): Promise<any> {
  const accessUser = buildAccessUser();
  const orgId = payload.orgId != null && payload.orgId !== 0 ? Number(payload.orgId) : accessUser.orgId;
  const branchId = payload.branchId != null && payload.branchId !== 0 ? Number(payload.branchId) : accessUser.branchId;

  const body = {
    ...(payload.id ? { id: payload.id } : {}),
    orgId,
    branchId,
    showLogo: Boolean(payload.showLogo),
    showBusinessName: Boolean(payload.showBusinessName),
    showPhone1: Boolean(payload.showPhone1),
    showPhone2: Boolean(payload.showPhone2),
    showEmail: Boolean(payload.showEmail),
    showAddress: Boolean(payload.showAddress),
    showWebsite: Boolean(payload.showWebsite),
    showTradeLicenseNo: Boolean(payload.showTradeLicenseNo),
    showTinNo: Boolean(payload.showTinNo),
    showBinNo: Boolean(payload.showBinNo),
    showFooterMessage: Boolean(payload.showFooterMessage),
    accessUser,
  };

  const res = (await postData<any>({
    url: apiConfig.business.invoiceProfileSetupSaveUrl,
    body,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || "Failed to save invoice profile setup");
  }

  return res;
}
