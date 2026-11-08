import { AccessUser } from "@/utils/access-user";

export interface BranchItem {
  id: number;
  branchId: number;
  orgId: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  currency: string;
  openingBalance: number;
  openingDate: string;
  active: boolean;
  categoryCopy?: boolean;
  productCopy?: boolean;
  partyCopy?: boolean;
  bankCopy?: boolean;
  mfsCopy?: boolean;
  copyBranchId?: number | null;
  primary?: boolean;
}

export interface BranchListResponse {
  status: "Success" | "Error" | string;
  msg?: string;
  data: BranchItem[];
}

export interface BranchInsertPayload {
  accessUser: AccessUser;
  name: string;
  code: string;
  address: string;
  phone: string;
  currency: string;
  openingBalance: number;
  openingDate: string;
  categoryCopy?: boolean;
  productCopy?: boolean;
  partyCopy?: boolean;
  bankCopy?: boolean;
  mfsCopy?: boolean;
  copybranchId?: number | null;
}

export interface BranchUpdatePayload {
  accessUser: AccessUser;
  id: number;
  orgId: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  currency: string;
  openingBalance: number;
  openingDate: string;
  active: boolean;
}

export interface BranchFormData {
  name: string;
  code: string;
  address: string;
  phone: string;
  currency: string;
  openingBalance: string | number;
  openingDate: string;
  categoryCopy: boolean;
  productCopy: boolean;
  partyCopy: boolean;
  bankCopy: boolean;
  mfsCopy: boolean;
  copybranchId: string | number;
  active: boolean;
}
