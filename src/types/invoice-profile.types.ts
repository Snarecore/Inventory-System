export interface InvoiceProfileSetupData {
  id?: number;
  orgId?: number;
  branchId?: number;
  showLogo: boolean;
  showBusinessName: boolean;
  showPhone1: boolean;
  showPhone2: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showWebsite: boolean;
  showTradeLicenseNo: boolean;
  showTinNo: boolean;
  showBinNo: boolean;
  showFooterMessage: boolean;
  status?: string;
  addedBy?: string;
  updatedBy?: string;
  addedDate?: string;
  updatedDate?: string;
  userId?: number | null;
}

export interface InvoiceProfileSetupSavePayload {
  id?: number;
  orgId?: number;
  branchId?: number;
  showLogo: boolean;
  showBusinessName: boolean;
  showPhone1: boolean;
  showPhone2: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showWebsite: boolean;
  showTradeLicenseNo: boolean;
  showTinNo: boolean;
  showBinNo: boolean;
  showFooterMessage: boolean;
}

export const DEFAULT_INVOICE_PROFILE_SETUP: InvoiceProfileSetupData = {
  showLogo: true,
  showBusinessName: true,
  showPhone1: true,
  showPhone2: true,
  showEmail: true,
  showAddress: true,
  showWebsite: true,
  showTradeLicenseNo: true,
  showTinNo: true,
  showBinNo: true,
  showFooterMessage: true,
};
