import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/page-header/PageHeader";
import {
  RefreshButton,
  Search,
  TableSkeleton,
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
  TablePaginationFooter,
  EmptyState,
} from "@/components/common";
import {
  useEmployeeListQuery,
  useEmployeeBranchPermissionsQuery,
} from "@/hooks/useEmployeeQueries";
import { useBranchListQuery } from "@/hooks/useBranchQueries";
import { useQueryClient } from "@tanstack/react-query";
import { employeeBranchPermissionsQueryKey } from "@/config/query-key";
import {
  getLocalEmployeeBranchPermissions,
  deleteEmployeeBranchPermission,
} from "@/services/employee-service";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import type { EmployeeItem } from "@/types/employee.types";
import type { BranchItem } from "@/types/branch.types";
import BranchPermissionManager from "./components/BranchPermissionManager";
import {
  FaShieldAlt,
  FaEdit,
  FaTrash,
} from "react-icons/fa";

interface EmployeeAssignedBranchProps {
  employee: EmployeeItem;
  branches: BranchItem[];
  onSelectEmployee?: (emp: EmployeeItem, branchId?: number) => void;
}

const EmployeeAssignedBranch: React.FC<EmployeeAssignedBranchProps> = ({
  employee,
  branches,
  onSelectEmployee,
}) => {
  const empId = employee.id || (employee as any)?.employeeId;
  const { data: dbPermissions = [] } = useEmployeeBranchPermissionsQuery(
    Number(empId),
    {
      enabled: Boolean(empId),
      staleTime: 60 * 1000,
    }
  );

  const localPerms = useMemo(() => {
    return empId ? getLocalEmployeeBranchPermissions(Number(empId)) : [];
  }, [empId]);

  const activePerms = dbPermissions.length > 0 ? dbPermissions : localPerms;

  const assignedBranches = useMemo(() => {
    const list: { branchId: number; name: string; isPrimary: boolean }[] = [];

    if (activePerms && activePerms.length > 0) {
      activePerms.forEach((p: any) => {
        const bId = Number(p.branchId || p.branch_id);
        const branchMatch = branches.find(
          (b) => Number(b.id ?? b.branchId) === bId
        );
        const name = branchMatch?.name || p.branchName || `Branch #${bId}`;
        list.push({
          branchId: bId,
          name,
          isPrimary: Boolean(p.primary),
        });
      });
    }

    if (list.length === 0) {
      const directBranchName = (employee as any)?.branchName;
      const directBranchId = Number((employee as any)?.branchId);
      if (directBranchName) {
        list.push({
          branchId: directBranchId || 0,
          name: directBranchName,
          isPrimary: true,
        });
      } else if (directBranchId) {
        const branchMatch = branches.find(
          (b) => Number(b.id ?? b.branchId) === directBranchId
        );
        if (branchMatch) {
          list.push({
            branchId: directBranchId,
            name: branchMatch.name,
            isPrimary: true,
          });
        }
      }
    }

    return list;
  }, [activePerms, branches, employee]);

  if (assignedBranches.length === 0) {
    return (
      <span className="text-gray-400 dark:text-gray-500 text-xs italic">
        Not Assigned
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assignedBranches.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelectEmployee?.(employee, item.branchId)}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer hover:border-[var(--primary-color,#009fe3)] hover:shadow-2xs ${
            item.isPrimary
              ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
          }`}
          title="Click to view & edit assigned permissions for this branch"
        >
          <span className="truncate max-w-[120px]">{item.name}</span>
          {item.isPrimary && (
            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-sky-200/80 dark:bg-sky-800 text-sky-800 dark:text-sky-100 font-bold ml-0.5">
              Primary
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

interface EmployeeActionCellProps {
  employee: EmployeeItem;
  branches: BranchItem[];
  onSelectEmployee: (emp: EmployeeItem, branchId?: number) => void;
}

const EmployeeActionCell: React.FC<EmployeeActionCellProps> = ({
  employee,
  branches,
  onSelectEmployee,
}) => {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const empId = employee.id || (employee as any)?.employeeId;
  const { data: dbPermissions = [], refetch } = useEmployeeBranchPermissionsQuery(
    Number(empId),
    {
      enabled: Boolean(empId),
      staleTime: 60 * 1000,
    }
  );

  const localPerms = useMemo(() => {
    return empId ? getLocalEmployeeBranchPermissions(Number(empId)) : [];
  }, [empId]);

  const activePerms = dbPermissions.length > 0 ? dbPermissions : localPerms;

  const firstBranchId = useMemo(() => {
    if (activePerms && activePerms.length > 0) {
      const primaryPerm = activePerms.find((p: any) => Boolean(p.primary)) || activePerms[0];
      return Number(primaryPerm?.branchId || primaryPerm?.branch_id) || undefined;
    }
    const directBranchId = Number((employee as any)?.branchId);
    if (directBranchId) return directBranchId;
    return undefined;
  }, [activePerms, employee]);

  const hasAccess = Boolean(firstBranchId);

  const handleDeleteAllAccess = async () => {
    if (!empId) return;
    const staffName = employee.fullName || `Staff #${empId}`;
    if (!window.confirm(`Are you sure you want to revoke all branch access for ${staffName}?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      if (activePerms && activePerms.length > 0) {
        await Promise.all(
          activePerms.map(async (p: any) => {
            const pId = Number(p.id || p.permissionId);
            if (pId && pId > 0) {
              try {
                await deleteEmployeeBranchPermission(pId, Number(empId));
              } catch (err) {
                console.warn(`Could not delete permission ID ${pId} on backend:`, err);
              }
            }
          })
        );
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`cb_emp_branch_permissions_${empId}`);
        } catch {}
      }

      await queryClient.invalidateQueries({ queryKey: [employeeBranchPermissionsQueryKey] });
      await queryClient.invalidateQueries({ queryKey: [employeeBranchPermissionsQueryKey, Number(empId)] });
      refetch();

      showSuccessToast(`All branch access revoked for ${staffName}!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to revoke branch permissions");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      {hasAccess ? (
        <>
          <button
            type="button"
            onClick={() => onSelectEmployee(employee, firstBranchId)}
            className="p-1.5 rounded-lg bg-[var(--primary-color,#009fe3)] text-white hover:bg-[var(--primary-color-hover,#008bc7)] transition-colors cursor-pointer shadow-2xs"
            title="Edit branch permissions"
          >
            <FaEdit size={11} />
          </button>
          <button
            type="button"
            onClick={handleDeleteAllAccess}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            title="Revoke all branch access for this staff member"
          >
            <FaTrash size={11} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onSelectEmployee(employee)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer shadow-2xs"
          title="Assign branch permissions"
        >
          <FaShieldAlt size={10} />
          <span>Manage Access</span>
        </button>
      )}
    </div>
  );
};

export const RolesAndPermissions: React.FC = () => {
  const { data: employees = [], isLoading, refetch, isRefetching } = useEmployeeListQuery();
  const { data: branches = [] } = useBranchListQuery();

  const [searchParams, setSearchParams] = useSearchParams();
  const urlEmployeeId = searchParams.get("employeeId");
  const urlBranchId = searchParams.get("branchId");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [permEmployee, setPermEmployee] = useState<EmployeeItem | null>(null);
  const [targetBranchId, setTargetBranchId] = useState<number | undefined>(undefined);

  // Sync employee with URL search params if present
  useEffect(() => {
    if (urlEmployeeId && employees.length > 0) {
      const match = employees.find(
        (e) => String(e.id || (e as any)?.employeeId) === String(urlEmployeeId)
      );
      if (match) {
        setPermEmployee(match);
        if (urlBranchId) {
          setTargetBranchId(Number(urlBranchId));
        }
      }
    } else if (!urlEmployeeId) {
      setPermEmployee(null);
      setTargetBranchId(undefined);
    }
  }, [urlEmployeeId, urlBranchId, employees]);

  const handleSelectEmployee = (emp: EmployeeItem | null, branchId?: number) => {
    setPermEmployee(emp);
    setTargetBranchId(branchId);
    if (emp) {
      const id = emp.id || (emp as any)?.employeeId;
      if (id) {
        const params: Record<string, string> = { employeeId: String(id) };
        if (branchId) {
          params.branchId = String(branchId);
        }
        setSearchParams(params);
      }
    } else {
      setSearchParams({});
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        (e.fullName || "").toLowerCase().includes(q) ||
        (e.employeeCode || "").toLowerCase().includes(q) ||
        (e.phoneNumber || "").toLowerCase().includes(q) ||
        (e.designation || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEmployees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, safeCurrentPage, pageSize]);

  if (permEmployee) {
    return (
      <div className="flex flex-col gap-3 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full font-sans">
        {/* Dedicated In-Page Manager */}
        <BranchPermissionManager
          employee={permEmployee}
          onBack={() => handleSelectEmployee(null)}
          initialBranchId={targetBranchId}
        />
      </div>
    );
  }

  // Staff Directory & Overview View
  return (
    <div className="flex flex-col gap-3 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Role Management & Branch Permissions"
          headerDescription="Manage staff access levels, branch assignments, and enforce strict branch isolation policies"
        />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isRefetching} />
        </div>
      </div>

      {/* Staff Permissions Table */}
      <TableContainer className="w-full">
        <TableToolbar>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            <div className="w-full sm:w-80">
              <Search
                searchQuery={search}
                onSearchChange={(v) => {
                  setSearch(v);
                  setCurrentPage(1);
                }}
                placeholder="Search staff name, code, designation..."
              />
            </div>
            <div className="text-xs text-gray-500 font-semibold">
              Showing {filteredEmployees.length} registered staff members
            </div>
          </div>
        </TableToolbar>

        <TableScroll>
          {isLoading && employees.length === 0 ? (
            <div className="p-3">
              <TableSkeleton columnCount={8} rowCount={5} />
            </div>
          ) : (
            <Table minWidth={1000}>
              <TableHead>
                <TableTh width={50} align="center">SL</TableTh>
                <TableTh width={200}>Staff Member</TableTh>
                <TableTh width={130}>Phone</TableTh>
                <TableTh width={100} align="center">Code</TableTh>
                <TableTh width={140}>Designation</TableTh>
                <TableTh width={180}>Assigned Branch</TableTh>
                <TableTh width={110} align="center">System Role</TableTh>
                <TableTh width={150} align="center">Action</TableTh>
              </TableHead>

              <TableBody>
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((emp, idx) => {
                    const empId = emp.id || (emp as any)?.employeeId || idx;
                    return (
                      <TableRow key={empId}>
                        {/* SL */}
                        <TableCell align="center" className="text-gray-600 dark:text-gray-400 font-normal text-xs">
                          {(safeCurrentPage - 1) * pageSize + idx + 1}
                        </TableCell>

                        {/* Staff Member */}
                        <TableCell>
                          <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate block">
                            {emp.fullName || `Staff #${empId}`}
                          </span>
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                            {emp.phoneNumber || "-"}
                          </span>
                        </TableCell>

                        {/* Code */}
                        <TableCell align="center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {emp.employeeCode || `EMP-${empId}`}
                          </span>
                        </TableCell>

                        {/* Designation */}
                        <TableCell>
                          <span className="text-xs text-gray-800 dark:text-gray-200">
                            {emp.designation || emp.department || "Staff"}
                          </span>
                        </TableCell>

                        {/* Assigned Branch */}
                        <TableCell>
                          <EmployeeAssignedBranch
                            employee={emp}
                            branches={branches}
                            onSelectEmployee={handleSelectEmployee}
                          />
                        </TableCell>

                        {/* Role */}
                        <TableCell align="center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[var(--primary-color,#009fe3)] dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                            {emp.role || "EMPLOYEE"}
                          </span>
                        </TableCell>

                        {/* Branch Permissions action */}
                        <TableCell align="center">
                          <EmployeeActionCell
                            employee={emp}
                            branches={branches}
                            onSelectEmployee={handleSelectEmployee}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState
                        title="No staff members found"
                        description="Try adjusting your search criteria."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableScroll>

        {/* Table Pagination Footer */}
        <TablePaginationFooter
          totalItems={totalItems}
          currentPage={safeCurrentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setCurrentPage(1);
          }}
        />
      </TableContainer>
    </div>
  );
};

export default RolesAndPermissions;
