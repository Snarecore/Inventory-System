import React, { useState, useEffect } from "react";
import { Button } from "@/components/common";
import { useBranchListQuery } from "@/hooks/useBranchQueries";
import {
  useEmployeeBranchPermissionsQuery,
  useCreateEmployeeBranchPermissionMutation,
  useUpdateEmployeeBranchPermissionMutation,
  useDeleteEmployeeBranchPermissionMutation,
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
  FaBuilding,
  FaShieldAlt,
  FaTrash,
  FaUserCog,
  FaEdit,
  FaArrowLeft,
  FaTimes,
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
    checkboxColor: "text-blue-600 focus:ring-blue-500",
    headerTextColor: "text-blue-600 dark:text-blue-400",
  },
  {
    action: "create",
    label: "Edit",
    tableLabel: "Edit (Create)",
    tooltip: "Toggle Edit (Create/Post) for all modules",
    badgeClass:
      "bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    activeBadgeClass:
      "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600 shadow-2xs",
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
    checkboxColor: "text-rose-600 focus:ring-rose-500",
    headerTextColor: "text-rose-600 dark:text-rose-400",
  },
];

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

  const deleteMutation = useDeleteEmployeeBranchPermissionMutation({
    onSuccess: () => {
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

  const handleRemove = (permissionId: number) => {
    if (!permissionId || Number(permissionId) <= 0) return;
    deleteMutation.mutate({ permissionId: Number(permissionId), employeeId });
  };

  const totalPossiblePermissions = getAllSystemPermissionKeys().length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={`flex flex-col gap-3.5 text-xs ${isModal ? "py-1" : "w-full"}`}>
      {/* Top Header Card (In-Page Mode) */}
      {!isModal && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer border border-gray-200 dark:border-gray-600 shadow-2xs shrink-0"
                title="Back to Staff Directory"
              >
                <FaArrowLeft size={11} />
                <span>Back</span>
              </button>
            )}

            <div className="w-9 h-9 rounded-xl bg-[var(--primary-color-light,#e0f2fe)] text-[var(--primary-color,#009fe3)] flex items-center justify-center text-sm font-bold shrink-0">
              {(employee.fullName || "E").charAt(0).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {employee.fullName}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {employee.employeeCode || `ID #${employeeId}`}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[var(--primary-color,#009fe3)] dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                  {employee.role || "EMPLOYEE"}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-normal mt-0.5">
                {employee.designation || employee.department || "Staff Member"} &bull; Manage Branch & CRUD Access
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Permissions Configuration Card */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex flex-col gap-2.5">
        {/* Row 1: Title, Target Branch Selector, Primary Branch Checkbox - ALL IN ONE SINGLE LINE */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2.5 flex-nowrap">
          <div className="flex items-center gap-2 font-semibold text-black dark:text-gray-200 shrink-0">
            <FaUserCog className="text-[var(--primary-color,#009fe3)] text-sm" />
            <span className="text-xs sm:text-sm whitespace-nowrap">
              {editingPermissionId ? "Edit Branch CRUD Access" : "Assign Branch Access"}
            </span>
            {editingPermissionId && (
              <button
                type="button"
                onClick={resetForm}
                className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
                title="Switch to assign a new branch"
              >
                + Assign New Branch
              </button>
            )}
          </div>

          {/* Target Branch and Primary Checkbox */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Target Branch *:
              </span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : "")}
                disabled={isSaving || Boolean(editingPermissionId)}
                className="px-2.5 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] font-medium disabled:opacity-60 max-w-[190px] truncate"
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

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded-lg select-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap shrink-0">
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

        {/* Row 2: Quick Presets: Read, Edit, Update, Delete Checkboxes, Clear All, Selected Counter - ALL IN ONE SINGLE LINE */}
        <div className="flex items-center justify-between gap-2 pt-0.5 flex-nowrap">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap mr-0.5">
              Quick Presets:
            </span>

            {/* All / Full Access Checkbox Chip */}
            <label
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer select-none whitespace-nowrap ${
                isAllSystemChecked
                  ? "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border-purple-400 dark:border-purple-600 shadow-2xs"
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

            {/* Read, Edit, Update, Delete Checkbox Chips */}
            {CRUD_COLUMNS.map((col) => {
              const allChecked = isActionAllChecked(col.action);
              const someChecked = isActionSomeChecked(col.action);

              return (
                <label
                  key={col.action}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer select-none whitespace-nowrap ${
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

          {/* Clear All & Count Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 whitespace-nowrap ml-auto">
            {selectedPermissions.length > 0 && (
              <button
                type="button"
                onClick={() => applyPreset("clear")}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
              >
                Clear All
              </button>
            )}

            <span className="text-[11px] font-mono font-semibold text-gray-500 dark:text-gray-400">
              Selected:{" "}
              <strong className="text-[var(--primary-color,#009fe3)]">
                {selectedPermissions.length}
              </strong>{" "}
              / {totalPossiblePermissions}
            </span>
          </div>
        </div>

        {/* Menu & Sub-Menu Permissions Hierarchy (Option 1 - Clean Described Way like Image 1) */}
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/80 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-2xs overflow-hidden">
          {PERMISSION_MODULES.map((mod, idx) => {
            const showSectionHeader =
              idx === 0 || PERMISSION_MODULES[idx - 1].category !== mod.category;
            const modKeys = mod.actions.map((act) => buildPermissionKey(mod.id, act));
            const isAllChecked =
              modKeys.length > 0 && modKeys.every((k) => selectedPermissions.includes(k));
            const isSomeChecked = modKeys.some((k) => selectedPermissions.includes(k));
            const checkedCount = modKeys.filter((k) => selectedPermissions.includes(k)).length;

            return (
              <React.Fragment key={mod.id}>
                {showSectionHeader && (
                  <div
                    style={{
                      backgroundColor: "var(--table-header-bg, var(--primary-color, #009fe3))",
                      color: "var(--table-header-text, var(--ui-on-accent, #ffffff))",
                    }}
                    className="px-3.5 py-1.5 border-b border-t first:border-t-0 border-black/10 dark:border-white/10 flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/90"></span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-inherit">
                        {mod.category} Section
                      </span>
                    </div>
                    <span className="text-[10px] font-medium bg-black/15 dark:bg-black/25 text-inherit px-2 py-0.5 rounded-full">
                      Sidebar Menus
                    </span>
                  </div>
                )}
                <div className="p-3 sm:p-3.5 transition-colors hover:bg-gray-50/30 dark:hover:bg-gray-800/20">
                {/* Parent Menu Header with Master Checkbox */}
                <div className="flex items-center justify-between gap-2 pb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <IndeterminateCheckbox
                      checked={isAllChecked}
                      indeterminate={isSomeChecked && !isAllChecked}
                      onChange={() => toggleRowAll(mod.id)}
                      className="rounded text-[var(--primary-color,#009fe3)] focus:ring-0 h-4 w-4"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-black dark:text-gray-100 group-hover:text-[var(--primary-color,#009fe3)] transition-colors">
                        {mod.name}
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {mod.category}
                      </span>
                      {mod.actions.length === 1 && (
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border ${
                            mod.actions[0] === "read"
                              ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                              : mod.actions[0] === "update"
                              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                              : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                          }`}
                        >
                          {mod.actions[0] === "read"
                            ? "View Only"
                            : mod.actions[0] === "update"
                            ? "Update Only"
                            : "Single Action"}
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Counter Badge */}
                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 shrink-0">
                    <strong className={checkedCount > 0 ? "text-[var(--primary-color,#009fe3)] font-bold" : "text-gray-400"}>
                      {checkedCount}
                    </strong>{" "}
                    / {mod.actions.length} selected
                  </span>
                </div>

                {/* Sub-menus Grid with Checkboxes */}
                <div className="pl-6 sm:pl-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                  {CRUD_COLUMNS.map((col) => {
                    const hasAction = mod.actions.includes(col.action);
                    if (!hasAction) return null; // Option 1: Only render valid backend actions!

                    const checked = isChecked(mod.id, col.action);
                    const subTitle = ACTION_TITLES[mod.id]?.[col.action] || `${col.label} ${mod.name}`;

                    return (
                      <label
                        key={col.action}
                        className={`flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                          checked
                            ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-2xs"
                            : "bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSingle(mod.id, col.action)}
                            className={`rounded h-4 w-4 shrink-0 ${col.checkboxColor}`}
                          />
                          <span className="font-semibold text-xs text-black dark:text-gray-200 truncate">
                            {subTitle}
                          </span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 border ${
                            checked ? col.activeBadgeClass : col.badgeClass
                          }`}
                        >
                          {col.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </React.Fragment>
          );
        })}
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

      {/* Assigned Branches List */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Assigned Branches with Active CRUD Grants ({permissions.length})
        </span>

        {isLoadingPerms || isLoadingBranches ? (
          <div className="py-6 flex flex-col items-center justify-center gap-1.5 text-gray-400 text-xs">
            <div className="w-5 h-5 border-2 border-[var(--primary-color,#009fe3)] border-t-transparent rounded-full animate-spin" />
            <span>Loading assigned permissions...</span>
          </div>
        ) : permissions.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            No branch access assigned yet. Select a branch above and check the permitted actions to grant access.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {permissions.map((p: any) => {
              const pId = p.id || p.permissionId;
              const bId = Number(p.branchId || p.branch_id);
              const branchObj = branches.find((b) => b.branchId === bId);
              const branchName = branchObj?.name || p.branchName || `Branch #${bId}`;
              const branchCode = branchObj?.code || p.branchCode || "";
              const permsList: string[] = Array.isArray(p.permissions) ? p.permissions : [];

              return (
                <div
                  key={pId || bId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs shadow-xs gap-2"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                      <FaBuilding />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black dark:text-gray-100 truncate block">
                          {branchName}
                        </span>
                        {branchCode && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            ({branchCode})
                          </span>
                        )}
                        {Boolean(p.primary) && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Primary
                          </span>
                        )}
                      </div>

                      {/* CRUD Capability Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {CRUD_COLUMNS.map((col) => {
                          const count = permsList.filter(
                            (k) => k.endsWith(`:${col.action}`) || k.endsWith(`.${col.action}`)
                          ).length;
                          if (count === 0) return null;
                          return (
                            <span
                              key={col.action}
                              className={`px-2 py-0.5 text-[9px] font-bold rounded-md border ${col.badgeClass}`}
                            >
                              {col.label} ({count})
                            </span>
                          );
                        })}
                        {permsList.length === 0 && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            No Access Assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleEditExisting(p)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                      title="Edit CRUD permissions"
                    >
                      <FaEdit size={11} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(pId)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                      title="Revoke branch access"
                    >
                      <FaTrash size={10} />
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchPermissionManager;
