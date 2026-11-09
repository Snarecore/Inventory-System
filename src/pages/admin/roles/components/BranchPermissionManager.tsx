import React, { useState, useEffect } from "react";
import { Button } from "@/components/common";
import { useBranchListQuery } from "@/hooks/useBranchQueries";
import {
  useEmployeeBranchPermissionsQuery,
  useCreateEmployeeBranchPermissionMutation,
  useUpdateEmployeeBranchPermissionMutation,
} from "@/hooks/useEmployeeQueries";
import type { EmployeeItem } from "@/types/employee.types";
import {
  PERMISSION_MODULES,
  buildPermissionKey,
  getAllSystemPermissionKeys,
  getOperatorPermissionKeys,
  getReadOnlyPermissionKeys,
  getCashierPermissionKeys,
  type CrudAction,
} from "@/utils/permission-utils";
import {
  FaUserCog,
  FaArrowLeft,
  FaTimes,
  FaSearch,
  FaChevronDown,
  FaChevronRight,
  FaFilter,
} from "react-icons/fa";

const ACTION_TITLES: Record<string, Record<CrudAction, string>> = {
  // 1. Dashboard
  dashboard: {
    read: "View Dashboard",
    create: "Create Widgets",
    update: "Customize Layout",
    delete: "Reset Dashboard",
  },
  // 2. Sales
  sales: {
    read: "Sales List",
    create: "Create Sale",
    update: "Edit Sale",
    delete: "Delete Sale",
  },
  // 3. Sales Return
  sales_return: {
    read: "Return List",
    create: "Create Return",
    update: "Edit Return",
    delete: "Delete Return",
  },
  // 4. Customer Collection
  customer_collection: {
    read: "Collection List",
    create: "Receive Payment",
    update: "Edit Collection",
    delete: "Cancel Collection",
  },
  // 5. Purchase
  purchase: {
    read: "Purchase List",
    create: "Create Purchase",
    update: "Edit Purchase",
    delete: "Delete Purchase",
  },
  // 6. Purchase Return
  purchase_return: {
    read: "Return List",
    create: "Create Return",
    update: "Edit Return",
    delete: "Delete Return",
  },
  // 7. Supplier Payment
  supplier_payment: {
    read: "Payment List",
    create: "Make Payment",
    update: "Edit Payment",
    delete: "Cancel Payment",
  },
  // 8. Product
  product: {
    read: "Product List",
    create: "Create Product",
    update: "Edit Product",
    delete: "Delete Product",
  },
  // 9. Stock Adjustment
  stock_adjustment: {
    read: "Adjustment List",
    create: "New Adjustment",
    update: "Edit Adjustment",
    delete: "Delete Adjustment",
  },
  // 10. Employee
  employee: {
    read: "Employee List",
    create: "Employee Entry",
    update: "Update Employee",
    delete: "Deactivate Employee",
  },
  // 11. Parties
  parties: {
    read: "All Parties",
    create: "Add Customer / Supplier",
    update: "Edit Party",
    delete: "Delete Party",
  },
  // 12. Send SMS
  sms: {
    read: "SMS History",
    create: "Send SMS",
    update: "Edit Templates",
    delete: "Delete SMS Logs",
  },
  // 13. Khatabook
  khatabook: {
    read: "Khatabook",
    create: "Add Entry",
    update: "Update Entry",
    delete: "Delete Entry",
  },
  // 14. Banking
  bank: {
    read: "Bank List",
    create: "Add Bank",
    update: "Update Bank",
    delete: "Delete Bank",
  },
  // 15. MFS
  mfs: {
    read: "MFS List",
    create: "Add MFS",
    update: "Update MFS",
    delete: "Delete MFS",
  },
  // 16. Expense
  expense: {
    read: "Expense List",
    create: "Add Expense",
    update: "Update Expense",
    delete: "Delete Expense",
  },
  // 17. Fund Transfer
  fund_transfer: {
    read: "Transfer List",
    create: "New Transfer",
    update: "Update Transfer",
    delete: "Cancel Transfer",
  },
  // 18. Opening Cash Balance
  opening_cash: {
    read: "View Balance",
    create: "Set Opening Balance",
    update: "Update Balance",
    delete: "Reset Balance",
  },
  // 19. Daily Cash Closing
  cash_closing: {
    read: "Closing List",
    create: "Daily Closing",
    update: "Update Closing",
    delete: "Delete Closing",
  },
  // 20. Tax / VAT
  tax: {
    read: "View Tax",
    create: "Configure Tax",
    update: "Update Tax Rates",
    delete: "Delete Tax Setup",
  },
  // 21. Assets
  assets: {
    read: "Asset Register",
    create: "Asset Purchase",
    update: "Depreciation / Transfer",
    delete: "Asset Disposal",
  },
  // 22. Reports
  reports: {
    read: "View Reports",
    create: "Generate Report",
    update: "Export / Print",
    delete: "Delete Report",
  },
  // 23. Approval
  approvals: {
    read: "Pending Approvals",
    create: "Submit Request",
    update: "Approve / Reject",
    delete: "Revoke Request",
  },
  // 24. Administration
  administration: {
    read: "View Admin",
    create: "Create Setup / User",
    update: "Edit Settings",
    delete: "Delete Admin Records",
  },
  // 25. Business Profile
  business_profile: {
    read: "Business Profile",
    create: "Setup Profile",
    update: "Business Profile",
    delete: "Remove Profile Data",
  },
  // 26. Role Management
  role_management: {
    read: "Role Management",
    create: "Create Role",
    update: "Edit Permissions",
    delete: "Delete Role",
  },
  // 27. Appearance
  appearance: {
    read: "Appearance",
    create: "Create Theme",
    update: "Appearance",
    delete: "Reset Appearance",
  },
  // Website CMS
  website_cms: {
    read: "Website CMS",
    create: "Add CMS Content",
    update: "Website CMS",
    delete: "Reset CMS Content",
  },
  cms: {
    read: "Website CMS",
    create: "Add CMS Content",
    update: "Website CMS",
    delete: "Reset CMS Content",
  },
  // 28. Subscription Packages
  subscription_packages: {
    read: "View Packages",
    create: "Subscribe Package",
    update: "Upgrade / Downgrade",
    delete: "Cancel Subscription",
  },
  // 29. System Settings
  system_settings: {
    read: "System Settings",
    create: "Configure Settings",
    update: "System Settings",
    delete: "Reset Settings",
  },
  // 30. Payment Methods
  payment_methods: {
    read: "View Methods",
    create: "Add Payment Method",
    update: "Edit Method",
    delete: "Delete Method",
  },
  // 31. SMS Bundle
  sms_bundle: {
    read: "View Bundles",
    create: "Purchase Bundle",
    update: "Change Bundle",
    delete: "Cancel Bundle",
  },
  // 32. My Profile
  my_profile: {
    read: "View Profile",
    create: "Add Details",
    update: "Change Password / Info",
    delete: "Deactivate Account",
  },

  // Legacy module aliases for backward safety
  inventory: {
    read: "Product",
    create: "Create Product",
    update: "Stock Adjustment",
    delete: "Delete Product",
  },
  banking: {
    read: "Bank",
    create: "MFS",
    update: "Update Account",
    delete: "Delete Account",
  },
  accounts: {
    read: "Income",
    create: "Expense",
    update: "Fund Transfer",
    delete: "Daily Cash Closing",
  },
  income: {
    read: "Income List",
    create: "Add Income",
    update: "Update Income",
    delete: "Delete Income",
  },
  category_product: {
    read: "Product Category",
    create: "Add Category",
    update: "Update Category",
    delete: "Delete Category",
  },
  category_finance: {
    read: "Expense & Income Category",
    create: "Add Financial Category",
    update: "Update Category",
    delete: "Delete Category",
  },
  coa_vouchers: {
    read: "Vouchers & Ledger",
    create: "Post Voucher",
    update: "Edit Voucher",
    delete: "Cancel Voucher",
  },
  budget: {
    read: "View Budget",
    create: "Setup Budget",
    update: "Update Budget",
    delete: "Delete Budget",
  },
  branch_management: {
    read: "Branch List",
    create: "Add Branch",
    update: "Update Branch",
    delete: "Deactivate Branch",
  },
  integrations: {
    read: "Email & Integrations",
    create: "Connect Integration",
    update: "Email & Integrations",
    delete: "Disconnect Integration",
  },
};

interface CrudColumnDef {
  action: CrudAction;
  label: string;
  tableLabel: string;
  tooltip: string;
  badgeClass: string;
  activeBadgeClass: string;
  activeCardClass: string;
  checkboxColor: string;
  headerTextColor: string;
}

export const CRUD_COLUMNS: CrudColumnDef[] = [
  {
    action: "read",
    label: "Read",
    tableLabel: "Read",
    tooltip: "Toggle Read for all modules",
    badgeClass:
      "bg-blue-50/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    activeBadgeClass:
      "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-400 dark:border-blue-600 shadow-2xs",
    activeCardClass:
      "bg-blue-50/90 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-100 shadow-2xs",
    checkboxColor: "text-blue-600 focus:ring-blue-500",
    headerTextColor: "text-blue-600 dark:text-blue-400",
  },
  {
    action: "create",
    label: "Create",
    tableLabel: "Create",
    tooltip: "Toggle Create for all modules",
    badgeClass:
      "bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    activeBadgeClass:
      "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 shadow-2xs",
    activeCardClass:
      "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 shadow-2xs",
    checkboxColor: "text-emerald-600 focus:ring-emerald-500",
    headerTextColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    action: "update",
    label: "Update",
    tableLabel: "Update",
    tooltip: "Toggle Update for all modules",
    badgeClass:
      "bg-amber-50/70 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    activeBadgeClass:
      "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-400 dark:border-amber-600 shadow-2xs",
    activeCardClass:
      "bg-amber-50/90 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 shadow-2xs",
    checkboxColor: "text-amber-500 focus:ring-amber-500",
    headerTextColor: "text-amber-600 dark:text-amber-400",
  },
  {
    action: "delete",
    label: "Delete",
    tableLabel: "Delete",
    tooltip: "Toggle Delete for all modules",
    badgeClass:
      "bg-rose-50/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    activeBadgeClass:
      "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-600 shadow-2xs",
    activeCardClass:
      "bg-rose-50/90 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100 shadow-2xs",
    checkboxColor: "text-rose-600 focus:ring-rose-500",
    headerTextColor: "text-rose-600 dark:text-rose-400",
  },
];

export const ACTION_STANDARD_NAMES: Record<CrudAction, string> = {
  read: "Can View",
  create: "Can Create",
  update: "Can Update",
  delete: "Can Delete",
};

interface IndeterminateCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}

export const IndeterminateCheckbox: React.FC<IndeterminateCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  className = "",
  disabled = false,
  title,
  ...rest
}) => {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = !checked && indeterminate;
    }
  }, [checked, indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      title={title}
      className={`rounded cursor-pointer ${className}`}
      {...rest}
    />
  );
};

export interface BranchPermissionManagerProps {
  employee: EmployeeItem | null;
  onBack?: () => void;
  initialBranchId?: number;
  isModal?: boolean;
}

export const BranchPermissionManager: React.FC<BranchPermissionManagerProps> = ({
  employee,
  onBack,
  initialBranchId,
  isModal = false,
}) => {
  const employeeId = employee?.id || (employee as any)?.employeeId || 0;

  // Live branches for organization
  const { data: branches = [], isLoading: isLoadingBranches } = useBranchListQuery();

  // Current assigned branch permissions
  const {
    data: permissions = [],
    isLoading: isLoadingPerms,
    refetch,
  } = useEmployeeBranchPermissionsQuery(employeeId, {
    enabled: Boolean(employeeId),
  });

  const [selectedBranchId, setSelectedBranchId] = useState<number | "">("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isPrimary, setIsPrimary] = useState<boolean>(false);
  const [editingPermissionId, setEditingPermissionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "configured" | "unconfigured">("all");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const createMutation = useCreateEmployeeBranchPermissionMutation({
    onSuccess: () => {
      resetForm();
      refetch();
    },
  });

  const updateMutation = useUpdateEmployeeBranchPermissionMutation({
    onSuccess: () => {
      resetForm();
      refetch();
    },
  });

  const resetForm = () => {
    setSelectedBranchId("");
    setSelectedPermissions([]);
    setIsPrimary(false);
    setEditingPermissionId(null);
  };

  if (!employee) {
    return (
      <div className="p-8 text-center text-xs text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        Please select a staff member to view and manage role permissions.
      </div>
    );
  }

  const assignedBranchIds = new Set(
    permissions.map((p: any) => Number(p.branchId || p.branch_id))
  );

  // Available branches: only show unassigned branches unless editing an existing assignment
  const availableBranches = branches.filter((b) => {
    const bId = Number(b.branchId);
    if (selectedBranchId !== "" && bId === Number(selectedBranchId)) {
      return true;
    }
    return b.active && !assignedBranchIds.has(bId);
  });

  // --- CRUD Matrix Handlers ---
  const isChecked = (modId: string, act: CrudAction): boolean => {
    return (
      selectedPermissions.includes(buildPermissionKey(modId, act)) ||
      selectedPermissions.includes(`${modId}.${act}`)
    );
  };

  const toggleSingle = (modId: string, act: CrudAction) => {
    const key = buildPermissionKey(modId, act);
    setSelectedPermissions((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key && k !== `${modId}.${act}`)
        : [...prev, key]
    );
  };

  const toggleRowAll = (modId: string) => {
    const mod = PERMISSION_MODULES.find((m) => m.id === modId);
    if (!mod) return;
    const modKeys = mod.actions.map((act) => buildPermissionKey(modId, act));
    const allRowChecked = modKeys.every((k) => selectedPermissions.includes(k));

    if (allRowChecked) {
      setSelectedPermissions((prev) => prev.filter((k) => !modKeys.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...modKeys])));
    }
  };

  const getActionKeys = (action: CrudAction): string[] => {
    return PERMISSION_MODULES.filter((m) => m.actions.includes(action)).map((m) =>
      buildPermissionKey(m.id, action)
    );
  };

  const isActionAllChecked = (action: CrudAction): boolean => {
    const keys = getActionKeys(action);
    return keys.length > 0 && keys.every((k) => selectedPermissions.includes(k));
  };

  const isActionSomeChecked = (action: CrudAction): boolean => {
    const keys = getActionKeys(action);
    return keys.some((k) => selectedPermissions.includes(k));
  };

  const toggleColumnAll = (action: CrudAction) => {
    const colKeys = getActionKeys(action);
    const allColChecked = colKeys.every((k) => selectedPermissions.includes(k));

    if (allColChecked) {
      setSelectedPermissions((prev) => prev.filter((k) => !colKeys.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...colKeys])));
    }
  };

  const allSystemKeys = getAllSystemPermissionKeys();
  const isAllSystemChecked =
    allSystemKeys.length > 0 && allSystemKeys.every((k) => selectedPermissions.includes(k));
  const isAllSystemSomeChecked =
    selectedPermissions.length > 0 && !isAllSystemChecked;

  const toggleAllSystem = () => {
    if (isAllSystemChecked) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allSystemKeys);
    }
  };

  // --- Preset Template Buttons ---
  const applyPreset = (presetType: "all" | "operator" | "cashier" | "readonly" | "clear") => {
    switch (presetType) {
      case "all":
        setSelectedPermissions(getAllSystemPermissionKeys());
        break;
      case "operator":
        setSelectedPermissions(getOperatorPermissionKeys());
        break;
      case "cashier":
        setSelectedPermissions(getCashierPermissionKeys());
        break;
      case "readonly":
        setSelectedPermissions(getReadOnlyPermissionKeys());
        break;
      case "clear":
        setSelectedPermissions([]);
        break;
    }
  };

  // --- Submit / Save ---
  const handleSave = () => {
    if (!selectedBranchId) return;

    const bId = Number(selectedBranchId);
    const existing = permissions.find(
      (p: any) => Number(p.branchId || p.branch_id) === bId
    );

    const hasView =
      selectedPermissions.some((k) => k.includes("read") || k.includes("view")) ||
      selectedPermissions.length > 0;
    const hasEdit = selectedPermissions.some(
      (k) => k.includes("create") || k.includes("update")
    );
    const hasDelete = selectedPermissions.some((k) => k.includes("delete"));

    const targetPermissionId =
      editingPermissionId ||
      (existing?.id && Number(existing.id) > 0 ? Number(existing.id) : null);

    if (targetPermissionId) {
      updateMutation.mutate({
        permissionId: targetPermissionId,
        id: targetPermissionId,
        data: {
          employeeId,
          branchId: bId,
          primary: isPrimary,
          canView: hasView,
          canEdit: hasEdit,
          canDelete: hasDelete,
          permissions: selectedPermissions,
          active: true,
        },
      } as any);
    } else {
      createMutation.mutate({
        employeeId,
        branchId: bId,
        organizationId: Number(employee.organizationId || (employee as any)?.orgId || 0),
        primary: isPrimary,
        canView: hasView,
        canEdit: hasEdit,
        canDelete: hasDelete,
        permissions: selectedPermissions,
        active: true,
      });
    }
  };

  const handleEditExisting = (perm: any) => {
    const pId = Number(perm.id || perm.permissionId);
    const bId = Number(perm.branchId || perm.branch_id);
    let permsList: string[] = Array.isArray(perm.permissions) ? [...perm.permissions] : [];

    if (permsList.length === 0) {
      if (perm.canView) {
        permsList.push(...getReadOnlyPermissionKeys());
      }
      if (perm.canEdit) {
        permsList.push(
          ...PERMISSION_MODULES.flatMap((m) => [
            buildPermissionKey(m.id, "create"),
            buildPermissionKey(m.id, "update"),
          ])
        );
      }
      if (perm.canDelete) {
        permsList.push(
          ...PERMISSION_MODULES.map((m) => buildPermissionKey(m.id, "delete"))
        );
      }
    } else {
      // Map legacy saved permissions so the granular UI checkboxes correctly show previous access
      const expandedPerms = new Set(permsList);

      // Legacy sales mapping
      if (permsList.includes("sales:read")) {
        expandedPerms.add("sales_return:read");
        expandedPerms.add("customer_collection:read");
      }
      if (permsList.includes("sales:create")) {
        expandedPerms.add("sales_return:create");
        expandedPerms.add("customer_collection:create");
      }
      if (permsList.includes("sales:update")) {
        expandedPerms.add("sales_return:update");
        expandedPerms.add("customer_collection:update");
      }
      if (permsList.includes("sales:delete")) {
        expandedPerms.add("sales_return:delete");
        expandedPerms.add("customer_collection:delete");
      }

      // Legacy purchase mapping
      if (permsList.includes("purchase:read")) {
        expandedPerms.add("purchase_return:read");
        expandedPerms.add("supplier_payment:read");
      }
      if (permsList.includes("purchase:create")) {
        expandedPerms.add("purchase_return:create");
        expandedPerms.add("supplier_payment:create");
      }
      if (permsList.includes("purchase:update")) {
        expandedPerms.add("purchase_return:update");
        expandedPerms.add("supplier_payment:update");
      }
      if (permsList.includes("purchase:delete")) {
        expandedPerms.add("purchase_return:delete");
        expandedPerms.add("supplier_payment:delete");
      }

      // Legacy inventory mapping
      if (permsList.includes("inventory:read")) {
        expandedPerms.add("product:read");
        expandedPerms.add("stock_adjustment:read");
      }
      if (permsList.includes("inventory:create")) {
        expandedPerms.add("product:create");
        expandedPerms.add("stock_adjustment:create");
      }
      if (permsList.includes("inventory:update")) {
        expandedPerms.add("product:update");
        expandedPerms.add("stock_adjustment:update");
      }
      if (permsList.includes("inventory:delete")) {
        expandedPerms.add("product:delete");
        expandedPerms.add("stock_adjustment:delete");
      }

      // Legacy banking mapping
      if (permsList.includes("banking:read")) {
        expandedPerms.add("bank:read");
        expandedPerms.add("mfs:read");
      }
      if (permsList.includes("banking:create")) {
        expandedPerms.add("bank:create");
        expandedPerms.add("mfs:create");
      }
      if (permsList.includes("banking:update")) {
        expandedPerms.add("bank:update");
        expandedPerms.add("mfs:update");
      }
      if (permsList.includes("banking:delete")) {
        expandedPerms.add("bank:delete");
        expandedPerms.add("mfs:delete");
      }

      // Legacy accounts mapping
      if (permsList.includes("accounts:read")) {
        expandedPerms.add("expense:read");
        expandedPerms.add("fund_transfer:read");
        expandedPerms.add("opening_cash:read");
        expandedPerms.add("cash_closing:read");
      }
      if (permsList.includes("accounts:create")) {
        expandedPerms.add("expense:create");
        expandedPerms.add("fund_transfer:create");
        expandedPerms.add("opening_cash:create");
        expandedPerms.add("cash_closing:create");
      }
      if (permsList.includes("accounts:update")) {
        expandedPerms.add("expense:update");
        expandedPerms.add("fund_transfer:update");
        expandedPerms.add("opening_cash:update");
        expandedPerms.add("cash_closing:update");
      }
      if (permsList.includes("accounts:delete")) {
        expandedPerms.add("expense:delete");
        expandedPerms.add("fund_transfer:delete");
        expandedPerms.add("opening_cash:delete");
        expandedPerms.add("cash_closing:delete");
      }

      // Legacy admin / settings mapping
      if (permsList.includes("admin:read") || permsList.includes("administration:read")) {
        expandedPerms.add("administration:read");
      }
      if (permsList.includes("settings:read")) {
        expandedPerms.add("business_profile:read");
        expandedPerms.add("role_management:read");
        expandedPerms.add("appearance:read");
        expandedPerms.add("subscription_packages:read");
        expandedPerms.add("system_settings:read");
        expandedPerms.add("payment_methods:read");
        expandedPerms.add("sms_bundle:read");
      }

      permsList = Array.from(expandedPerms);
    }

    setSelectedBranchId(bId);
    setSelectedPermissions(permsList);
    setIsPrimary(Boolean(perm.primary));
    setEditingPermissionId(pId);
  };

  // Auto-select and load permissions in Edit mode if available
  useEffect(() => {
    if (!permissions || permissions.length === 0) return;
    if (selectedBranchId !== "" && editingPermissionId !== null) return;

    let target: any = null;
    if (initialBranchId) {
      target = permissions.find(
        (p: any) => Number(p.branchId || p.branch_id) === Number(initialBranchId)
      );
    }
    if (!target) {
      target = permissions.find((p: any) => Boolean(p.primary)) || permissions[0];
    }

    if (target) {
      handleEditExisting(target);
    }
  }, [permissions, initialBranchId]);

  const totalPossiblePermissions = getAllSystemPermissionKeys().length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const moduleCheckedCounts: Record<string, number> = React.useMemo(() => {
    const counts: Record<string, number> = {};
    PERMISSION_MODULES.forEach((mod) => {
      counts[mod.id] = mod.actions.filter((act) => isChecked(mod.id, act)).length;
    });
    return counts;
  }, [selectedPermissions]);

  const totalConfiguredModules = PERMISSION_MODULES.filter(
    (m) => (moduleCheckedCounts[m.id] || 0) > 0
  ).length;
  const totalUnconfiguredModules = PERMISSION_MODULES.length - totalConfiguredModules;

  const filteredModules = React.useMemo(() => {
    return PERMISSION_MODULES.filter((mod) => {
      const checkedCount = moduleCheckedCounts[mod.id] || 0;
      if (filterStatus === "configured" && checkedCount === 0) return false;
      if (filterStatus === "unconfigured" && checkedCount > 0) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = mod.name.toLowerCase().includes(q);
      const catMatch = mod.category.toLowerCase().includes(q);
      const actionMatch = mod.actions.some((act) => {
        const title = ACTION_TITLES[mod.id]?.[act] || "";
        const stdName = ACTION_STANDARD_NAMES[act] || "";
        return (
          title.toLowerCase().includes(q) ||
          stdName.toLowerCase().includes(q) ||
          act.toLowerCase().includes(q)
        );
      });
      return nameMatch || catMatch || actionMatch;
    });
  }, [filterStatus, searchQuery, moduleCheckedCounts]);

  const groupedSections = React.useMemo(() => {
    const map: Record<string, typeof PERMISSION_MODULES> = {};
    filteredModules.forEach((mod) => {
      if (!map[mod.category]) {
        map[mod.category] = [];
      }
      map[mod.category].push(mod);
    });
    return map;
  }, [filteredModules]);

  const toggleSectionCollapse = (cat: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const allCategories = React.useMemo(
    () => Array.from(new Set(PERMISSION_MODULES.map((m) => m.category))),
    []
  );
  const allCollapsed =
    allCategories.length > 0 && allCategories.every((c) => Boolean(collapsedSections[c]));

  const toggleAllSections = () => {
    if (allCollapsed) {
      setCollapsedSections({});
    } else {
      const next: Record<string, boolean> = {};
      allCategories.forEach((c) => {
        next[c] = true;
      });
      setCollapsedSections(next);
    }
  };

  return (
    <div className={`flex flex-col gap-3.5 text-xs ${isModal ? "py-1" : "w-full"}`}>
      {/* Main Permissions Configuration Card */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700/80 shadow-2xs flex flex-col gap-3">
        {/* Row 1: Unified Staff Header + Branch Selector & Primary Checkbox */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-gray-100 dark:border-gray-700/60 pb-2.5">
          {/* Left: Back Button + Staff Identity + Mode Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer border border-gray-200 dark:border-gray-600 shadow-2xs shrink-0"
                title="Back to Staff Directory"
              >
                <FaArrowLeft size={10} />
                <span>Back</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                {employee.fullName}
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {employee.employeeCode || `ID #${employeeId}`}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[var(--primary-color,#009fe3)] dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                {employee.role || "EMPLOYEE"}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block shrink-0" />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <FaUserCog className="text-[var(--primary-color,#009fe3)] text-xs shrink-0" />
                <span className="whitespace-nowrap">
                  {editingPermissionId ? "Edit Branch CRUD Access" : "Assign Branch Access"}
                </span>
              </div>
              {editingPermissionId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold text-[var(--primary-color,#009fe3)] bg-[var(--primary-color,#009fe3)]/10 hover:bg-[var(--primary-color,#009fe3)]/20 transition-colors cursor-pointer whitespace-nowrap"
                  title="Switch to assign a new branch"
                >
                  + Assign New Branch
                </button>
              )}
            </div>
          </div>

          {/* Right: Target Branch Selector & Primary Checkbox */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Target Branch <span className="text-rose-500">*</span>:
              </span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : "")}
                disabled={isSaving || Boolean(editingPermissionId)}
                className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] focus:border-[var(--primary-color,#009fe3)] font-medium text-gray-800 dark:text-gray-200 disabled:opacity-60 max-w-[210px] truncate transition-colors shadow-2xs"
              >
                <option value="">
                  {availableBranches.length === 0
                    ? "All branches assigned"
                    : "Select branch..."}
                </option>
                {availableBranches.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded-lg select-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap shrink-0 shadow-2xs">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                disabled={isSaving}
                className="rounded border-gray-300 text-[var(--primary-color,#009fe3)] focus:ring-0 cursor-pointer h-3.5 w-3.5"
              />
              <span>Primary Branch</span>
            </label>
          </div>
        </div>

        {/* Row 2: Search Bar, Action Chips, Status Filters & Counter */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Left: Search Bar + Action Chips (WITHOUT "Quick Presets:" text) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Bar */}
            <div className="relative w-48 sm:w-56 lg:w-64 shrink-0">
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search permissions..."
                className="w-full pl-8 pr-7 py-1 text-xs bg-gray-50/70 dark:bg-gray-900/80 border border-gray-300/90 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] focus:border-[var(--primary-color,#009fe3)] placeholder-gray-400 dark:placeholder-gray-500 transition-colors shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title="Clear search"
                >
                  <FaTimes size={10} />
                </button>
              )}
            </div>

            <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 hidden sm:block shrink-0" />

            {/* Action Chips: All, Read, Create, Update, Delete */}
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0 overflow-x-auto">
              {/* All / Full Access Checkbox Chip */}
              <label
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer select-none whitespace-nowrap shadow-2xs ${
                  isAllSystemChecked
                    ? "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-400 dark:border-purple-600"
                    : "bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100/70"
                }`}
                title="Toggle all 21 permissions across all modules"
              >
                <IndeterminateCheckbox
                  checked={isAllSystemChecked}
                  indeterminate={isAllSystemSomeChecked}
                  onChange={toggleAllSystem}
                  className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                />
                <span>All</span>
              </label>

              {/* Read, Create, Update, Delete Checkbox Chips */}
              {CRUD_COLUMNS.map((col) => {
                const allChecked = isActionAllChecked(col.action);
                const someChecked = isActionSomeChecked(col.action);

                return (
                  <label
                    key={col.action}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer select-none whitespace-nowrap shadow-2xs ${
                      allChecked ? col.activeBadgeClass : col.badgeClass
                    }`}
                    title={col.tooltip}
                  >
                    <IndeterminateCheckbox
                      checked={allChecked}
                      indeterminate={someChecked && !allChecked}
                      onChange={() => toggleColumnAll(col.action)}
                      className={`rounded h-3.5 w-3.5 ${col.checkboxColor}`}
                    />
                    <span>{col.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Right: Status Filters + Clear All + Selected Count */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap xl:ml-auto">
            {/* Status Filters */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900/90 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-2xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                All ({PERMISSION_MODULES.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("configured")}
                className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === "configured"
                    ? "bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Configured ({totalConfiguredModules})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("unconfigured")}
                className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === "unconfigured"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-2xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                Unconfigured ({totalUnconfiguredModules})
              </button>
            </div>

            {/* Clear All */}
            {selectedPermissions.length > 0 && (
              <button
                type="button"
                onClick={() => applyPreset("clear")}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/40 whitespace-nowrap"
              >
                Clear All
              </button>
            )}

            {/* Selected Count Indicator */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gray-100/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700/80 text-[11px] shadow-2xs whitespace-nowrap">
              <span className="font-medium text-gray-500 dark:text-gray-400">Selected:</span>
              <span className="font-bold font-mono text-[var(--primary-color,#009fe3)]">
                {selectedPermissions.length}
              </span>
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <span className="font-semibold font-mono text-gray-600 dark:text-gray-300">
                {totalPossiblePermissions}
              </span>
            </div>
          </div>
        </div>

        {/* Menu & Sub-Menu Permissions Hierarchy */}
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-2xs overflow-hidden">
          {Object.keys(groupedSections).length === 0 ? (
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm">
                <FaFilter />
              </div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                No modules match your current filter or search query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                className="text-[11px] font-semibold text-[var(--primary-color,#009fe3)] hover:underline cursor-pointer"
              >
                Clear filter & search
              </button>
            </div>
          ) : (
            Object.entries(groupedSections).map(([category, modules]) => {
              const isCollapsed = !searchQuery.trim() && Boolean(collapsedSections[category]);

              return (
                <div key={category} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700/80">
                  {/* Section Header */}
                  <div
                    style={{
                      backgroundColor: "var(--table-header-bg, var(--primary-color, #009fe3))",
                      color: "var(--table-header-text, var(--ui-on-accent, #ffffff))",
                    }}
                    onClick={() => toggleSectionCollapse(category)}
                    className="px-3.5 py-1.5 border-t first:border-t-0 border-black/10 dark:border-white/10 flex items-center justify-between shadow-2xs cursor-pointer select-none transition-opacity hover:opacity-95"
                    title="Click to expand/collapse this section"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <FaChevronRight size={10} className="shrink-0 transition-transform" />
                      ) : (
                        <FaChevronDown size={10} className="shrink-0 transition-transform" />
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-wider text-inherit">
                        {category} Section
                      </span>
                    </div>
                  </div>

                  {/* Modules List in Section */}
                  {!isCollapsed && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-gray-900">
                      {modules.map((mod) => {
                        const modKeys = mod.actions.map((act) => buildPermissionKey(mod.id, act));
                        const isAllChecked =
                          modKeys.length > 0 && modKeys.every((k) => selectedPermissions.includes(k));
                        const isSomeChecked = modKeys.some((k) => selectedPermissions.includes(k));
                        const checkedCount = moduleCheckedCounts[mod.id] || 0;

                        return (
                          <div
                            key={mod.id}
                            className={`px-3 py-1.5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-2 ${
                              isAllChecked
                                ? "bg-emerald-50/25 dark:bg-emerald-950/10 hover:bg-emerald-50/40"
                                : isSomeChecked
                                ? "bg-blue-50/15 dark:bg-blue-950/5 hover:bg-blue-50/30"
                                : "hover:bg-gray-50/60 dark:hover:bg-gray-800/30"
                            }`}
                          >
                            {/* Left: Module Name + Master Checkbox + Counter */}
                            <div className="lg:w-60 xl:w-72 shrink-0 flex items-center justify-between lg:justify-start gap-2.5 min-w-0 pr-0 lg:pr-3 border-r-0 lg:border-r border-gray-100 dark:border-gray-800">
                              <label className="flex items-center gap-2 cursor-pointer select-none group min-w-0">
                                <IndeterminateCheckbox
                                  checked={isAllChecked}
                                  indeterminate={isSomeChecked && !isAllChecked}
                                  onChange={() => toggleRowAll(mod.id)}
                                  className="rounded text-[var(--primary-color,#009fe3)] focus:ring-0 h-3.5 w-3.5 shrink-0"
                                />
                                <span className="font-bold text-xs text-gray-900 dark:text-gray-100 group-hover:text-[var(--primary-color,#009fe3)] transition-colors truncate">
                                  {mod.name}
                                </span>
                                {mod.actions.length === 1 && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border shrink-0 ${
                                      mod.actions[0] === "read"
                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                    }`}
                                  >
                                    {mod.actions[0] === "read" ? "View Only" : "Update Only"}
                                  </span>
                                )}
                              </label>

                              {/* Counter Badge */}
                              <span
                                className={`ml-auto lg:ml-auto px-1.5 py-0.2 rounded font-mono text-[9.5px] font-bold shrink-0 border ${
                                  isAllChecked
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                    : isSomeChecked
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                    : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border-gray-200 dark:border-gray-700"
                                }`}
                                title={`${checkedCount} of ${mod.actions.length} permissions granted`}
                              >
                                {checkedCount}/{mod.actions.length}
                              </span>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex-1 min-w-0 pl-0 lg:pl-3">
                              {mod.actions.length === 1 ? (
                                // Single Action pill
                                <div className="flex items-center">
                                  {CRUD_COLUMNS.filter((col) => mod.actions.includes(col.action)).map((col) => {
                                    const checked = isChecked(mod.id, col.action);
                                    const subTitle = ACTION_TITLES[mod.id]?.[col.action] || `${col.label} ${mod.name}`;
                                    const standardLabel = ACTION_STANDARD_NAMES[col.action] || col.label;
                                    return (
                                      <label
                                        key={col.action}
                                        className={`flex items-center justify-between gap-2 py-1 px-2.5 rounded-md border cursor-pointer select-none transition-all w-full sm:w-auto sm:min-w-[200px] max-w-xs ${
                                          checked
                                            ? col.activeCardClass
                                            : "bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100/80"
                                        }`}
                                        title={`${standardLabel} (${subTitle})`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleSingle(mod.id, col.action)}
                                            className={`rounded h-3.5 w-3.5 shrink-0 ${col.checkboxColor}`}
                                          />
                                          <span className="font-semibold text-xs truncate">
                                            {standardLabel}
                                          </span>
                                        </div>
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold shrink-0 border ${
                                            checked ? col.activeBadgeClass : col.badgeClass
                                          }`}
                                        >
                                          {col.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                // 4-column responsive grid
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
                                  {CRUD_COLUMNS.map((col) => {
                                    const hasAction = mod.actions.includes(col.action);
                                    if (!hasAction) {
                                      return (
                                        <div
                                          key={col.action}
                                          className="hidden lg:flex items-center justify-center py-1 px-2 rounded-md border border-dashed border-gray-100 dark:border-gray-800 text-[10px] text-gray-300 dark:text-gray-700 select-none"
                                        >
                                          &mdash;
                                        </div>
                                      );
                                    }

                                    const checked = isChecked(mod.id, col.action);
                                    const subTitle = ACTION_TITLES[mod.id]?.[col.action] || `${col.label} ${mod.name}`;
                                    const standardLabel = ACTION_STANDARD_NAMES[col.action] || col.label;

                                    return (
                                      <label
                                        key={col.action}
                                        className={`flex items-center justify-between gap-1.5 py-1 px-2 rounded-md border cursor-pointer select-none transition-all ${
                                          checked
                                            ? col.activeCardClass
                                            : "bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100/80"
                                        }`}
                                        title={`${standardLabel} (${subTitle})`}
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleSingle(mod.id, col.action)}
                                            className={`rounded h-3.5 w-3.5 shrink-0 ${col.checkboxColor}`}
                                          />
                                          <span className="font-medium text-[11.5px] truncate">
                                            {standardLabel}
                                          </span>
                                        </div>
                                        <span
                                          className={`px-1 py-0.2 rounded text-[8.5px] font-bold shrink-0 border ${
                                            checked ? col.activeBadgeClass : col.badgeClass
                                          }`}
                                        >
                                          {col.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action Save Button */}
        <div className="flex items-center justify-between pt-1">
          {editingPermissionId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <FaTimes size={10} />
              <span>Cancel Editing</span>
            </button>
          )}

          <div className="ml-auto">
            <Button
              label={
                isSaving
                  ? "Saving CRUD Permissions..."
                  : editingPermissionId
                  ? "Update Branch CRUD Permissions"
                  : "Grant Branch CRUD Access"
              }
              onClick={handleSave}
              disabled={!selectedBranchId || isSaving}
              color="var(--primary-color,#009fe3)"
              buttonClass="!text-xs !py-1.5 !px-4 font-semibold !text-white cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchPermissionManager;
