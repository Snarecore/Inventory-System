export interface LoginBranch {
  branchId: number;
  name: string;
  code?: string;
  address?: string | null;
  phone?: string;
  primary?: boolean;
  active?: boolean;
}

export interface LoginPayload {
  authentication: {
    phone_number: string;
    password?: string;
    pin?: string;
  };
  fcm_token?: string;
  login_version?: string;
}

export interface LoginSuccessResponse {
  status: "Success" | string;
  msg: string;
  phoneNumber: string;
  token: string;
  pin?: string;
  fullName?: string;
  accountType?: string;
  businessName?: string;
  businessAddress?: string | null;
  businessType?: string;
  profileUrl?: string;
  businessCode?: string;
  userRole?: string;
  isInventory?: string;
  userId?: number;
  organizationId?: number;
  branchId?: number;
  branchType?: string;
  branches?: LoginBranch[];
}

export interface LoginErrorResponse {
  status: "Error" | string;
  msg?: string;
  error?: boolean;
  message?: string;
}

export type LoginApiResponse = LoginSuccessResponse | LoginErrorResponse;

export interface UserInfo {
  phone: string;
  phoneNumber: string;
  token: string;
  pin?: string;
  businessCode?: string;
  orgId?: number;
  organizationId?: number;
  branchId?: number;
  branchType?: string;
  branches?: LoginBranch[];
  fullName?: string;
  businessName?: string;
  businessAddress?: string | null;
  businessType?: string;
  profileUrl?: string;
  userRole?: string;
  userId?: number;
  accountType?: string;
  isInventory?: string;
}
