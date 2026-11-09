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
  ConfirmModal,
} from "@/components/common";
import { useEmployeeListQuery, useUpdateEmployeeMutation } from "@/hooks/useEmployeeQueries";
import type { EmployeeItem } from "@/types/employee.types";
import { exportEmployeesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { getUserInfo } from "@/utils/auth-storage";
import EmployeeDetailsModal from "./components/EmployeeDetailsModal";
import { isEmployeeActive } from "@/services/employee-service";
import { usePermission } from "@/hooks/usePermission";
import {
  FaUserTie,
  FaCheckCircle,
  FaTimesCircle,
  FaMobileAlt,
  FaPlus,
  FaShieldAlt,
  FaEdit,
  FaEye,
  FaFileExcel,
  FaPowerOff,
} from "react-icons/fa";
import { FiAlertCircle, FiCheckCircle } from "react-icons/fi";

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

  // Current logged in user details for security boundary checks
  const userInfo = useMemo(() => getUserInfo(), []);
  const currentPhone = useMemo(() => {
    return String(userInfo?.phoneNumber || userInfo?.phone || "").trim().replace(/^(\+88)?0?/, "");
  }, [userInfo]);
  const currentUserId = userInfo?.userId ? Number(userInfo.userId) : null;
  const currentEmpId = userInfo?.employeeId ? Number(userInfo.employeeId) : null;
  const currentFullName = useMemo(() => {
    return String(userInfo?.fullName || "").trim().toLowerCase();
  }, [userInfo]);

  const isCurrentUser = (item: EmployeeItem): boolean => {
    if (!userInfo) return false;
    const empId = Number(item.id || (item as any)?.employeeId);
    if (currentEmpId && currentEmpId === empId) return true;
    if (currentUserId && item.adminUserId && currentUserId === Number(item.adminUserId)) return true;

    const itemPhone = String(item.phoneNumber || item.appUsername || "").trim().replace(/^(\+88)?0?/, "");
    if (currentPhone && itemPhone && currentPhone === itemPhone) return true;

    if (currentFullName && item.fullName && currentFullName === String(item.fullName).trim().toLowerCase()) {
      return true;
    }

    return false;
  };

  const isProtectedAdmin = (item: EmployeeItem): boolean => {
    if (isCurrentUser(item)) return true;

    const role = String(item.role || "").toUpperCase();
    const isAdminRole =
      role === "ADMIN" ||
      role === "OWNER" ||
      role === "SUPERADMIN" ||
      role === "BUSINESS_OWNER";

    if (isAdminRole) {
      const activeAdmins = employees.filter((e) => {
        const r = String(e.role || "").toUpperCase();
        return (
          isEmployeeActive(e) &&
          (r === "ADMIN" || r === "OWNER" || r === "SUPERADMIN" || r === "BUSINESS_OWNER")
        );
      });
      if (activeAdmins.length <= 1 && isEmployeeActive(item)) {
        return true;
      }
    }

    return false;
  };

  // Selected employee for view details modal
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);

  // Status toggle confirmation modal state
  const [pendingStatusToggle, setPendingStatusToggle] = useState<EmployeeItem | null>(null);

  // Statistics counts
  const activeCount = useMemo(
    () => employees.filter((e) => isEmployeeActive(e)).length,
    [employees]
  );
  const inactiveCount = employees.length - activeCount;
  const appAccessCount = useMemo(
    () => employees.filter((e) => e.hasAppAccess).length,
    [employees]
  );

  // Sort employees: latest / last entry always appears at the top (DESC)
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      // 1. Sort by creation date if available (newest first)
      const dateA = a.createdAt || (a as any)?.created_at;
      const dateB = b.createdAt || (b as any)?.created_at;
      if (dateA && dateB) {
        const timeA = new Date(dateA).getTime();
        const timeB = new Date(dateB).getTime();
        if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
          return timeB - timeA;
        }
      }

      // 2. Sort by ID descending (newest database record has highest numeric ID)
      const idA = Number(a.id || (a as any)?.employeeId || 0);
      const idB = Number(b.id || (b as any)?.employeeId || 0);
      if (idA > 0 && idB > 0 && idA !== idB) {
        return idB - idA;
      }

      return 0;
    });
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return sortedEmployees.filter((emp) => {
      // Tab filter
      if (filter === "active" && !isEmployeeActive(emp)) return false;
      if (filter === "inactive" && isEmployeeActive(emp)) return false;
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
  }, [sortedEmployees, search, filter]);

  // Pagination
  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEmployees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, safeCurrentPage, pageSize]);

  // Request toggle active/inactive status (opens confirm modal with guard checks)
  const handleRequestToggleStatus = (item: EmployeeItem) => {
    if (isCurrentUser(item)) {
      showErrorToast("You cannot deactivate your own account.");
      return;
    }
    if (isProtectedAdmin(item) && isEmployeeActive(item)) {
      showErrorToast("Primary organization administrator cannot be deactivated.");
      return;
    }
    setPendingStatusToggle(item);
  };

  // Confirm active/inactive toggle
  const handleConfirmToggleStatus = () => {
    if (!pendingStatusToggle) return;
    const item = pendingStatusToggle;
    const empId = Number(item.id || (item as any)?.employeeId);
    if (!empId) return;

    if (isCurrentUser(item)) {
      showErrorToast("You cannot deactivate your own account.");
      setPendingStatusToggle(null);
      return;
    }
    if (isProtectedAdmin(item) && isEmployeeActive(item)) {
      showErrorToast("Primary organization administrator cannot be deactivated.");
      setPendingStatusToggle(null);
      return;
    }

    const currentlyActive = isEmployeeActive(item);
    const nextStatus = !currentlyActive;
    setBusyId(empId);

    updateMutation.mutate(
      {
        id: empId,
        data: {
          ...item,
          active: nextStatus,
          status: nextStatus ? "ACTIVE" : "INACTIVE",
          isActive: nextStatus,
          is_active: nextStatus ? 1 : 0,
        },
      },
      {
        onSuccess: () => {
          showSuccessToast(
            `Staff member "${item.fullName}" marked as ${nextStatus ? "Active" : "Inactive"} successfully!`
          );
          setPendingStatusToggle(null);
        },
        onError: (err: any) => {
          showErrorToast(err?.message || "Failed to update employee status");
          setPendingStatusToggle(null);
        },
        onSettled: () => setBusyId(null),
      }
    );
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredEmployees.length > 0 ? filteredEmployees : sortedEmployees;
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
                    const isCurrent = isCurrentUser(item);
                    const isProtected = isProtectedAdmin(item);
                    const empActive = isEmployeeActive(item);
                    const cannotDeactivate = (isCurrent && empActive) || (isProtected && empActive);

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
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate block">
                                {item.fullName || `Employee #${empId}`}
                              </span>
                              {isCurrent && (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0"
                                  title="This is your currently logged-in account"
                                >
                                  You
                                </span>
                              )}
                            </div>
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
                            empActive ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[var(--primary-color,#009fe3)] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                title={`Username: ${item.appUsername || item.phoneNumber}`}
                              >
                                <FaMobileAlt size={9} />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                                title="Account inactive - app access suspended"
                              >
                                <FaMobileAlt size={9} />
                                <span>Suspended</span>
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              empActive
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {empActive ? "Active" : "Inactive"}
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
                                disabled={isBusy || cannotDeactivate}
                                onClick={() => handleRequestToggleStatus(item)}
                                title={
                                  isCurrent && empActive
                                    ? "You cannot deactivate your own account"
                                    : isProtected && empActive
                                    ? "Primary organization administrator cannot be deactivated"
                                    : empActive
                                    ? "Deactivate Staff Member"
                                    : "Activate Staff Member"
                                }
                                className={`p-1 rounded transition-colors ${
                                  cannotDeactivate
                                    ? "opacity-30 cursor-not-allowed text-gray-400"
                                    : empActive
                                    ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                    : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
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

      {/* Deactivation / Activation Confirmation Modal */}
      {pendingStatusToggle && (() => {
        const isPendingActive = isEmployeeActive(pendingStatusToggle);
        return (
          <ConfirmModal
            isOpen={Boolean(pendingStatusToggle)}
            onClose={() => setPendingStatusToggle(null)}
            onConfirm={handleConfirmToggleStatus}
            isLoading={busyId !== null}
            title={
              isPendingActive
                ? "Deactivate Staff Member"
                : "Reactivate Staff Member"
            }
            message={
              isPendingActive
                ? `Are you sure you want to deactivate "${pendingStatusToggle.fullName}"? They will immediately lose access to the system, POS, and all assigned branch workspaces.`
                : `Are you sure you want to activate "${pendingStatusToggle.fullName}"? They will regain access to their assigned branch workspaces.`
            }
            confirmText={
              isPendingActive ? "Deactivate Staff" : "Activate Staff"
            }
            cancelText="Cancel"
            confirmButtonColor={
              isPendingActive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }
            icon={
              isPendingActive ? (
                <FiAlertCircle className="text-2xl text-rose-600" />
              ) : (
                <FiCheckCircle className="text-2xl text-emerald-600" />
              )
            }
            iconBgColor={
              isPendingActive
                ? "bg-rose-100 dark:bg-rose-900/40"
                : "bg-emerald-100 dark:bg-emerald-900/40"
            }
          />
        );
      })()}
    </div>
  );
};

export default EmployeeList;
