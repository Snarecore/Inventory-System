import { getUserInfo, getActiveBranchId } from "./auth-storage";
import { isUserAdmin } from "./branch-storage";

export type CrudAction = "read" | "create" | "update" | "delete";

export type SidebarSectionCategory =
  | "Main"
  | "Categories"
  | "Trade"
  | "Inventory"
  | "People"
  | "Finance"
  | "Reports & Approvals"
  | "Administration & Settings"
  | "Account";

export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  category: SidebarSectionCategory;
  actions: CrudAction[];
}

/**
 * All system modules aligned 100% directly with the Sidebar menus & submenus
 */
export const PERMISSION_MODULES: PermissionModule[] = [
  // ==========================================
  // --- 1. Main Section ---
  // ==========================================
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Main analytics dashboard, business performance and metrics",
    category: "Main",
    actions: ["read"],
  },

  // ==========================================
  // --- 2. Categories Section ---
  // ==========================================
  {
    id: "category_product",
    name: "Product Category",
    description: "Manage product categories and sub-categories",
    category: "Categories",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "category_finance",
    name: "Expense & Income Category",
    description: "Manage financial expense and income heads/categories",
    category: "Categories",
    actions: ["read", "create", "update", "delete"],
  },

  // ==========================================
  // --- 3. Trade Section ---
  // ==========================================
  {
    id: "sales",
    name: "Sales",
    description: "POS billing, sales invoices, sales list and orders",
    category: "Trade",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "sales_return",
    name: "Sales Return",
    description: "Customer sales returns, credit notes and returned items",
    category: "Trade",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "customer_collection",
    name: "Customer Collection",
    description: "Customer receivables, installments and collection receipts",
    category: "Trade",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "purchase",
    name: "Purchase",
    description: "Purchase bills, purchase list, orders and inward entries",
    category: "Trade",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "purchase_return",
    name: "Purchase Return",
    description: "Supplier purchase returns and debit notes",
    category: "Trade",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "supplier_payment",
    name: "Supplier Payment",
    description: "Payable settlements and supplier payment vouchers",
    category: "Trade",
    actions: ["read", "create", "update", "delete"],
  },

  // ==========================================
  // --- 4. Inventory Section ---
  // ==========================================
  {
    id: "product",
    name: "Product",
    description: "Product catalog, items, pricing and inventory units",
    category: "Inventory",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "stock_adjustment",
    name: "Stock Adjustment",
    description: "Stock audits, physical count corrections and damage adjustments",
    category: "Inventory",
    actions: ["read", "create", "update", "delete"],
  },

  // ==========================================
  // --- 5. People Section ---
  // ==========================================
  {
    id: "employee",
    name: "Employee",
    description: "Employee directory, designations and staff access",
    category: "People",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "parties",
    name: "Parties",
    description: "All parties, customers, suppliers and party ledgers",
    category: "People",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "sms",
    name: "Send SMS",
    description: "Single and bulk SMS campaigns to customers & suppliers",
    category: "People",
    actions: ["read", "create"],
  },

  // ==========================================
  // --- 6. Finance Section ---
  // ==========================================
  {
    id: "khatabook",
    name: "Dena Pawna",
    description: "Customer and supplier dena pawna ledgers",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "bank",
    name: "Bank Accounts",
    description: "Bank accounts, bank deposits and withdrawals",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "mfs",
    name: "MFS Accounts",
    description: "Mobile Financial Services (bKash, Nagad, Rocket, Upay)",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "income",
    name: "Income",
    description: "Income entries, receipts and income tracking",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "expense",
    name: "Expense",
    description: "Expense vouchers, expense records and operational costs",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "fund_transfer",
    name: "Fund Transfer",
    description: "Fund transfers between Cash, Bank, and MFS accounts",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "opening_cash",
    name: "Opening Cash Balance",
    description: "Branch drawer opening cash and balance configuration",
    category: "Finance",
    actions: ["read", "create", "update"],
  },
  {
    id: "cash_closing",
    name: "Daily Cash Closing",
    description: "Daily drawer reconciliation and cash closing vouchers",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "coa_vouchers",
    name: "Vouchers & General Ledger",
    description: "Chart of Accounts, Journal, Payment, Receipt, Contra vouchers, General Ledger and Bank Reconciliation",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "tax",
    name: "Tax / VAT",
    description: "VAT configuration, sales tax, purchase tax and TDS",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "assets",
    name: "Assets",
    description: "Fixed asset register, purchase, transfer, depreciation and disposal",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "budget",
    name: "Budget",
    description: "Budget setup, cost centers, profit centers, and budget vs actual",
    category: "Finance",
    actions: ["read", "create", "update", "delete"],
  },

  // ==========================================
  // --- 7. Reports & Approvals Section ---
  // ==========================================
  {
    id: "reports",
    name: "Reports",
    description: "Sales, purchase, inventory, customer, supplier, accounting, tax reports and financial statements",
    category: "Reports & Approvals",
    actions: ["read"],
  },
  {
    id: "approvals",
    name: "Approvals",
    description: "Pending approvals for sales, purchase, payments, expenses, inventory",
    category: "Reports & Approvals",
    actions: ["read", "update"],
  },

  // ==========================================
  // --- 8. Administration & Settings Section ---
  // ==========================================
  {
    id: "administration",
    name: "Administration",
    description: "Financial Year, numbering, system users, workflow, notifications and audit log",
    category: "Administration & Settings",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "business_profile",
    name: "Business Profile",
    description: "Company identity, logo, address and branding setup",
    category: "Administration & Settings",
    actions: ["update"],
  },
  {
    id: "branch_management",
    name: "Branch Management",
    description: "Branch list, create branch, branch profile and store locations",
    category: "Administration & Settings",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "role_management",
    name: "Role Management",
    description: "Staff roles, branch assignments and system permissions",
    category: "Administration & Settings",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "appearance",
    name: "Appearance",
    description: "Theme colors, dark mode and brand visual styling",
    category: "Administration & Settings",
    actions: ["update"],
  },
  {
    id: "website_cms",
    name: "Website CMS",
    description: "Home page, shop page, header-footer, contact page and policy CMS content",
    category: "Administration & Settings",
    actions: ["update"],
  },
  {
    id: "subscription_packages",
    name: "Subscription Packages",
    description: "Software subscription plans, renewals and package tiers",
    category: "Administration & Settings",
    actions: ["read", "update"],
  },
  {
    id: "system_settings",
    name: "System Settings",
    description: "General system options, currency, timezone and formats",
    category: "Administration & Settings",
    actions: ["update"],
  },
  {
    id: "payment_methods",
    name: "Payment Methods",
    description: "Supported POS & online payment gateways and accepted methods",
    category: "Administration & Settings",
    actions: ["read", "create", "update", "delete"],
  },
  {
    id: "sms_bundle",
    name: "SMS Bundles",
    description: "SMS packages, bundle purchases and SMS balance recharge",
    category: "Administration & Settings",
    actions: ["read", "create"],
  },
  {
    id: "integrations",
    name: "Email & Integrations",
    description: "SMTP email settings, API integrations and third-party webhooks",
    category: "Administration & Settings",
    actions: ["update"],
  },

  // ==========================================
  // --- 9. Account Section ---
  // ==========================================
  {
    id: "my_profile",
    name: "My Profile",
    description: "User account profile, password change and personal preferences",
    category: "Account",
    actions: ["read", "update"],
  },
];

export const STORAGE_KEY_BRANCH_PERMS_PREFIX = "branch_perms_";

// In-memory permission cache for active session
const inMemoryBranchPermissions: Map<number, string[]> = new Map();
const inMemoryEmployeePermissions: Map<number, any[]> = new Map();

export function setInMemoryEmployeeBranchPermissions(employeeId: number, records: any[]): void {
  if (!employeeId || !Array.isArray(records)) return;
  const empId = Number(employeeId);
  inMemoryEmployeePermissions.set(empId, records);

  records.forEach((rec) => {
    const bId = Number(rec.branchId || rec.branch_id);
    if (bId && Array.isArray(rec.permissions)) {
      inMemoryBranchPermissions.set(bId, [...rec.permissions]);
    }
  });

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("permissions-updated"));
    } catch {}
  }
}

export function getInMemoryEmployeeBranchPermissions(employeeId: number): any[] {
  if (!employeeId) return [];
  return inMemoryEmployeePermissions.get(Number(employeeId)) || [];
}

export function removeInMemoryEmployeeBranchPermission(
  employeeId: number,
  permissionIdOrBranchId: number
): void {
  if (!employeeId) return;
  const empId = Number(employeeId);
  const current = inMemoryEmployeePermissions.get(empId) || [];
  const targetId = Number(permissionIdOrBranchId);

  const filtered = targetId > 0
    ? current.filter(
        (item: any) =>
          Number(item.id) !== targetId &&
          Number(item.branchId || item.branch_id) !== targetId
      )
    : [];

  if (filtered.length > 0) {
    inMemoryEmployeePermissions.set(empId, filtered);
  } else {
    inMemoryEmployeePermissions.delete(empId);
  }

  if (targetId > 0) {
    inMemoryBranchPermissions.delete(targetId);
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("permissions-updated"));
    } catch {}
  }
}

export function clearInMemoryPermissions(): void {
  inMemoryBranchPermissions.clear();
  inMemoryEmployeePermissions.clear();
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("permissions-updated"));
    } catch {}
  }
}

// Purge legacy storage keys from previous versions
export function purgeInsecurePermissionStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const isTargetKey = (k: string) =>
      k.startsWith("branch_perms_") ||
      k.startsWith("cb_branch_perms_") ||
      k.startsWith("cb_emp_branch_permissions_") ||
      k === "cb_employee_status_override";

    if (window.localStorage) {
      const localKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isTargetKey(key)) {
          localKeys.push(key);
        }
      }
      localKeys.forEach((k) => localStorage.removeItem(k));
    }

    if (window.sessionStorage) {
      const sessionKeys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && isTargetKey(key)) {
          sessionKeys.push(key);
        }
      }
      sessionKeys.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch (err) {
    console.warn("Failed to purge legacy permission storage:", err);
  }
}

// Auto-purge legacy keys and reset on logout
if (typeof window !== "undefined") {
  purgeInsecurePermissionStorage();
  window.addEventListener("auth-logout", () => {
    clearInMemoryPermissions();
  });
}

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
 * (Read, Create, and Update for operational modules, NO Delete permission, no employee management)
 */
export function getOperatorPermissionKeys(): string[] {
  const sensitiveModules = [
    "employee",
    "branch_management",
    "tax",
    "assets",
    "budget",
    "approvals",
    "administration",
    "role_management",
    "subscription_packages",
    "system_settings",
    "website_cms",
    "business_profile",
    "appearance",
  ];
  const keys: string[] = [];
  PERMISSION_MODULES.forEach((mod) => {
    if (sensitiveModules.includes(mod.id)) return;
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
  return PERMISSION_MODULES.filter((mod) => mod.actions.includes("read")).map((mod) =>
    buildPermissionKey(mod.id, "read")
  );
}

/**
 * Returns permissions for "Cashier / POS"
 * (Read & Create for Sales, Return, Collection, Parties, Khatabook, Income, Expense, Cash Closing, and Read for Product, Bank, MFS, Reports)
 */
export function getCashierPermissionKeys(): string[] {
  return [
    buildPermissionKey("dashboard", "read"),
    buildPermissionKey("sales", "read"),
    buildPermissionKey("sales", "create"),
    buildPermissionKey("sales_return", "read"),
    buildPermissionKey("sales_return", "create"),
    buildPermissionKey("customer_collection", "read"),
    buildPermissionKey("customer_collection", "create"),
    buildPermissionKey("product", "read"),
    buildPermissionKey("parties", "read"),
    buildPermissionKey("parties", "create"),
    buildPermissionKey("khatabook", "read"),
    buildPermissionKey("khatabook", "create"),
    buildPermissionKey("bank", "read"),
    buildPermissionKey("mfs", "read"),
    buildPermissionKey("income", "read"),
    buildPermissionKey("income", "create"),
    buildPermissionKey("expense", "read"),
    buildPermissionKey("expense", "create"),
    buildPermissionKey("opening_cash", "read"),
    buildPermissionKey("opening_cash", "create"),
    buildPermissionKey("cash_closing", "read"),
    buildPermissionKey("cash_closing", "create"),
    buildPermissionKey("reports", "read"),
    buildPermissionKey("my_profile", "read"),
    buildPermissionKey("my_profile", "update"),
  ];
}

/**
 * Returns active permissions for the current branch.
 */
export function getActiveUserPermissions(): string[] {
  if (typeof window === "undefined") return [];

  // Super admin has all permissions
  if (isUserAdmin()) {
    return getAllSystemPermissionKeys();
  }

  const activeBranchId = getActiveBranchId();
  if (!activeBranchId) return [];

  // Check in-memory branch permissions
  const branchPerms = inMemoryBranchPermissions.get(Number(activeBranchId));
  if (Array.isArray(branchPerms) && branchPerms.length > 0) {
    return branchPerms;
  }

  // Fall back to login session permissions
  const userInfo = getUserInfo();
  if (Array.isArray((userInfo as any)?.permissions) && (userInfo as any).permissions.length > 0) {
    return (userInfo as any).permissions;
  }

  // Check in-memory employee branch records
  const employeeId = (userInfo as any)?.employeeId || (userInfo as any)?.userId || (userInfo as any)?.id;
  if (employeeId) {
    const list = inMemoryEmployeePermissions.get(Number(employeeId));
    if (Array.isArray(list) && list.length > 0) {
      const match = list.find((item: any) => Number(item.branchId || item.branch_id) === Number(activeBranchId));
      if (match) {
        let perms: string[] = [];
        if (Array.isArray(match.permissions)) {
          perms = [...match.permissions];
        } else if (typeof match.permissions === "string" && match.permissions.trim()) {
          try {
            const p = JSON.parse(match.permissions);
            if (Array.isArray(p)) perms = p;
          } catch {}
        }
        if (perms.length > 0) return perms;

        // Fallback synthesis if permissions array is undefined
        if (match.permissions === undefined || match.permissions === null) {
          if (match.canView) {
            perms.push(...getReadOnlyPermissionKeys());
          }
          if (match.canEdit) {
            perms.push(
              ...PERMISSION_MODULES.flatMap((m) => [
                buildPermissionKey(m.id, "create"),
                buildPermissionKey(m.id, "update"),
              ]),
              "sales:create",
              "sales:update",
              "purchase:create",
              "purchase:update",
              "inventory:create",
              "inventory:update",
              "banking:create",
              "banking:update",
              "accounts:create",
              "accounts:update"
            );
          }
          if (match.canDelete) {
            perms.push(
              ...PERMISSION_MODULES.map((m) => buildPermissionKey(m.id, "delete")),
              "sales:delete",
              "purchase:delete",
              "inventory:delete",
              "banking:delete",
              "accounts:delete"
            );
          }
          if (perms.length > 0) return perms;
        }
      }
    }
  }

  return [];
}

// Save branch permissions to in-memory cache
export function setActiveBranchPermissions(branchId: number, permissions: string[]): void {
  if (!branchId || !Array.isArray(permissions)) return;
  inMemoryBranchPermissions.set(Number(branchId), [...permissions]);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("permissions-updated"));
    } catch {}
  }
}

/**
 * Core Permission Check function.
 * Evaluates whether the current user is allowed to perform a specific action on a module.
 *
 * @param action "read" | "create" | "update" | "delete"
 * @param module e.g. "sales", "sales_return", "product", "parties", "expense", "reports", etc.
 * @param permissions Optional array of permissions (defaults to active user's permissions)
 */
export function hasPermission(
  action: CrudAction,
  module: string,
  permissions?: string[]
): boolean {
  // 1. Admins & Owners ALWAYS have full CRUD permissions
  if (isUserAdmin()) return true;

  // Strict multi-tenant security: non-admins cannot manage branches or system administration
  const modLower = (module || "").toLowerCase().trim();
  if (
    modLower === "branch_management" ||
    modLower === "branch" ||
    modLower === "branches" ||
    modLower === "role_management" ||
    modLower === "roles" ||
    modLower === "administration" ||
    modLower === "admin"
  ) {
    return false;
  }

  const userPerms = permissions || getActiveUserPermissions();
  if (!userPerms || userPerms.length === 0) return false;

  const targetColon = buildPermissionKey(module, action);
  const targetDot = `${module.toLowerCase()}.${action.toLowerCase()}`;
  const targetUnderscore = `${module.toLowerCase()}_${action.toLowerCase()}`;

  // Wildcard checks
  if (userPerms.includes("*") || userPerms.includes(`${module.toLowerCase()}:*`)) {
    return true;
  }

  // Direct exact match
  if (
    userPerms.includes(targetColon) ||
    userPerms.includes(targetDot) ||
    userPerms.includes(targetUnderscore)
  ) {
    return true;
  }

  // Employee & People aliases:
  if (["employee", "employees", "people"].includes(modLower)) {
    if (
      userPerms.includes(`employee:${action}`) ||
      userPerms.includes(`employees:${action}`) ||
      userPerms.includes(`people:${action}`) ||
      userPerms.includes(`${action}:employee`) ||
      userPerms.includes(`${action}:employees`) ||
      userPerms.includes(`${action}:people`) ||
      userPerms.includes(`employee.${action}`) ||
      userPerms.includes(`employees.${action}`) ||
      userPerms.includes(`employee_${action}`) ||
      userPerms.includes(`employees_${action}`) ||
      (action === "read" && (
        userPerms.includes("employees.view") ||
        userPerms.includes("employees.list.view") ||
        userPerms.includes("employee.view") ||
        userPerms.includes("employees:view") ||
        userPerms.includes("employee:view")
      )) ||
      (action === "create" && (
        userPerms.includes("employees.create") ||
        userPerms.includes("employee.create") ||
        userPerms.includes("employees:create") ||
        userPerms.includes("employee:create")
      )) ||
      (action === "update" && (
        userPerms.includes("employees.update") ||
        userPerms.includes("employee.update") ||
        userPerms.includes("employees:update") ||
        userPerms.includes("employee:update")
      )) ||
      (action === "delete" && (
        userPerms.includes("employees.delete") ||
        userPerms.includes("employee.delete") ||
        userPerms.includes("employees:delete") ||
        userPerms.includes("employee:delete")
      ))
    ) {
      return true;
    }
  }

  // Smart fallback aliases for Trade:
  if (["sales_return", "customer_collection"].includes(modLower)) {
    if (
      userPerms.includes(`sales:${action}`) ||
      userPerms.includes(`sales.${action}`) ||
      userPerms.includes(`sales_${action}`)
    ) {
      return true;
    }
  }

  if (["purchase_return", "supplier_payment"].includes(modLower)) {
    if (
      userPerms.includes(`purchase:${action}`) ||
      userPerms.includes(`purchase.${action}`) ||
      userPerms.includes(`purchase_${action}`)
    ) {
      return true;
    }
  }

  // Inventory & Product aliases:
  if (["inventory", "product", "products", "category_product", "stock_adjustment"].includes(modLower)) {
    if (
      userPerms.includes(`product:${action}`) ||
      userPerms.includes(`inventory:${action}`) ||
      userPerms.includes(`products:${action}`)
    ) {
      return true;
    }
  }

  if (["sms", "send_sms", "sms_bundle"].includes(modLower)) {
    if (
      userPerms.includes(`sms:${action}`) ||
      userPerms.includes(`send_sms:${action}`) ||
      userPerms.includes(`sms_bundle:${action}`) ||
      userPerms.includes(`settings.sms:${action}`)
    ) {
      return true;
    }
  }

  // Finance modules aliases:
  const financeModules = [
    "khatabook",
    "banking",
    "bank",
    "mfs",
    "income",
    "expense",
    "fund_transfer",
    "opening_cash",
    "cash_closing",
    "coa_vouchers",
    "tax",
    "assets",
    "budget",
    "accounts",
    "category_finance",
  ];
  if (financeModules.includes(modLower)) {
    if (
      userPerms.includes(`accounts:${action}`) ||
      userPerms.includes(`accounts.${action}`) ||
      userPerms.includes(`accounts_${action}`)
    ) {
      return true;
    }
    if (["bank", "mfs", "banking"].includes(modLower)) {
      if (
        userPerms.includes(`banking:${action}`) ||
        userPerms.includes(`bank:${action}`) ||
        userPerms.includes(`mfs:${action}`)
      ) {
        return true;
      }
    }
    if (["expense", "income"].includes(modLower)) {
      if (
        userPerms.includes(`expense:${action}`) ||
        userPerms.includes(`income:${action}`) ||
        userPerms.includes(`expenses:${action}`)
      ) {
        return true;
      }
    }
  }

  // Administration & Settings aliases:
  if (["administration", "admin"].includes(modLower)) {
    if (
      userPerms.includes(`admin:${action}`) ||
      userPerms.includes(`administration:${action}`) ||
      userPerms.includes(`admin.view`)
    ) {
      return true;
    }
  }

  const settingsSubModules = [
    "business_profile",
    "branch_management",
    "role_management",
    "appearance",
    "website_cms",
    "cms",
    "subscription_packages",
    "system_settings",
    "payment_methods",
    "sms_bundle",
    "integrations",
  ];
  if (settingsSubModules.includes(modLower)) {
    if (
      userPerms.includes(`settings:${action}`) ||
      userPerms.includes(`settings.view`)
    ) {
      return true;
    }
  }

  // Single-action update modules (CMS, Business Profile, Appearance, System Settings, Integrations):
  // Holding update permission naturally satisfies read/view checks.
  if (
    action === "read" &&
    (userPerms.includes(buildPermissionKey(module, "update")) ||
      userPerms.includes(`${modLower}:update`) ||
      userPerms.includes(`${modLower}.update`) ||
      userPerms.includes(`${modLower}_update`))
  ) {
    return true;
  }

  // CMS aliases
  if (["cms", "website_cms"].includes(modLower)) {
    if (
      userPerms.includes(`website_cms:${action}`) ||
      userPerms.includes(`cms:${action}`) ||
      userPerms.includes(`website_cms:update`) ||
      userPerms.includes(`cms:update`)
    ) {
      return true;
    }
  }

  if (["my_profile", "profile"].includes(modLower)) {
    if (
      userPerms.includes(`my_profile:${action}`) ||
      userPerms.includes(`profile:${action}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Maps a sidebar menu item path/name/permissionKey to its corresponding system module & CRUD action.
 */
export function getSidebarItemModule(item: {
  name?: string;
  path?: string;
  permissionKey?: string;
}): { module: string; action: CrudAction } | null {
  const path = (item.path || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  const key = (item.permissionKey || "").toLowerCase();

  // Dashboard: Always visible to employees who have system access
  if (path === "/admin" || name === "dashboard" || key.includes("dashboard")) {
    return { module: "dashboard", action: "read" };
  }

  // Categories
  if (path.includes("product-category") || name.includes("product category")) {
    return { module: "category_product", action: "read" };
  }
  if (path.includes("financial-categories") || name.includes("expense & income")) {
    return { module: "category_finance", action: "read" };
  }

  // Reports (must run before trade/collection keyword checks for paths like /admin/reports/sales-return)
  if (path.startsWith("/admin/reports") || key.startsWith("reports.")) {
    return { module: "reports", action: "read" };
  }

  // Trade - Sales
  if (path.includes("create-sales-return") || (name === "create return" && path.includes("sales"))) {
    return { module: "sales_return", action: "create" };
  }
  if (path.includes("sales-return") || name.includes("sales return")) {
    return { module: "sales_return", action: "read" };
  }
  if (path.includes("customer-collection") || name.includes("customer collection")) {
    return { module: "customer_collection", action: "read" };
  }
  if (path.includes("create-sale") || name === "create sale") {
    return { module: "sales", action: "create" };
  }
  if (path.includes("sales") || name.includes("sales") || key.includes("sales")) {
    return { module: "sales", action: "read" };
  }

  // Trade - Purchase
  if (path.includes("create-purchase-return") || (name === "create return" && path.includes("purchase"))) {
    return { module: "purchase_return", action: "create" };
  }
  if (path.includes("purchase-return") || name.includes("purchase return")) {
    return { module: "purchase_return", action: "read" };
  }
  if (path.includes("supplier-payment") || name.includes("supplier payment")) {
    return { module: "supplier_payment", action: "read" };
  }
  if (path.includes("create-purchase") || name === "create purchase") {
    return { module: "purchase", action: "create" };
  }
  if (path.includes("purchase") || name.includes("purchase") || key.includes("purchase")) {
    return { module: "purchase", action: "read" };
  }

  // Inventory
  if (path.includes("create-product") || name === "create product") {
    return { module: "product", action: "create" };
  }
  if (path.includes("stock-adjustment") || path.includes("adjustment") || name.includes("stock adjustment")) {
    return { module: "stock_adjustment", action: "read" };
  }
  if (path.includes("products") || name === "product" || name === "inventory" || key.includes("product")) {
    return { module: "product", action: "read" };
  }

  // People
  if (path.includes("employee-entry") || name === "employee entry") {
    return { module: "employee", action: "create" };
  }
  if (path.includes("employees") || name === "employee" || name === "employee list") {
    return { module: "employee", action: "read" };
  }
  if (path.includes("parties") || name.includes("parties") || name.includes("customer") || name.includes("supplier")) {
    return { module: "parties", action: "read" };
  }
  if (path.includes("/sms") || name.includes("sms")) {
    return { module: "sms", action: "read" };
  }

  // Finance
  if (path.includes("khatabook") || name.includes("khatabook")) {
    return { module: "khatabook", action: "read" };
  }
  if (path.includes("/mfs") || name === "mfs") {
    return { module: "mfs", action: "read" };
  }
  if (path.includes("/banks") || path.includes("/bank") || name === "bank" || name === "banking") {
    return { module: "bank", action: "read" };
  }
  if (path.includes("/income") || name === "income") {
    return { module: "income", action: "read" };
  }
  if (path.includes("/expense") || name === "expense") {
    return { module: "expense", action: "read" };
  }
  if (path.includes("fund-transfer") || name.includes("fund transfer")) {
    return { module: "fund_transfer", action: "read" };
  }
  if (path.includes("opening-cash") || name.includes("opening cash")) {
    return { module: "opening_cash", action: "read" };
  }
  if (path.includes("cash-closing") || name.includes("cash closing")) {
    return { module: "cash_closing", action: "read" };
  }
  if (
    path.includes("chart-of-accounts") ||
    path.includes("voucher") ||
    path.includes("general-ledger") ||
    path.includes("bank-recon") ||
    name.includes("voucher") ||
    name.includes("ledger") ||
    name.includes("chart of accounts")
  ) {
    return { module: "coa_vouchers", action: "read" };
  }
  if (path.includes("/tax") || name.includes("tax") || name.includes("vat")) {
    return { module: "tax", action: "read" };
  }
  if (path.includes("/assets") || name.includes("asset")) {
    return { module: "assets", action: "read" };
  }
  if (path.includes("/budget") || name.includes("budget")) {
    return { module: "budget", action: "read" };
  }

  // Reports & Approvals
  if (path.includes("/reports") || name.includes("report")) {
    return { module: "reports", action: "read" };
  }
  if (path.includes("/approvals") || name.includes("approval")) {
    return { module: "approvals", action: "read" };
  }

  // System & Administration
  if (path.includes("/roles") || name.includes("roles")) {
    return { module: "role_management", action: "read" };
  }
  if (path.includes("/branches") || name.includes("branch")) {
    return { module: "branch_management", action: "read" };
  }
  if (path.includes("/appearance") || name.includes("appearance")) {
    return { module: "appearance", action: "update" };
  }
  if (path.includes("cms") || name.includes("cms")) {
    return { module: "website_cms", action: "update" };
  }
  if (path.includes("packages") || name.includes("package")) {
    return { module: "subscription_packages", action: "read" };
  }
  if (path.includes("referral") || name.includes("referral")) {
    return { module: "subscription_packages", action: "read" };
  }
  if (path.includes("company") || name.includes("business profile")) {
    return { module: "business_profile", action: "update" };
  }
  if (path.includes("/admin/users") || name === "administration" || name === "users") {
    return { module: "administration", action: "read" };
  }

  return null;
}

/**
 * Checks whether a sidebar menu item or submenu is allowed for the given permissions.
 */
export function canAccessMenuItem(
  item: any,
  permissions?: string[],
  isAdmin = isUserAdmin()
): boolean {
  if (isAdmin) return true;

  // Strict multi-tenant security: non-admins cannot manage branches or system administration
  const path = (item.path || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  if (
    path === "/admin/branches" ||
    path === "/admin/branches/add" ||
    path.startsWith("/admin/branches") ||
    name === "branch management" ||
    name === "branch" ||
    name === "branches" ||
    name === "administration" ||
    name === "roles" ||
    name === "role management" ||
    name === "roles & permissions" ||
    path === "/admin/roles" ||
    path.startsWith("/admin/roles") ||
    path === "/admin/users" ||
    path.startsWith("/admin/users")
  ) {
    return false;
  }

  // If item has subItems, it is allowed if AT LEAST ONE subItem is allowed
  if (Array.isArray(item.subItems) && item.subItems.length > 0) {
    return item.subItems.some((sub: any) => canAccessMenuItem(sub, permissions, isAdmin));
  }

  // Standalone menu item or subItem
  const mapping = getSidebarItemModule(item);
  if (!mapping) {
    return false;
  }

  // Dashboard and Referral Profile are always viewable for any staff with active session access
  if (
    mapping.module === "dashboard" ||
    (item.path && item.path.includes("referral")) ||
    (item.name && item.name.toLowerCase().includes("referral"))
  ) {
    return true;
  }

  return hasPermission(mapping.action, mapping.module, permissions);
}
