import { getUserInfo, getStoredUser, setUserInfo, getActiveBranchId, setActiveBranchId } from "./auth-storage";
import type { BranchItem } from "@/types/branch.types";

export { getActiveBranchId, setActiveBranchId };

export const STORAGE_KEY_BRANCH_CHOSEN = "branch_choice_made";

// Keys that are branch-specific and must be cleared when switching branches
export const BRANCH_SCOPED_KEYS = [
  "sales_draft",
  "purchase_draft",
  "last_invoice",
  "last_purchase_invoice",
];

export function toId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normaliseBranch(b: any = {}): BranchItem {
  const branchId = toId(b.id ?? b.branchId) || 0;
  return {
    id: branchId,
    branchId: branchId,
    orgId: toId(b.orgId ?? b.organizationId) || 0,
    name: b.name || b.branchName || "",
    code: b.code || b.branchCode || "",
    address: b.address || "",
    phone: b.phone || "",
    currency: b.currency || "BDT",
    openingBalance: Number(b.openingBalance ?? 0),
    openingDate: b.openingDate ? String(b.openingDate).slice(0, 10) : "",
    active: b.active !== false,
    categoryCopy: Boolean(b.categoryCopy),
    productCopy: Boolean(b.productCopy),
    partyCopy: Boolean(b.partyCopy),
    bankCopy: Boolean(b.bankCopy),
    mfsCopy: Boolean(b.mfsCopy),
    copyBranchId: toId(b.copyBranchId ?? b.copybranchId),
    primary: Boolean(b.primary),
  };
}

export function getStoredBranches(): BranchItem[] {
  if (typeof window === "undefined") return [];
  const userInfo = getUserInfo();
  const list = userInfo?.branches;
  if (!Array.isArray(list)) return [];
  return list
    .map(normaliseBranch)
    .filter((b) => b.branchId !== 0);
}

export function setStoredBranches(branches: BranchItem[]): void {
  if (typeof window === "undefined") return;
  const userInfo = getUserInfo();
  if (!userInfo) return;
  setUserInfo({
    ...userInfo,
    branches,
  });
}

export function getDefaultBranchId(): number | null {
  const userInfo = getUserInfo();
  return toId(userInfo?.branchId);
}

export function isMultiBranch(): boolean {
  if (isUserAdmin()) {
    const userInfo = getUserInfo();
    const branches = getStoredBranches();
    const branchType = String(userInfo?.branchType || "").toUpperCase();
    return branchType === "MULTIPLE" || branches.length > 1;
  }
  // For non-admin employees, check their strictly permitted branches count
  const permittedIds = getUserPermittedBranchIds();
  return permittedIds !== null && permittedIds.size > 1;
}

export function isBranchChoicePending(): boolean {
  if (typeof window === "undefined") return false;
  if (!isMultiBranch()) return false;
  const made = localStorage.getItem(STORAGE_KEY_BRANCH_CHOSEN) || sessionStorage.getItem(STORAGE_KEY_BRANCH_CHOSEN);
  return made !== "1";
}

export function markBranchChosen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_BRANCH_CHOSEN, "1");
  sessionStorage.setItem(STORAGE_KEY_BRANCH_CHOSEN, "1");
}

export function clearBranchChoice(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_BRANCH_CHOSEN);
  sessionStorage.removeItem(STORAGE_KEY_BRANCH_CHOSEN);
}

export function clearAllBranchScoped(): void {
  if (typeof window === "undefined") return;
  BRANCH_SCOPED_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function isUserAdmin(): boolean {
  const userInfo = getUserInfo();
  const storedUser = getStoredUser();

  // Explicitly marked employees are never admins
  if (userInfo?.isEmployee || (userInfo as any)?.employeeId) {
    return false;
  }

  const role = String(
    userInfo?.userRole ||
    (userInfo as any)?.role ||
    storedUser?.role ||
    ""
  ).toUpperCase();

  if (
    role === "ADMIN" ||
    role === "OWNER" ||
    role === "SUPERADMIN" ||
    role === "MASTER" ||
    role === "BUSINESS_OWNER"
  ) {
    return true;
  }

  // Non-admin roles (e.g. MANAGER, CASHIER, EMPLOYEE, STAFF) are never admins
  if (
    role === "EMPLOYEE" ||
    role === "STAFF" ||
    role === "MANAGER" ||
    role === "CASHIER" ||
    role === "OPERATOR" ||
    role === "ACCOUNTANT"
  ) {
    return false;
  }

  // Fallback: If account type is Personal/Business without any employee indicator and role is empty/admin
  if (!role && (userInfo?.accountType === "Personal" || userInfo?.accountType === "Business")) {
    return true;
  }

  return false;
}

/**
 * Returns set of branch IDs that the logged-in user is strictly permitted to access.
 * Admins/Owners have access to all organization branches.
 * Employees/Staff have access ONLY to branches assigned to their account.
 */
export function getUserPermittedBranchIds(): Set<number> | null {
  if (isUserAdmin()) return null; // null represents all branches allowed

  const userInfo = getUserInfo();
  const permitted = new Set<number>();

  if (Array.isArray(userInfo?.branches)) {
    userInfo.branches.forEach((b: any) => {
      const id = toId(b.id ?? b.branchId);
      if (id) permitted.add(id);
    });
  }

  const defaultId = toId(userInfo?.branchId);
  if (defaultId) permitted.add(defaultId);

  return permitted;
}

/**
 * Checks if the current user has permission to view or switch to the given branchId.
 */
export function isBranchPermitted(branchId: number): boolean {
  const permittedIds = getUserPermittedBranchIds();
  if (permittedIds === null) return true; // Admin has full access
  return permittedIds.has(Number(branchId));
}

/**
 * Filters any list of branches to strictly only include branches the user has permission to access.
 */
export function filterBranchesByPermission(branches: BranchItem[]): BranchItem[] {
  const permittedIds = getUserPermittedBranchIds();
  if (permittedIds === null) return branches; // Admin sees all active
  return branches.filter((b) => permittedIds.has(b.branchId));
}

export function switchBranch(branchId: number): void {
  if (typeof window === "undefined") return;

  // Strict Permission Check: Only switch if user is permitted to access this branch
  if (!isBranchPermitted(branchId)) {
    console.error(`Access Denied: You do not have permission to access Branch #${branchId}`);
    return;
  }

  setActiveBranchId(branchId);
  markBranchChosen();
  clearAllBranchScoped();
  
  // Reload and navigate to admin root so all memory caches and branch data reset cleanly
  window.location.assign("/admin");
}

export function getActiveBranch(): BranchItem | null {
  const activeId = getActiveBranchId();
  if (activeId === null) return null;
  const branches = getStoredBranches();
  return branches.find((b) => b.branchId === activeId) || null;
}
