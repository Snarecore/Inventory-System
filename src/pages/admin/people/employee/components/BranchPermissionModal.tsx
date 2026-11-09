import React, { useState } from "react";
import { Modal, Button } from "@/components/common";
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
  FaCheck,
  FaCheckDouble,
  FaUserCog,
  FaLock,
  FaEdit,
  FaTimes,
} from "react-icons/fa";

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

const IndeterminateCheckbox: React.FC<IndeterminateCheckboxProps> = ({
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

interface BranchPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeItem | null;
}

export const BranchPermissionModal: React.FC<BranchPermissionModalProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const employeeId = employee?.id || (employee as any)?.employeeId || 0;

  // Live branches for organization
  const { data: branches = [], isLoading: isLoadingBranches } = useBranchListQuery({
    enabled: isOpen,
  });

  // Current assigned branch permissions
  const {
    data: permissions = [],
    isLoading: isLoadingPerms,
    refetch,
  } = useEmployeeBranchPermissionsQuery(employeeId, {
    enabled: isOpen && Boolean(employeeId),
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

  if (!isOpen || !employee) return null;

  const activeBranches = branches.filter((b) => b.active);
  const assignedBranchIds = new Set(
    permissions.map((p: any) => Number(p.branchId || p.branch_id))
  );

  // Available branches: only show unassigned branches unless we are currently editing an existing assignment
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
      // Uncheck all in row
      setSelectedPermissions((prev) => prev.filter((k) => !modKeys.includes(k)));
    } else {
      // Check all in row
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

    // Check if permission already exists for this branch in the database to prevent duplicate error
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

    // Synthesize standard permissions if permsList was empty
    if (permsList.length === 0) {
      if (perm.canView) {
        permsList.push(
          "sales:read",
          "purchase:read",
          "inventory:read",
          "parties:read",
          "accounts:read",
          "reports:read"
        );
      }
      if (perm.canEdit) {
        permsList.push(
          "sales:create",
          "sales:update",
          "purchase:create",
          "purchase:update",
          "inventory:create",
          "inventory:update",
          "parties:create",
          "parties:update",
          "accounts:create",
          "accounts:update"
        );
      }
      if (perm.canDelete) {
        permsList.push(
          "sales:delete",
          "purchase:delete",
          "inventory:delete",
          "parties:delete",
          "accounts:delete"
        );
      }
    }

    setSelectedBranchId(bId);
    setSelectedPermissions(permsList);
    setIsPrimary(Boolean(perm.primary));
    setEditingPermissionId(pId);
  };

  const handleRemove = (permissionId: number) => {
    if (!permissionId || Number(permissionId) <= 0) return;
    deleteMutation.mutate({ permissionId: Number(permissionId), employeeId });
  };

  const totalPossiblePermissions = getAllSystemPermissionKeys().length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      size="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary-color-light,#e0f2fe)] text-[var(--primary-color,#009fe3)] flex items-center justify-center text-sm">
            <FaShieldAlt />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">
              Branch CRUD Permissions Matrix
            </h3>
            <p className="text-[11px] text-gray-500 font-normal">
              {employee.fullName} ({employee.employeeCode || `ID #${employeeId}`})
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-1 text-xs">
        {/* Strict Branch Policy Notice */}
        <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <FaLock className="text-[var(--primary-color,#009fe3)] text-xs shrink-0" />
            <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-tight">
              <strong>Senior Developer Security Standard:</strong> Granular 4-tier CRUD access (Read, Post/Create, Update, Delete). The employee can ONLY execute the exact checked actions in their assigned branch.
            </p>
          </div>
        </div>

        {/* Matrix Configuration Card */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex flex-col gap-2.5">
          {/* Row 1: Title, Target Branch Selector, Primary Branch Checkbox - ALL IN ONE SINGLE LINE */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2.5 flex-nowrap">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 shrink-0">
              <FaUserCog className="text-[var(--primary-color,#009fe3)] text-sm" />
              <span className="text-xs sm:text-sm whitespace-nowrap">
                {editingPermissionId ? "Edit Branch CRUD Access" : "Assign Branch with CRUD Permissions"}
              </span>
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

          {/* Interactive CRUD Matrix Table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/80 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2.5 px-3">Module / Resource</th>
                  <th className="py-2.5 px-2 text-center w-14">All</th>
                  {CRUD_COLUMNS.map((col) => {
                    const allChecked = isActionAllChecked(col.action);
                    const someChecked = isActionSomeChecked(col.action);

                    return (
                      <th key={col.action} className="py-2.5 px-2 text-center w-24">
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer group select-none">
                          <IndeterminateCheckbox
                            checked={allChecked}
                            indeterminate={someChecked && !allChecked}
                            onChange={() => toggleColumnAll(col.action)}
                            className={`rounded h-3.5 w-3.5 ${col.checkboxColor}`}
                          />
                          <span
                            className={`text-[11px] font-bold group-hover:underline ${col.headerTextColor}`}
                            title={col.tooltip}
                          >
                            {col.tableLabel}
                          </span>
                        </label>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {PERMISSION_MODULES.map((mod) => {
                  const modKeys = mod.actions.map((act) => buildPermissionKey(mod.id, act));
                  const isAllRowChecked =
                    modKeys.length > 0 && modKeys.every((k) => selectedPermissions.includes(k));
                  const isSomeRowChecked = modKeys.some((k) => selectedPermissions.includes(k));

                  return (
                    <tr
                      key={mod.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* Module info */}
                      <td className="py-2 px-3">
                        <span className="font-bold text-gray-800 dark:text-gray-100 block text-xs">
                          {mod.name}
                        </span>
                        <span className="text-[10px] text-gray-400 leading-tight block">
                          {mod.description}
                        </span>
                      </td>

                      {/* Row All Toggle */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleRowAll(mod.id)}
                          className={`p-1 rounded text-[11px] transition-colors cursor-pointer ${
                            isAllRowChecked
                              ? "text-[var(--primary-color,#009fe3)] font-bold bg-blue-50 dark:bg-blue-950/60"
                              : isSomeRowChecked
                              ? "text-[var(--primary-color,#009fe3)] opacity-70"
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                          title={`Toggle all ${mod.name} actions`}
                        >
                          <FaCheckDouble size={11} />
                        </button>
                      </td>

                      {/* Dynamic CRUD Action Columns */}
                      {CRUD_COLUMNS.map((col) => {
                        const hasAction = mod.actions.includes(col.action);
                        return (
                          <td key={col.action} className="py-2 px-2 text-center">
                            {hasAction ? (
                              <input
                                type="checkbox"
                                checked={isChecked(mod.id, col.action)}
                                onChange={() => toggleSingle(mod.id, col.action)}
                                className={`rounded h-4 w-4 cursor-pointer ${col.checkboxColor}`}
                              />
                            ) : (
                              <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
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
                          <span className="font-bold text-gray-800 dark:text-gray-100 truncate block">
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
    </Modal>
  );
};

export default BranchPermissionModal;
