import { getData, postData, deleteData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import { getUserInfo, getStoredUser } from "@/utils/auth-storage";
import type {
  EmployeeItem,
  EmployeeInsertPayload,
  EmployeeUpdatePayload,
  EmployeeBranchPermissionPayload,
} from "@/types/employee.types";
import {
  PERMISSION_MODULES,
  getReadOnlyPermissionKeys,
  buildPermissionKey,
} from "@/utils/permission-utils";

export async function getEmployeeList(organizationId?: number): Promise<EmployeeItem[]> {
  const accessUser = buildAccessUser();
  const orgId = organizationId || accessUser.orgId;

  const res = (await getData<any>({
    url: `${apiConfig.employee.getEmployeesUrl}/${orgId}`,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to load employee list");
  }

  const rawList: any[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
    ? res
    : [];

  return rawList;
}
export async function insertEmployee(
  payload: Partial<EmployeeInsertPayload>
): Promise<any> {
  const accessUser = buildAccessUser();
  const userInfo = getUserInfo();
  const storedUser = getStoredUser();

  const orgId =
    payload.organizationId ||
    userInfo?.orgId ||
    (userInfo as any)?.organizationId ||
    accessUser.orgId;

  const adminUserId =
    payload.adminUserId ||
    (userInfo as any)?.adminUserId ||
    (userInfo as any)?.userId ||
    (userInfo as any)?.id ||
    (storedUser?.id && !isNaN(Number(storedUser.id)) ? Number(storedUser.id) : undefined);

  const body: EmployeeInsertPayload = {
    organizationId: Number(orgId),
    employeeCode: String(payload.employeeCode || "").trim(),
    fullName: String(payload.fullName || "").trim(),
    firstName: payload.firstName ? String(payload.firstName).trim() : undefined,
    lastName: payload.lastName ? String(payload.lastName).trim() : undefined,
    gender: payload.gender || "Male",
    dateOfBirth: payload.dateOfBirth || undefined,
    nationalId: payload.nationalId ? String(payload.nationalId).trim() : undefined,
    email: payload.email ? String(payload.email).trim() : undefined,
    phoneNumber: String(payload.phoneNumber || "").trim(),
    altPhoneNumber: payload.altPhoneNumber ? String(payload.altPhoneNumber).trim() : undefined,
    address: payload.address ? String(payload.address).trim() : undefined,
    city: payload.city ? String(payload.city).trim() : undefined,
    state: payload.state ? String(payload.state).trim() : undefined,
    country: payload.country || "Bangladesh",
    postalCode: payload.postalCode ? String(payload.postalCode).trim() : undefined,
    role: payload.role || "EMPLOYEE",
    designation: payload.designation ? String(payload.designation).trim() : undefined,
    department: payload.department ? String(payload.department).trim() : undefined,
    employmentType: payload.employmentType || "FULL_TIME",
    dateOfJoining: payload.dateOfJoining || new Date().toISOString().slice(0, 10),
    dateOfLeaving: payload.dateOfLeaving ?? null,
    reportingManagerId: payload.reportingManagerId ?? null,
    workLocation: payload.workLocation ? String(payload.workLocation).trim() : undefined,
    presentSalary: payload.presentSalary !== undefined ? Number(payload.presentSalary) : 0,
    salaryCurrency: payload.salaryCurrency || "BDT",
    payFrequency: payload.payFrequency || "MONTHLY",
    bankAccountNumber: payload.bankAccountNumber ? String(payload.bankAccountNumber).trim() : undefined,
    bankName: payload.bankName ? String(payload.bankName).trim() : undefined,
    emergencyContactName: payload.emergencyContactName ? String(payload.emergencyContactName).trim() : undefined,
    emergencyContactPhone: payload.emergencyContactPhone ? String(payload.emergencyContactPhone).trim() : undefined,
    emergencyContactRelation: payload.emergencyContactRelation ? String(payload.emergencyContactRelation).trim() : undefined,
    hasAppAccess: Boolean(payload.hasAppAccess),
    appUsername: payload.hasAppAccess ? String(payload.appUsername || payload.phoneNumber || "").trim() : undefined,
    appPassword: payload.hasAppAccess ? String(payload.appPassword || "").trim() : undefined,
    profilePhotoUrl: payload.profilePhotoUrl ?? null,
    notes: payload.notes ? String(payload.notes).trim() : undefined,
    adminUserId: adminUserId ? Number(adminUserId) : undefined,
    accessUser,
  };

  const res = (await postData<any>({
    url: apiConfig.employee.insertEmployeeUrl,
    body,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to create employee");
  }

  return res;
}

/**
 * 3. Update an existing employee profile.
 * Endpoint: POST /update-employees/{id}
 */
export async function updateEmployee(
  id: number,
  payload: Partial<EmployeeUpdatePayload>
): Promise<any> {
  const accessUser = buildAccessUser();
  const body = {
    ...payload,
    accessUser,
  };

  const res = (await postData<any>({
    url: `${apiConfig.employee.updateEmployeeUrl}/${id}`,
    body,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to update employee");
  }

  return res;
}

const LOCAL_STORAGE_PERMS_KEY = "cb_emp_branch_permissions";

export function getLocalEmployeeBranchPermissions(employeeId: number): any[] {
  if (typeof window === "undefined" || !employeeId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PERMS_KEY}_${employeeId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalEmployeeBranchPermission(record: any): void {
  if (typeof window === "undefined" || !record?.employeeId || !record?.id) return;
  const realId = Number(record.id);
  if (isNaN(realId) || realId <= 0) return;

  try {
    const employeeId = Number(record.employeeId);
    const branchId = Number(record.branchId);
    const current = getLocalEmployeeBranchPermissions(employeeId);
    const existingIdx = current.findIndex(
      (item: any) => Number(item.branchId || item.branch_id) === branchId
    );
    const perms = Array.isArray(record.permissions) ? record.permissions : [];
    const canView =
      record.canView !== undefined
        ? Boolean(record.canView)
        : perms.some((p: string) => p.includes("read") || p.includes("view")) || perms.length > 0;
    const canEdit =
      record.canEdit !== undefined
        ? Boolean(record.canEdit)
        : perms.some((p: string) => p.includes("create") || p.includes("update"));
    const canDelete =
      record.canDelete !== undefined
        ? Boolean(record.canDelete)
        : perms.some((p: string) => p.includes("delete"));

    const normalizedItem = {
      id: realId,
      employeeId,
      branchId,
      primary: Boolean(record.primary),
      canView,
      canEdit,
      canDelete,
      grantedBy: record.grantedBy ?? (existingIdx >= 0 ? current[existingIdx].grantedBy : null),
      permissions: perms,
      active: record.active !== false,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      current[existingIdx] = normalizedItem;
    } else {
      current.push(normalizedItem);
    }
    localStorage.setItem(`${LOCAL_STORAGE_PERMS_KEY}_${employeeId}`, JSON.stringify(current));

    // Also sync to branch-scoped active permissions
    if (branchId) {
      const val = JSON.stringify(normalizedItem.permissions);
      localStorage.setItem(`cb_branch_perms_${branchId}`, val);
      localStorage.setItem(`branch_perms_${branchId}`, val);
      sessionStorage.setItem(`cb_branch_perms_${branchId}`, val);
      sessionStorage.setItem(`branch_perms_${branchId}`, val);
    }
  } catch (err) {
    console.error("Failed to save local employee branch permission", err);
  }
}

export function removeLocalEmployeeBranchPermission(
  employeeId: number,
  permissionIdOrBranchId: number
): void {
  if (typeof window === "undefined" || !employeeId) return;
  try {
    const current = getLocalEmployeeBranchPermissions(employeeId);
    const filtered = current.filter(
      (item: any) =>
        Number(item.id) !== Number(permissionIdOrBranchId) &&
        Number(item.branchId || item.branch_id) !== Number(permissionIdOrBranchId)
    );
    localStorage.setItem(`${LOCAL_STORAGE_PERMS_KEY}_${employeeId}`, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to remove local employee branch permission", err);
  }
}

export async function createEmployeeBranchPermission(
  payload: EmployeeBranchPermissionPayload
): Promise<any> {
  const accessUser = buildAccessUser();
  const perms = Array.isArray(payload.permissions) ? payload.permissions : [];

  const canView =
    payload.canView !== undefined
      ? Boolean(payload.canView)
      : perms.some((p) => p.includes("read") || p.includes("view")) || perms.length > 0;
  const canEdit =
    payload.canEdit !== undefined
      ? Boolean(payload.canEdit)
      : perms.some((p) => p.includes("create") || p.includes("update"));
  const canDelete =
    payload.canDelete !== undefined
      ? Boolean(payload.canDelete)
      : perms.some((p) => p.includes("delete"));
  const primary = Boolean(payload.primary);
  const grantedBy =
    payload.grantedBy !== undefined ? payload.grantedBy : accessUser.userId || null;

  const employeeId = Number(payload.employeeId);
  const branchId = Number(payload.branchId);
  const organizationId = Number(payload.organizationId || accessUser.orgId);

  if (!employeeId || isNaN(employeeId)) {
    throw new Error("Invalid Employee ID. Please select a registered staff member.");
  }
  if (!branchId || isNaN(branchId)) {
    throw new Error("Invalid Branch ID. Please select an active branch.");
  }

  const body = {
    organizationId,
    employeeId,
    branchId,
    primary,
    canView,
    canEdit,
    canDelete,
    grantedBy,
    active: payload.active !== false,
    accessUser,
  };

  const res = (await postData<any>({
    url: apiConfig.employee.employeeBranchPermissionsUrl,
    body,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to assign branch permission in database");
  }

  const savedId = Number(res?.data?.id || res?.id);
  if (savedId && savedId > 0) {
    saveLocalEmployeeBranchPermission({
      id: savedId,
      employeeId,
      branchId,
      primary,
      canView,
      canEdit,
      canDelete,
      grantedBy,
      permissions: perms,
      active: payload.active !== false,
    });
  }

  return res;
}

/**
 * 5. Update existing employee branch permission.
 * Endpoint: POST /employee-branch-permissions/{id}/update
 */
export async function updateEmployeeBranchPermission(
  permissionId: number,
  payload: Partial<EmployeeBranchPermissionPayload>
): Promise<any> {
  const pId = Number(permissionId);
  if (!pId || isNaN(pId) || pId <= 0) {
    throw new Error("Invalid permission ID. Could not update record in database.");
  }

  const accessUser = buildAccessUser();
  const perms = Array.isArray(payload.permissions) ? payload.permissions : undefined;

  let canView = payload.canView;
  let canEdit = payload.canEdit;
  let canDelete = payload.canDelete;

  if (perms) {
    if (canView === undefined) {
      canView = perms.some((p) => p.includes("read") || p.includes("view")) || perms.length > 0;
    }
    if (canEdit === undefined) {
      canEdit = perms.some((p) => p.includes("create") || p.includes("update"));
    }
    if (canDelete === undefined) {
      canDelete = perms.some((p) => p.includes("delete"));
    }
  }

  const grantedBy =
    payload.grantedBy !== undefined ? payload.grantedBy : accessUser.userId || null;

  const employeeId = Number(payload.employeeId);
  const branchId = Number(payload.branchId);

  const body = {
    ...(employeeId ? { employeeId } : {}),
    ...(branchId ? { branchId } : {}),
    ...(canView !== undefined ? { canView: Boolean(canView) } : {}),
    ...(canEdit !== undefined ? { canEdit: Boolean(canEdit) } : {}),
    ...(canDelete !== undefined ? { canDelete: Boolean(canDelete) } : {}),
    ...(payload.primary !== undefined ? { primary: Boolean(payload.primary) } : {}),
    grantedBy,
    accessUser,
  };

  const res = (await postData<any>({
    url: `${apiConfig.employee.employeeBranchPermissionsUrl}/${pId}/update`,
    body,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to update branch permission in database");
  }

  if (employeeId && branchId) {
    saveLocalEmployeeBranchPermission({
      id: pId,
      employeeId,
      branchId,
      primary: payload.primary,
      canView,
      canEdit,
      canDelete,
      grantedBy,
      permissions: perms || [],
      active: payload.active !== false,
    });
  }

  return res;
}

/**
 * 6. Revoke / delete branch permission for an employee.
 * Endpoint: DELETE /employee-branch-permissions/{id}
 */
export async function deleteEmployeeBranchPermission(
  permissionId: number,
  employeeId?: number
): Promise<any> {
  const pId = Number(permissionId);
  if (!pId || isNaN(pId) || pId <= 0) {
    throw new Error("Invalid permission ID. Could not remove record from database.");
  }

  const res = (await deleteData<any>({
    url: `${apiConfig.employee.employeeBranchPermissionsUrl}/${pId}`,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to remove branch permission from database");
  }

  if (employeeId) {
    removeLocalEmployeeBranchPermission(employeeId, pId);
  }

  return res;
}

/**
 * 7. Fetch an employee's assigned branch permissions.
 * Endpoint: GET /employee/{employeeId}/branch-permissions
 * Single Source of Truth: Central Database
 */
export async function getEmployeeBranchPermissions(employeeId: number): Promise<any[]> {
  if (!employeeId) return [];

  let apiList: any[] | null = null;
  try {
    const res = (await getData<any>({
      url: `${apiConfig.employee.getEmployeeBranchPermissionsUrl}/${employeeId}/branch-permissions`,
    })) as any;

    if (Array.isArray(res?.data)) apiList = res.data;
    else if (Array.isArray(res)) apiList = res;
  } catch (err) {
    console.warn("Failed to fetch employee branch permissions from database:", err);
  }

  // Database is the absolute single source of truth
  if (apiList !== null) {
    const normalized = apiList.map((p) => {
      const bId = Number(p.branchId || p.branch_id);
      const canView = p.canView !== undefined ? Boolean(p.canView) : true;
      const canEdit = p.canEdit !== undefined ? Boolean(p.canEdit) : false;
      const canDelete = p.canDelete !== undefined ? Boolean(p.canDelete) : false;

      // Synthesize standard granular keys for UI matrix
      let perms = Array.isArray(p.permissions) ? [...p.permissions] : [];
      if (perms.length === 0) {
        if (canView) {
          perms.push(...getReadOnlyPermissionKeys());
        }
        if (canEdit) {
          perms.push(
            ...PERMISSION_MODULES.flatMap((m) => [
              buildPermissionKey(m.id, "create"),
              buildPermissionKey(m.id, "update"),
            ]),
            "banking:create",
            "banking:update",
            "accounts:create",
            "accounts:update"
          );
        }
        if (canDelete) {
          perms.push(
            ...PERMISSION_MODULES.map((m) => buildPermissionKey(m.id, "delete")),
            "banking:delete",
            "accounts:delete"
          );
        }
      }

      return {
        id: Number(p.id),
        employeeId: Number(p.employeeId || employeeId),
        branchId: bId,
        primary: Boolean(p.primary),
        canView,
        canEdit,
        canDelete,
        grantedBy: p.grantedBy ?? null,
        grantedAt: p.grantedAt ?? null,
        permissions: perms,
        active: p.active !== false,
      };
    });

    // Update verified database records in cache and sync active branch-scoped permissions
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${LOCAL_STORAGE_PERMS_KEY}_${employeeId}`, JSON.stringify(normalized));
        normalized.forEach((item) => {
          if (item.branchId) {
            const val = JSON.stringify(item.permissions);
            localStorage.setItem(`branch_perms_${item.branchId}`, val);
            localStorage.setItem(`cb_branch_perms_${item.branchId}`, val);
            sessionStorage.setItem(`branch_perms_${item.branchId}`, val);
            sessionStorage.setItem(`cb_branch_perms_${item.branchId}`, val);
          }
        });
      } catch {}
    }

    return normalized;
  }

  // Fallback to cache only if network completely failed
  return getLocalEmployeeBranchPermissions(employeeId);
}

/**
 * Automatically sync the currently logged-in employee's branch permissions from PostgreSQL.
 */
export async function syncCurrentEmployeePermissions(): Promise<any[]> {
  if (typeof window === "undefined") return [];
  const userInfo = getUserInfo();
  const empId = Number(userInfo?.employeeId || (userInfo as any)?.userId);
  if (!empId || isNaN(empId) || empId <= 0) return [];

  try {
    return await getEmployeeBranchPermissions(empId);
  } catch (err) {
    console.warn("Could not sync current employee branch permissions:", err);
    return [];
  }
}

/**
 * 8. Fetch organization-level role permissions catalog.
 * Endpoint: GET /organization/{organizationId}/permissions
 */
export async function getOrganizationPermissions(organizationId?: number): Promise<any[]> {
  const accessUser = buildAccessUser();
  const orgId = organizationId || accessUser.orgId;

  const res = (await getData<any>({
    url: `${apiConfig.employee.getOrganizationPermissionsUrl}/${orgId}/permissions`,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to load organization permissions");
  }

  return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
}

/**
 * 9. Fetch branch-specific permission settings.
 * Endpoint: GET /branch/{branchId}/permissions
 */
export async function getBranchPermissions(branchId: number): Promise<any> {
  const res = (await getData<any>({
    url: `${apiConfig.employee.getBranchPermissionsUrl}/${branchId}/permissions`,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to load branch permissions");
  }

  return res?.data ?? res ?? null;
}

