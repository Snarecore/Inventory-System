export interface BusinessProfileData {
  id?: number;
  orgId?: number;
  branchId?: number;
  businessName: string;
  businessType: string;
  businessOwnerName: string;
  businessPhone1: string;
  businessPhone2?: string | null;
  businessEmail?: string | null;
  address?: string | null;
  website?: string | null;
  tradeLicenseNo?: string | null;
  tinNo?: string | null;
  binNo?: string | null;
  businessLogo?: string | null;
  businessLogoUrl?: string | null;
  businessLogoRefNo?: string | null;
  description?: string | null;
  status?: string | null;
  addedBy?: string | null;
  userId?: number | null;
  addedDate?: string | null;
  updatedBy?: string | null;
  updatedDate?: string | null;
  annualTurnover?: number | null;
  annualIncome?: number | null;
  annualProfit?: number | null;
  businessCode?: string | null;
}

export interface BusinessProfileSavePayload {
  orgId?: number | string;
  branchId?: number | string;
  businessName: string;
  businessType: string;
  businessOwnerName: string;
  businessPhone1: string;
  businessPhone2?: string;
  businessEmail?: string;
  address?: string;
  website?: string;
  tradeLicenseNo?: string;
  tinNo?: string;
  binNo?: string;
  businessLogo?: string;
  businessLogoRefNo?: string;
  businessLogoUrl?: string;
  description?: string;
}

export interface BusinessTypeItem {
  id: number;
  sortOrder?: number;
  icon?: string;
  labelBn: string;
  labelEn: string;
}

export interface BusinessProfileApiResponse {
  status: string;
  msg: string;
  data: BusinessProfileData | null;
}
