import React, { useState, useMemo } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import {
  RefreshButton,
  StatsCards,
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
import { useEmployeeListQuery } from "@/hooks/useEmployeeQueries";
import { useBranchListQuery } from "@/hooks/useBranchQueries";
import type { EmployeeItem } from "@/types/employee.types";
import BranchPermissionModal from "../people/employee/components/BranchPermissionModal";
import {
  FaUserShield,
  FaShieldAlt,
  FaBuilding,
  FaLock,
  FaMobileAlt,
  FaUsers,
  FaCheckCircle,
  FaKey,
} from "react-icons/fa";

export const RolesAndPermissions: React.FC = () => {
  const { data: employees = [], isLoading, refetch, isRefetching } = useEmployeeListQuery();
  const { data: branches = [] } = useBranchListQuery();

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [permEmployee, setPermEmployee] = useState<EmployeeItem | null>(null);

  // Statistics
  const totalEmployees = employees.length;
  const appAccessCount = employees.filter((e) => e.hasAppAccess).length;
  const activeStaff = employees.filter((e) => e.active !== false).length;

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

  const statCards = [
    {
      title: "Total Staff",
      value: totalEmployees,
      icon: FaUsers,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
      iconBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Active Staff",
      value: activeStaff,
      icon: FaCheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "App Access Users",
      value: appAccessCount,
      icon: FaMobileAlt,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50/60 dark:bg-purple-950/20 border-purple-300 dark:border-purple-900",
      iconBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    },
    {
      title: "Organization Branches",
      value: branches.length,
      icon: FaBuilding,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900",
      iconBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
    },
  ];

  const roleDefinitions = [
    {
      name: "Super Admin / Owner",
      description: "Unrestricted global access to all branches, financial records, branch creation, and security roles.",
      badge: "Full Organization Access",
      color: "border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
    },
    {
      name: "Branch Manager",
      description: "Full operational authority strictly within assigned branches: Sales, Purchases, Stock, Parties, and Reports.",
      badge: "Branch Scoped",
      color: "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300",
    },
    {
      name: "Sales Executive / Cashier",
      description: "Point-of-sale invoice creation and customer payment collection strictly locked to assigned branch.",
      badge: "Branch POS Scoped",
      color: "border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300",
    },
    {
      name: "Store / Inventory Keeper",
      description: "Goods receipt, purchase voucher management, and inventory stock adjustments for assigned branch.",
      badge: "Branch Stock Scoped",
      color: "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300",
    },
  ];

  return (
    <div className="flex flex-col gap-3 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Roles & Branch Permissions"
          headerDescription="Manage staff access levels and enforce strict branch isolation policies"
        />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isRefetching} />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards cards={statCards} />

      {/* Strict Branch Isolation Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-sm flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-base shrink-0 mt-0.5">
          <FaLock />
        </div>
        <div>
          <h4 className="text-sm font-bold">Strict Branch Isolation Enforced</h4>
          <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
            Whoever is granted access to a specific branch can <strong>ONLY</strong> view and enter data for that branch. All other organization branches, invoices, and reports remain strictly hidden and inaccessible to them.
          </p>
        </div>
      </div>

      {/* Role Templates Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {roleDefinitions.map((role) => (
          <div
            key={role.name}
            className={`p-3.5 rounded-2xl border-l-4 border bg-white dark:bg-gray-800 shadow-xs flex flex-col justify-between gap-2 ${role.color}`}
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-bold text-xs text-gray-900 dark:text-gray-100">{role.name}</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">{role.description}</p>
            </div>
            <span className="self-start px-2 py-0.5 rounded-full text-[9px] font-bold bg-white dark:bg-gray-900 border border-current shadow-2xs">
              {role.badge}
            </span>
          </div>
        ))}
      </div>

      {/* 4-Tier CRUD Control Standard Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Read (View)</span>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
            Browse tables, search invoices, inspect reports and view customer balances.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>Post (Create)</span>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
            Create new sales, generate purchase bills, receive payments and add stock.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <span>Update (Edit)</span>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
            Edit drafted bills, update sale prices, modify party info and adjust counts.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            <span>Delete (Revoke)</span>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
            Void invoices, cancel transactions, delete records and revoke entries.
          </p>
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
              <TableSkeleton columnCount={7} rowCount={5} />
            </div>
          ) : (
            <Table minWidth={950}>
              <TableHead>
                <TableTh width={50} align="center">SL</TableTh>
                <TableTh width={240}>Staff Member</TableTh>
                <TableTh width={110} align="center">Code</TableTh>
                <TableTh width={140}>Designation</TableTh>
                <TableTh width={130}>System Role</TableTh>
                <TableTh width={120} align="center">App Access</TableTh>
                <TableTh width={160} align="center">Branch Permissions</TableTh>
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
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[var(--primary-color-light,#e0f2fe)] text-[var(--primary-color,#009fe3)] flex items-center justify-center text-xs font-bold shrink-0">
                              {(emp.fullName || "E").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate block">
                                {emp.fullName || `Staff #${empId}`}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {emp.phoneNumber || "No phone"}
                              </span>
                            </div>
                          </div>
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

                        {/* Role */}
                        <TableCell>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[var(--primary-color,#009fe3)] dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800">
                            {emp.role || "EMPLOYEE"}
                          </span>
                        </TableCell>

                        {/* App Access */}
                        <TableCell align="center">
                          {emp.hasAppAccess ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <FaMobileAlt size={9} />
                              <span>Enabled</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Disabled</span>
                          )}
                        </TableCell>

                        {/* Branch Permissions action */}
                        <TableCell align="center">
                          <button
                            type="button"
                            onClick={() => setPermEmployee(emp)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--primary-color,#009fe3)] text-white hover:bg-[var(--primary-color-hover,#008bc7)] transition-colors cursor-pointer shadow-2xs"
                          >
                            <FaShieldAlt size={10} />
                            <span>Manage Access</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>
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

      {/* Branch Permission Modal */}
      <BranchPermissionModal
        isOpen={Boolean(permEmployee)}
        onClose={() => setPermEmployee(null)}
        employee={permEmployee}
      />
    </div>
  );
};

export default RolesAndPermissions;
