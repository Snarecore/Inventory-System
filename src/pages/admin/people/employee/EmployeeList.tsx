import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/page-header/PageHeader";
import {
  Button,
  RefreshButton,
  StatsCards,
  Search,
  EmptyState,
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
} from "@/components/common";
import { useEmployeeListQuery, useUpdateEmployeeMutation } from "@/hooks/useEmployeeQueries";
import type { EmployeeItem } from "@/types/employee.types";
import { exportEmployeesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import EmployeeDetailsModal from "./components/EmployeeDetailsModal";
import { usePermission } from "@/hooks/usePermission";
import {
  FaUserTie,
  FaCheckCircle,
  FaTimesCircle,
  FaMobileAlt,
  FaPlus,
  FaBuilding,
  FaShieldAlt,
  FaEdit,
  FaEye,
  FaFileExcel,
  FaPowerOff,
} from "react-icons/fa";

export const EmployeeList: React.FC = () => {
  const navigate = useNavigate();
  const { canCreate, canUpdate } = usePermission();
  const { data: employees = [], isLoading, refetch, isRefetching } = useEmployeeListQuery();
  const updateMutation = useUpdateEmployeeMutation();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "app">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Selected employee for view details modal
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);

  // Statistics counts
  const activeCount = useMemo(
    () => employees.filter((e) => e.active !== false).length,
    [employees]
  );
  const inactiveCount = employees.length - activeCount;
  const appAccessCount = useMemo(
    () => employees.filter((e) => e.hasAppAccess).length,
    [employees]
  );

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Tab filter
      if (filter === "active" && emp.active === false) return false;
      if (filter === "inactive" && emp.active !== false) return false;
      if (filter === "app" && !emp.hasAppAccess) return false;

      // Text search
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = (emp.fullName || "").toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const phone = (emp.phoneNumber || "").toLowerCase();
      const desig = (emp.designation || "").toLowerCase();
      const dept = (emp.department || "").toLowerCase();

      return (
        name.includes(q) ||
        code.includes(q) ||
        phone.includes(q) ||
        desig.includes(q) ||
        dept.includes(q)
      );
    });
  }, [employees, search, filter]);

  // Pagination
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEmployees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, safeCurrentPage, pageSize]);

  // Toggle active/inactive status
  const handleToggleStatus = (item: EmployeeItem) => {
    const empId = item.id || (item as any)?.employeeId;
    if (!empId) return;

    const nextStatus = item.active === false ? true : false;
    setBusyId(empId);

    updateMutation.mutate(
      { id: empId, data: { active: nextStatus } },
      {
        onSuccess: () => {
          showSuccessToast(
            `Employee marked as ${nextStatus ? "Active" : "Inactive"} successfully!`
          );
        },
        onSettled: () => setBusyId(null),
      }
    );
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredEmployees.length > 0 ? filteredEmployees : employees;
      if (dataToExport.length === 0) {
        showErrorToast("No employee records to export.");
        return;
      }
      exportEmployeesToExcel(dataToExport);
      showSuccessToast(`Exported ${dataToExport.length} employee records to Excel!`);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to export employees to Excel");
    }
  };

  // Stats cards matching BranchList design
  const statCards = [
    {
      title: "Total Employees",
      value: employees.length,
      icon: FaUserTie,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
      iconBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Active Staff",
      value: activeCount,
      icon: FaCheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Inactive Staff",
      value: inactiveCount,
      icon: FaTimesCircle,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900",
      iconBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400",
    },
    {
      title: "App Access Users",
      value: appAccessCount,
      icon: FaMobileAlt,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50/60 dark:bg-purple-950/20 border-purple-300 dark:border-purple-900",
      iconBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Employee Management"
          headerDescription="Manage all staff profiles, branch assignments, payroll and mobile app access"
        />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isRefetching} />
          <Button
            label="Export Excel"
            onClick={handleExportExcel}
            variant="secondary"
            icon={<FaFileExcel className="text-emerald-600 text-xs" />}
            buttonClass="!text-xs !py-1.5 !w-auto justify-center font-medium cursor-pointer"
          />
          {canCreate("employee") && (
            <Button
              label="Add Employee"
              onClick={() => navigate("/admin/employee-entry")}
              color="var(--primary-color)"
              hoverColor="var(--primary-color-hover)"
              icon={<FaPlus className="text-white text-xs" />}
              buttonClass="!text-xs !py-1.5 !w-auto justify-center font-medium !text-white cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards cards={statCards} />

      {/* Table Container */}
      <TableContainer className="w-full">
        {/* Table Toolbar */}
        <TableToolbar>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            {/* Search */}
            <div className="w-full sm:w-72">
              <Search
                searchQuery={search}
                onSearchChange={(v) => {
                  setSearch(v);
                  setCurrentPage(1);
                }}
                placeholder="Search employee name, code, phone, role..."
              />
            </div>

            {/* Filter Tabs matching BranchList */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
              {[
                { key: "all", label: "All Employees", count: employees.length },
                { key: "active", label: "Active", count: activeCount },
                { key: "inactive", label: "Inactive", count: inactiveCount },
                { key: "app", label: "App Access", count: appAccessCount },
              ].map((tab) => {
                const on = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setFilter(tab.key as any);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      on
                        ? "bg-blue-50 dark:bg-blue-950/60 text-[var(--primary-color,#009fe3)] border border-blue-200 dark:border-blue-800 shadow-2xs"
                        : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        on
                          ? "bg-blue-200/60 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </TableToolbar>

        {/* Table Scroll Area */}
        <TableScroll>
          {isLoading && employees.length === 0 ? (
            <div className="p-3">
              <TableSkeleton columnCount={9} rowCount={5} />
            </div>
          ) : (
            <Table minWidth={1000}>
              <TableHead>
                <TableTh width={50} align="center">SL</TableTh>
                <TableTh width={230}>Employee Name</TableTh>
                <TableTh width={110} align="center">Code</TableTh>
                <TableTh width={130}>Phone</TableTh>
                <TableTh width={170}>Designation</TableTh>
                <TableTh width={140}>Department</TableTh>
                <TableTh width={110} align="center">App Access</TableTh>
                <TableTh width={100} align="center">Status</TableTh>
                <TableTh width={150} align="center">Actions</TableTh>
              </TableHead>

              <TableBody>
                {paginatedEmployees.length > 0 ? (
                  paginatedEmployees.map((item, idx) => {
                    const empId = item.id || (item as any)?.employeeId || idx;
                    const isBusy = busyId === empId;

                    return (
                      <TableRow key={empId}>
                        {/* SL */}
                        <TableCell align="center" className="text-gray-600 dark:text-gray-400 font-normal text-xs">
                          {(safeCurrentPage - 1) * pageSize + idx + 1}
                        </TableCell>

                        {/* Employee Name */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--primary-color-light,#e0f2fe)] text-[var(--primary-color,#009fe3)] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {(item.fullName || "E").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate block">
                              {item.fullName || `Employee #${empId}`}
                            </span>
                          </div>
                        </TableCell>

                        {/* Code */}
                        <TableCell align="center">
                          {item.employeeCode ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {item.employeeCode}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate block font-mono">
                            {item.phoneNumber || "-"}
                          </span>
                        </TableCell>

                        {/* Designation */}
                        <TableCell>
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate block">
                            {item.designation || "-"}
                          </span>
                        </TableCell>

                        {/* Department */}
                        <TableCell>
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate block">
                            {item.department || "-"}
                          </span>
                        </TableCell>

                        {/* App Access */}
                        <TableCell align="center">
                          {item.hasAppAccess ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[var(--primary-color,#009fe3)] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              title={`Username: ${item.appUsername || item.phoneNumber}`}
                            >
                              <FaMobileAlt size={9} />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.active !== false
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {item.active !== false ? "Active" : "Inactive"}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details button */}
                            <button
                              type="button"
                              onClick={() => setSelectedEmployee(item)}
                              title="View Complete Profile"
                              className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            >
                              <FaEye size={13} />
                            </button>

                            {/* Branch Role & CRUD Permissions button -> Navigates directly to Role Management */}
                            {canUpdate("employee") && (
                              <button
                                type="button"
                                onClick={() => {
                                  const empId = item.id || (item as any)?.employeeId;
                                  navigate(`/admin/settings/roles?employeeId=${empId}`);
                                }}
                                title="Manage Role & Branch Permissions"
                                className="p-1 rounded text-[var(--primary-color)] hover:bg-[var(--primary-color-muted,#e0f2fe)] transition-colors cursor-pointer"
                              >
                                <FaShieldAlt size={13} />
                              </button>
                            )}

                            {/* Edit button */}
                            {canUpdate("employee") && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate("/admin/employee-entry", {
                                    state: { employee: item },
                                  })
                                }
                                title="Edit Employee"
                                className="p-1 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              >
                                <FaEdit size={13} />
                              </button>
                            )}

                            {/* Active/Inactive Power toggle */}
                            {canUpdate("employee") && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleStatus(item)}
                                title={item.active !== false ? "Deactivate Employee" : "Activate Employee"}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  item.active !== false
                                    ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                }`}
                              >
                                <FaPowerOff size={12} className={isBusy ? "animate-spin opacity-50" : ""} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyState
                        title="No employees found"
                        description={
                          search
                            ? `No employee matching "${search}"`
                            : "No employee records exist for this organization yet."
                        }
                        actionText={canCreate("employee") ? "Add Employee" : undefined}
                        onAction={canCreate("employee") ? () => navigate("/admin/employee-entry") : undefined}
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

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        isOpen={Boolean(selectedEmployee)}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
        onOpenBranchPermissions={(emp) => {
          setSelectedEmployee(null);
          const empId = emp.id || (emp as any)?.employeeId;
          navigate(`/admin/settings/roles?employeeId=${empId}`);
        }}
      />
    </div>
  );
};

export default EmployeeList;
