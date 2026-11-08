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

  const toggleColumnAll = (action: CrudAction) => {
    const colKeys = PERMISSION_MODULES.filter((m) => m.actions.includes(action)).map((m) =>
      buildPermissionKey(m.id, action)
    );
    const allColChecked = colKeys.every((k) => selectedPermissions.includes(k));

    if (allColChecked) {
      setSelectedPermissions((prev) => prev.filter((k) => !colKeys.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...colKeys])));
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
      size="xl"
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
      <div className="flex flex-col gap-4 py-1 text-xs">
        {/* Strict Branch Policy Notice */}
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5">
          <FaLock className="text-[var(--primary-color,#009fe3)] text-xs mt-0.5 shrink-0" />
          <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
            <strong>Senior Developer Security Standard:</strong> Granular 4-tier CRUD access (Read, Post/Create, Update, Delete). The employee can ONLY execute the exact checked actions in their assigned branch.
          </p>
        </div>

        {/* Matrix Configuration Card */}
        <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2.5">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
              <FaUserCog className="text-[var(--primary-color,#009fe3)]" />
              <span>
                {editingPermissionId ? "Edit Branch CRUD Access" : "Assign Branch with CRUD Permissions"}
              </span>
            </div>

            {/* Branch Selector & Primary Checkbox */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                  Target Branch *:
                </span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : "")}
                  disabled={isSaving || Boolean(editingPermissionId)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary-color,#009fe3)] font-medium disabled:opacity-60"
                >
                  <option value="">
                    {availableBranches.length === 0
                      ? "All branches already assigned"
                      : "Select branch..."}
                  </option>
                  {availableBranches.map((b) => (
                    <option key={b.branchId} value={b.branchId}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg select-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  disabled={isSaving}
                  className="rounded border-gray-300 text-[var(--primary-color,#009fe3)] focus:ring-0 cursor-pointer"
                />
                <span>Primary Branch</span>
              </label>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500 mr-1">Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Full Access (CRUD)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("operator")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-[var(--primary-color,#009fe3)] border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Standard Operator (No Delete)
              </button>
              <button
                type="button"
                onClick={() => applyPreset("cashier")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                Cashier / POS Only
              </button>
              <button
                type="button"
                onClick={() => applyPreset("readonly")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Read Only
              </button>
              <button
                type="button"
                onClick={() => applyPreset("clear")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <span className="text-[11px] font-mono font-semibold text-gray-500">
              Selected: <strong className="text-[var(--primary-color,#009fe3)]">{selectedPermissions.length}</strong> / {totalPossiblePermissions}
            </span>
          </div>

          {/* Interactive CRUD Matrix Table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/80 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2.5 px-3">Module / Resource</th>
                  <th className="py-2.5 px-2 text-center w-16">All</th>
                  <th className="py-2.5 px-2 text-center w-24">
                    <button
                      type="button"
                      onClick={() => toggleColumnAll("read")}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      title="Toggle Read for all modules"
                    >
                      Read (View)
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-center w-24">
                    <button
                      type="button"
                      onClick={() => toggleColumnAll("create")}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      title="Toggle Create for all modules"
                    >
                      Post (Create)
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-center w-24">
                    <button
                      type="button"
                      onClick={() => toggleColumnAll("update")}
                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      title="Toggle Update for all modules"
                    >
                      Update (Edit)
                    </button>
                  </th>
                  <th className="py-2.5 px-2 text-center w-24">
                    <button
                      type="button"
                      onClick={() => toggleColumnAll("delete")}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      title="Toggle Delete for all modules"
                    >
                      Delete (Revoke)
                    </button>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {PERMISSION_MODULES.map((mod) => {
                  const hasRead = mod.actions.includes("read");
                  const hasCreate = mod.actions.includes("create");
                  const hasUpdate = mod.actions.includes("update");
                  const hasDelete = mod.actions.includes("delete");

                  const modKeys = mod.actions.map((act) => buildPermissionKey(mod.id, act));
                  const isAllRowChecked = modKeys.every((k) => selectedPermissions.includes(k));

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
                              : "text-gray-400 hover:text-gray-600"
                          }`}
                          title={`Toggle all ${mod.name} actions`}
                        >
                          <FaCheckDouble size={11} />
                        </button>
                      </td>

                      {/* Read */}
                      <td className="py-2 px-2 text-center">
                        {hasRead ? (
                          <input
                            type="checkbox"
                            checked={isChecked(mod.id, "read")}
                            onChange={() => toggleSingle(mod.id, "read")}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                          />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Create (Post) */}
                      <td className="py-2 px-2 text-center">
                        {hasCreate ? (
                          <input
                            type="checkbox"
                            checked={isChecked(mod.id, "create")}
                            onChange={() => toggleSingle(mod.id, "create")}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                          />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Update */}
                      <td className="py-2 px-2 text-center">
                        {hasUpdate ? (
                          <input
                            type="checkbox"
                            checked={isChecked(mod.id, "update")}
                            onChange={() => toggleSingle(mod.id, "update")}
                            className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                          />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="py-2 px-2 text-center">
                        {hasDelete ? (
                          <input
                            type="checkbox"
                            checked={isChecked(mod.id, "delete")}
                            onChange={() => toggleSingle(mod.id, "delete")}
                            className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                          />
                        ) : (
                          <span className="text-gray-300 dark:text-gray-700 text-xs">—</span>
                        )}
                      </td>
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

                const readCount = permsList.filter((k) => k.endsWith(":read") || k.endsWith(".read")).length;
                const createCount = permsList.filter((k) => k.endsWith(":create") || k.endsWith(".create")).length;
                const updateCount = permsList.filter((k) => k.endsWith(":update") || k.endsWith(".update")).length;
                const deleteCount = permsList.filter((k) => k.endsWith(":delete") || k.endsWith(".delete")).length;

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
                          {readCount > 0 && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Read ({readCount})
                            </span>
                          )}
                          {createCount > 0 && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Post/Create ({createCount})
                            </span>
                          )}
                          {updateCount > 0 && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Update ({updateCount})
                            </span>
                          )}
                          {deleteCount > 0 && (
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Delete ({deleteCount})
                            </span>
                          )}
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
