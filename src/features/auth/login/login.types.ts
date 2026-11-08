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
  businessName?: string;
  businessCode?: string;
  business_code?: string;
  userRole?: string;
  accountType?: string;
  userId?: number;
  employeeId?: number;
  isEmployee?: boolean;
  organizationId?: number;
  branchId?: number;
  branchType?: string;
  branches?: any[];
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
  fullName?: string;
  businessName?: string;
  businessCode?: string;
  business_code?: string;
  userRole?: string;
  accountType?: string;
  userId?: number;
  employeeId?: number;
  isEmployee?: boolean;
  orgId?: number;
  organizationId?: number;
  branchId?: number;
  branchType?: string;
  branches?: any[];
}
