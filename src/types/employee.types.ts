import type { AccessUser } from "@/utils/access-user";

/**
 * Core Employee Domain Model
 * Matches exact backend schema from POST /insert-employees and GET /get-employees
 */
export interface EmployeeItem {
  id?: number;
  organizationId: number;
  employeeCode: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  gender?: "Male" | "Female" | "Other" | string;
  dateOfBirth?: string;
  nationalId?: string;
  email?: string;
  phoneNumber: string;
  altPhoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  role?: string;
  designation?: string;
  department?: string;
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACT" | string;
  dateOfJoining?: string;
  dateOfLeaving?: string | null;
  reportingManagerId?: number | null;
  workLocation?: string;
  presentSalary?: number;
  salaryCurrency?: string;
  payFrequency?: "MONTHLY" | "WEEKLY" | "DAILY" | string;
  bankAccountNumber?: string;
  bankName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  hasAppAccess?: boolean;
  appUsername?: string; // Employee mobile/phone number used as app login username
  appPassword?: string; // 4-digit numeric PIN used as app login password
  profilePhotoUrl?: string | null;
  notes?: string;
  adminUserId?: number;
  active?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload sent to POST /insert-employees
 */
export interface EmployeeInsertPayload {
  accessUser?: AccessUser;
  organizationId: number;
  employeeCode: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  nationalId?: string;
  email?: string;
  phoneNumber: string;
  altPhoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  role?: string;
  designation?: string;
  department?: string;
  employmentType?: string;
  dateOfJoining?: string;
  dateOfLeaving?: string | null;
  reportingManagerId?: number | null;
  workLocation?: string;
  presentSalary?: number;
  salaryCurrency?: string;
  payFrequency?: string;
  bankAccountNumber?: string;
  bankName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  hasAppAccess?: boolean;
  appUsername?: string; // Employee mobile/phone number used as app login username
  appPassword?: string; // 4-digit numeric PIN used as app login password
  profilePhotoUrl?: string | null;
  notes?: string;
  adminUserId?: number;
}

/**
 * Payload sent to POST /update-employees/{id}
 */
export interface EmployeeUpdatePayload extends Partial<EmployeeInsertPayload> {
  id?: number;
}

/**
 * Response envelope for GET /get-employees/{organizationId}
 */
export interface EmployeeListResponse {
  status: "Success" | "Error" | string;
  msg?: string;
  message?: string;
  data: EmployeeItem[];
}

/**
 * Employee Branch Permission Assignment
 * Endpoint: POST /employee-branch-permissions
 */
export interface EmployeeBranchPermissionPayload {
  accessUser?: AccessUser;
  employeeId: number;
  branchId: number;
  organizationId?: number;
  primary?: boolean;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  grantedBy?: number | null;
  permissions?: string[];
  active?: boolean;
}

export interface EmployeeBranchPermissionItem {
  id?: number;
  employeeId: number;
  branchId: number;
  primary?: boolean;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  grantedBy?: number | null;
  permissions?: string[];
  active?: boolean;
  branchName?: string;
  branchCode?: string;
  createdAt?: string;
  updatedAt?: string;
}
