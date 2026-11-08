import { getUserInfo, getActiveBranchId } from "./auth-storage";
import { isUserAdmin } from "./branch-storage";

export type CrudAction = "read" | "create" | "update" | "delete";

export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  category: "Trade" | "Finance" | "Inventory" | "People" | "Reports";
  actions: CrudAction[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "sales",
    name: "Sales & Invoices",
    description: "POS billing, sales invoices, collections and customer sales returns",
    category: "Trade",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "purchase",
    name: "Purchases & Suppliers",
    description: "Purchase bills, goods received, purchase returns and supplier payments",
    category: "Trade",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "inventory",
    name: "Inventory & Stock",
    description: "Product inventory, stock adjustments, warehouses and stock counts",
    category: "Inventory",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "parties",
    name: "Customers & Suppliers",
    description: "Customer directories, supplier accounts, party ledger and balances",
    category: "People",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "accounts",
    name: "Khatabook & Banking",
    description: "Daily cash closing, bank & MFS transfers, payment and receipt vouchers",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    description: "Daily sales summaries, purchase audits, stock valuation and ledger statements",
    category: "Reports",
    actions: ["read"],
  },
];

/**
 * Storage key for active branch permissions
 */
export const STORAGE_KEY_BRANCH_PERMS_PREFIX = "branch_perms_";

/**
 * Helper to build permission key string.
 * Standard format: "module:action" (e.g. "sales:create", "purchase:delete")
 */
export function buildPermissionKey(module: string, action: CrudAction): string {
  return `${module.toLowerCase().trim()}:${action.toLowerCase().trim()}`;
}

/**
 * Generates all possible permission keys in the system.
 */
export function getAllSystemPermissionKeys(): string[] {
  const keys: string[] = [];
  PERMISSION_MODULES.forEach((mod) => {
    mod.actions.forEach((act) => {
      keys.push(buildPermissionKey(mod.id, act));
    });
  });
  return keys;
}

/**
 * Returns permissions for "Standard Operator / Staff"
 * (Read, Create, and Update for operational modules, NO Delete permission)
 */
export function getOperatorPermissionKeys(): string[] {
  const keys: string[] = [];
  PERMISSION_MODULES.forEach((mod) => {
    mod.actions.forEach((act) => {
      if (act !== "delete") {
        keys.push(buildPermissionKey(mod.id, act));
      }
    });
  });
  return keys;
}

/**
 * Returns permissions for "Read Only / Auditor" (Read only across all modules)
 */
export function getReadOnlyPermissionKeys(): string[] {
  return PERMISSION_MODULES.map((mod) => buildPermissionKey(mod.id, "read"));
}

/**
 * Returns permissions for "Cashier / POS"
 * (Read & Create for Sales and Parties, Read for Accounts & Reports)
 */
export function getCashierPermissionKeys(): string[] {
  return [
    buildPermissionKey("sales", "read"),
    buildPermissionKey("sales", "create"),
    buildPermissionKey("parties", "read"),
    buildPermissionKey("parties", "create"),
    buildPermissionKey("accounts", "read"),
    buildPermissionKey("reports", "read"),
  ];
}

/**
 * Returns the active user's permissions array for the active branch.
 */
export function getActiveUserPermissions(): string[] {
  if (typeof window === "undefined") return [];

  // Super Admin / Owner has all permissions
  if (isUserAdmin()) {
    return getAllSystemPermissionKeys();
  }

  const activeBranchId = getActiveBranchId();
  if (!activeBranchId) return [];

  // Check branch-specific cached permissions
  try {
    const raw =
      localStorage.getItem(`${STORAGE_KEY_BRANCH_PERMS_PREFIX}${activeBranchId}`) ||
      sessionStorage.getItem(`${STORAGE_KEY_BRANCH_PERMS_PREFIX}${activeBranchId}`) ||
      localStorage.getItem(`cb_branch_perms_${activeBranchId}`) ||
      sessionStorage.getItem(`cb_branch_perms_${activeBranchId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }

  // Fall back to userInfo.permissions if available
  const userInfo = getUserInfo();
  if (Array.isArray((userInfo as any)?.permissions)) {
    return (userInfo as any).permissions;
  }

  // Check employee branch cache if employeeId is present
  const employeeId = (userInfo as any)?.employeeId || (userInfo as any)?.userId || (userInfo as any)?.id;
  if (employeeId) {
    try {
      const rawEmp = localStorage.getItem(`cb_emp_branch_permissions_${employeeId}`);
      if (rawEmp) {
        const list = JSON.parse(rawEmp);
        const match = Array.isArray(list)
          ? list.find((item: any) => Number(item.branchId || item.branch_id) === Number(activeBranchId))
          : null;
        if (match) {
          const perms: string[] = Array.isArray(match.permissions) && match.permissions.length > 0 ? [...match.permissions] : [];
          if (perms.length === 0) {
            if (match.canView) {
              perms.push("sales:read", "purchase:read", "inventory:read", "parties:read", "accounts:read", "reports:read");
            }
            if (match.canEdit) {
              perms.push("sales:create", "sales:update", "purchase:create", "purchase:update", "inventory:create", "inventory:update", "parties:create", "parties:update", "accounts:create", "accounts:update");
            }
            if (match.canDelete) {
              perms.push("sales:delete", "purchase:delete", "inventory:delete", "parties:delete", "accounts:delete");
            }
          }
          if (perms.length > 0) return perms;
        }
      }
    } catch {}
  }

  // If user has no specific permissions defined, deny by default
  return [];
}

/**
 * Saves permissions for a specific branch in local cache.
 */
export function setActiveBranchPermissions(branchId: number, permissions: string[]): void {
  if (typeof window === "undefined") return;
  const val = JSON.stringify(permissions);
  localStorage.setItem(`${STORAGE_KEY_BRANCH_PERMS_PREFIX}${branchId}`, val);
  sessionStorage.setItem(`${STORAGE_KEY_BRANCH_PERMS_PREFIX}${branchId}`, val);
  localStorage.setItem(`cb_branch_perms_${branchId}`, val);
  sessionStorage.setItem(`cb_branch_perms_${branchId}`, val);
  try {
    window.dispatchEvent(new Event("permissions-updated"));
  } catch {}
}

/**
 * Core Permission Check function.
 * Evaluates whether the current user is allowed to perform a specific action on a module.
 *
 * @param action "read" | "create" | "update" | "delete"
 * @param module e.g. "sales", "purchase", "inventory", "parties", "accounts", "reports"
 * @param permissions Optional array of permissions (defaults to active user's permissions)
 */
export function hasPermission(
  action: CrudAction,
  module: string,
  permissions?: string[]
): boolean {
  // 1. Admins & Owners ALWAYS have full CRUD permissions
  if (isUserAdmin()) return true;

  const userPerms = permissions || getActiveUserPermissions();
  if (!userPerms || userPerms.length === 0) return false;

  const targetColon = buildPermissionKey(module, action);
  const targetDot = `${module.toLowerCase()}.${action.toLowerCase()}`;
  const targetUnderscore = `${module.toLowerCase()}_${action.toLowerCase()}`;

  // Wildcard checks
  if (userPerms.includes("*") || userPerms.includes(`${module.toLowerCase()}:*`)) {
    return true;
  }

  return (
    userPerms.includes(targetColon) ||
    userPerms.includes(targetDot) ||
    userPerms.includes(targetUnderscore)
  );
}
