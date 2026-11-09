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
    name: "Khatabook",
    description: "Customer and supplier khatabook ledgers",
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
              perms.push(...getReadOnlyPermissionKeys());
            }
            if (match.canEdit) {
              perms.push(
                ...PERMISSION_MODULES.flatMap((m) => [
                  buildPermissionKey(m.id, "create"),
                  buildPermissionKey(m.id, "update"),
                ]),
                // Legacy keys
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
                // Legacy keys
                "sales:delete",
                "purchase:delete",
                "inventory:delete",
                "banking:delete",
                "accounts:delete"
              );
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

  const modLower = module.toLowerCase();

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

  // People & SMS aliases:
  if (["employee", "employees", "people"].includes(modLower)) {
    if (
      userPerms.includes(`employee:${action}`) ||
      userPerms.includes(`employees:${action}`) ||
      userPerms.includes(`people:${action}`)
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
