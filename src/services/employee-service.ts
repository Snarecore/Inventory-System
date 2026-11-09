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

/**
 * Accurately determines if an employee record is Active or Inactive.
 * Handles all backend variations: boolean flags, numeric 1/0, status strings ("ACTIVE", "INACTIVE", etc.).
 */
export function isEmployeeActive(emp: any): boolean {
  if (!emp) return false;

  // 1. Check explicit status string/value if present
  if (emp.status !== undefined && emp.status !== null) {
    const s = String(emp.status).trim().toLowerCase();
    if (s === "inactive" || s === "false" || s === "0" || s === "disabled" || s === "suspended") {
      return false;
    }
    if (s === "active" || s === "true" || s === "1" || s === "enabled") {
      return true;
    }
  }

  // 2. Check boolean / numeric / string flags for active
  if (emp.active !== undefined && emp.active !== null) {
    if (emp.active === false || emp.active === 0 || emp.active === "0" || emp.active === "false") {
      return false;
    }
    if (emp.active === true || emp.active === 1 || emp.active === "1" || emp.active === "true") {
      return true;
    }
  }

  // 3. Check isActive
  if (emp.isActive !== undefined && emp.isActive !== null) {
    if (emp.isActive === false || emp.isActive === 0 || emp.isActive === "0" || emp.isActive === "false") {
      return false;
    }
    if (emp.isActive === true || emp.isActive === 1 || emp.isActive === "1" || emp.isActive === "true") {
      return true;
    }
  }

  // 4. Check is_active
  if (emp.is_active !== undefined && emp.is_active !== null) {
    if (emp.is_active === false || emp.is_active === 0 || emp.is_active === "0" || emp.is_active === "false") {
      return false;
    }
    if (emp.is_active === true || emp.is_active === 1 || emp.is_active === "1" || emp.is_active === "true") {
      return true;
    }
  }

  return true;
}

const LOCAL_STORAGE_STATUS_KEY = "cb_employee_status_override";

export function getLocalEmployeeStatusMap(): Record<number, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalEmployeeStatus(employeeId: number, active: boolean): void {
  if (typeof window === "undefined" || !employeeId) return;
  try {
    const map = getLocalEmployeeStatusMap();
    map[Number(employeeId)] = Boolean(active);
    localStorage.setItem(LOCAL_STORAGE_STATUS_KEY, JSON.stringify(map));
  } catch {}
}

export async function getEmployeeList(organizationId?: number): Promise<EmployeeItem[]> {
  const accessUser = buildAccessUser();
  const userInfo = getUserInfo();
  const storedUser = getStoredUser();
  const orgId =
    organizationId ||
    accessUser.orgId ||
    userInfo?.orgId ||
    (userInfo as any)?.organizationId ||
    (storedUser as any)?.orgId ||
    (storedUser as any)?.organizationId ||
    (Array.isArray(userInfo?.branches) && userInfo.branches.length > 0 ? userInfo.branches[0].orgId : 0);

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

  const localStatusMap = getLocalEmployeeStatusMap();

  const normalizedList: EmployeeItem[] = rawList.map((emp) => {
    const empId = Number(emp.id || emp.employeeId);
    let active = isEmployeeActive(emp);

    if (empId && localStatusMap[empId] !== undefined) {
      active = localStatusMap[empId];
    }

    return {
      ...emp,
      id: empId || emp.id,
      active,
      status: active ? "ACTIVE" : "INACTIVE",
      isActive: active,
      is_active: active ? 1 : 0,
    };
  });

  return normalizedList;
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
  const empId = Number(id);

  let activeVal: boolean | undefined = undefined;
  if (payload.active !== undefined) {
    activeVal = Boolean(payload.active);
  } else if (payload.status !== undefined) {
    const s = String(payload.status).trim().toLowerCase();
    activeVal = s === "active" || s === "true" || s === "1";
  } else if (payload.isActive !== undefined) {
    activeVal = Boolean(payload.isActive);
  } else if (payload.is_active !== undefined) {
    activeVal = Boolean(payload.is_active);
  }

  if (activeVal !== undefined && empId) {
    saveLocalEmployeeStatus(empId, activeVal);
  }

  const body = {
    ...payload,
    ...(activeVal !== undefined
      ? {
          active: activeVal,
          status: activeVal ? "ACTIVE" : "INACTIVE",
          isActive: activeVal,
          is_active: activeVal ? 1 : 0,
        }
      : {}),
    accessUser,
  };

  const res = (await postData<any>({
    url: `${apiConfig.employee.updateEmployeeUrl}/${empId}`,
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
      try {
        window.dispatchEvent(new Event("permissions-updated"));
      } catch {}
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
    permissions: perms,
    permissionKeys: perms,
    permissionsJson: JSON.stringify(perms),
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

  const savedId = Number(
    res?.data?.id || res?.id || res?.data?.permissionId || res?.insertId || Date.now()
  );
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
    ...(perms !== undefined
      ? {
          permissions: perms,
          permissionKeys: perms,
          permissionsJson: JSON.stringify(perms),
        }
      : {}),
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
      let perms: string[] = [];
      if (Array.isArray(p.permissions)) {
        perms = [...p.permissions];
      } else if (typeof p.permissions === "string" && p.permissions.trim()) {
        try {
          const parsed = JSON.parse(p.permissions);
          if (Array.isArray(parsed)) perms = parsed;
        } catch {}
      }

      // Check if local cache has explicit granular permissions if backend returned empty array/null
      if (perms.length === 0) {
        const localList = getLocalEmployeeBranchPermissions(employeeId);
        const localMatch = localList.find((l: any) => Number(l.branchId || l.branch_id) === bId);
        if (localMatch && Array.isArray(localMatch.permissions) && localMatch.permissions.length > 0) {
          perms = [...localMatch.permissions];
        }
      }

      // Fallback synthesis only if no granular permissions were ever specified
      if (perms.length === 0 && (canView || canEdit || canDelete)) {
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
        window.dispatchEvent(new Event("permissions-updated"));
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

