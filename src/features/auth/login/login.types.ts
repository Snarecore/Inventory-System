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
  userRole?: string;
  organizationId?: number;
  branchId?: number;
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
  userRole?: string;
  orgId?: number;
  branchId?: number;
}
