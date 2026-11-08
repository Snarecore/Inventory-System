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
  TableActionButtons,
} from "@/components/common";
import {
  useBranchListQuery,
  useToggleBranchStatusMutation,
} from "@/hooks/useBranchQueries";
import { getActiveBranchId } from "@/utils/auth-storage";
import { switchBranch } from "@/utils/branch-storage";
import type { BranchItem } from "@/types/branch.types";
import {
  FaBuilding,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaExchangeAlt,
  FaPowerOff,
  FaCopy,
  FaStar,
} from "react-icons/fa";

export const BranchList: React.FC = () => {
  const navigate = useNavigate();
  const { data: branches = [], isLoading, refetch, isRefetching } = useBranchListQuery();
  const toggleMutation = useToggleBranchStatusMutation();

  const activeBranchId = getActiveBranchId();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const activeCount = useMemo(
    () => branches.filter((b) => b.active).length,
    [branches]
  );
  const inactiveCount = branches.length - activeCount;
  const copiedCount = useMemo(
    () => branches.filter((b) => b.copyBranchId).length,
    [branches]
  );

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((b) => {
      if (filter === "active" && !b.active) return false;
      if (filter === "inactive" && b.active) return false;
      if (!q) return true;
      return [b.name, b.code, b.address, b.phone].some((f) =>
        String(f || "").toLowerCase().includes(q)
      );
    });
  }, [branches, search, filter]);

  const totalCount = filteredBranches.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);

  const paginatedBranches = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredBranches.slice(start, start + pageSize);
  }, [filteredBranches, safeCurrentPage, pageSize]);

  const handleToggle = (branch: BranchItem) => {
    if (branch.branchId === activeBranchId) return;
    setBusyId(branch.branchId);
    toggleMutation.mutate(branch, {
      onSettled: () => setBusyId(null),
    });
  };

  const statCards = [
    {
      title: "Total Branches",
      value: branches.length,
      icon: FaBuilding,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900 hover:border-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Active Branches",
      value: activeCount,
      icon: FaCheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900 hover:border-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Inactive Branches",
      value: inactiveCount,
      icon: FaTimesCircle,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 hover:border-rose-400",
      iconBg: "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400",
    },
    {
      title: "Cloned Branches",
      value: copiedCount,
      icon: FaCopy,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50/60 dark:bg-purple-950/20 border-purple-300 dark:border-purple-900 hover:border-purple-400",
      iconBg: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Branch Management"
          headerDescription="Manage all organization branches, locations, active status and switch active workspace"
        />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading || isRefetching} />
          <Button
            label="Add Branch"
            onClick={() => navigate("/admin/branches/add")}
            color="var(--primary-color)"
            hoverColor="var(--primary-color-hover)"
            icon={<FaPlus className="text-white text-xs" />}
            buttonClass="!text-xs !py-1.5 !w-auto justify-center font-medium !text-white cursor-pointer"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards cards={statCards} />

      {/* Table Container */}
      <TableContainer className="w-full">
        {/* Table Toolbar */}
        <TableToolbar>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            <div className="w-full sm:w-72">
              <Search
                searchQuery={search}
                onSearchChange={(v) => {
                  setSearch(v);
                  setCurrentPage(1);
                }}
                placeholder="Search branch name, code, phone, address..."
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
              {[
                { key: "all", label: "All Branches", count: branches.length },
                { key: "active", label: "Active", count: activeCount },
                { key: "inactive", label: "Inactive", count: inactiveCount },
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
          {isLoading && branches.length === 0 ? (
            <div className="p-3">
              <TableSkeleton columnCount={8} rowCount={5} />
            </div>
          ) : (
            <Table minWidth={900}>
              <TableHead>
                <TableTh width={50} align="center">SL</TableTh>
                <TableTh width={230}>Branch Name</TableTh>
                <TableTh width={110} align="center">Code</TableTh>
                <TableTh width={140}>Phone</TableTh>
                <TableTh width={220}>Address</TableTh>
                <TableTh width={120} align="center">Opening Date</TableTh>
                <TableTh width={100} align="center">Status</TableTh>
                <TableTh width={150} align="center">Actions</TableTh>
              </TableHead>
              <TableBody>
                {paginatedBranches.length > 0 ? (
                  paginatedBranches.map((item, idx) => {
                    const isCurrent = item.branchId === activeBranchId;
                    const isBusy = busyId === item.branchId;

                    return (
                      <TableRow key={item.branchId || idx}>
                        {/* SL */}
                        <TableCell align="center" className="text-gray-600 dark:text-gray-400 font-normal text-xs">
                          {(safeCurrentPage - 1) * pageSize + idx + 1}
                        </TableCell>

                        {/* Branch Name */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[var(--primary-color-light,#e0f2fe)] text-[var(--primary-color,#009fe3)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {(item.name || "B").trim().charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                                  {item.name || `Branch #${item.branchId}`}
                                </span>
                                {item.primary && (
                                  <FaStar className="text-amber-400 text-[10px] flex-shrink-0" title="Primary Branch" />
                                )}
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    Current
                                  </span>
                                )}
                              </div>
                              {item.copyBranchId ? (
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5">
                                  <FaCopy className="text-[8px]" /> Cloned from #{item.copyBranchId}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>

                        {/* Code */}
                        <TableCell align="center">
                          {item.code ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {item.code}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate block">
                            {item.phone || "-"}
                          </span>
                        </TableCell>

                        {/* Address */}
                        <TableCell>
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate block max-w-[200px]" title={item.address}>
                            {item.address || "-"}
                          </span>
                        </TableCell>

                        {/* Opening Date */}
                        <TableCell align="center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {item.openingDate || "-"}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.active
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {item.active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center">
                          <TableActionButtons
                            onEdit={() =>
                              navigate(`/admin/branches/edit/${item.branchId}`, {
                                state: { branch: item },
                              })
                            }
                            editTitle="Edit Branch"
                            extraActions={
                              <>
                                {/* Switch branch button */}
                                {item.active && !isCurrent && (
                                  <button
                                    type="button"
                                    onClick={() => switchBranch(item.branchId)}
                                    title="Switch workspace to this branch"
                                    className="p-1 rounded text-[var(--primary-color)] hover:bg-[var(--primary-color-muted)] transition-colors cursor-pointer"
                                  >
                                    <FaExchangeAlt size={12} />
                                  </button>
                                )}

                                {/* Deactivate/Reactivate button */}
                                <button
                                  type="button"
                                  disabled={isBusy || isCurrent}
                                  onClick={() => handleToggle(item)}
                                  title={
                                    isCurrent
                                      ? "Active session branch cannot be deactivated"
                                      : item.active
                                      ? "Deactivate Branch"
                                      : "Reactivate Branch"
                                  }
                                  className={`p-1 rounded transition-colors ${
                                    isCurrent
                                      ? "opacity-30 cursor-not-allowed text-[var(--ui-text-subtle)]"
                                      : item.active
                                      ? "text-[var(--ui-danger)] hover:bg-[var(--ui-danger-border)] cursor-pointer"
                                      : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                  }`}
                                >
                                  <FaPowerOff size={12} />
                                </button>
                              </>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <EmptyState
                        title={branches.length === 0 ? "No branches registered yet" : "No matching branch found"}
                        description={
                          branches.length === 0
                            ? "Start expanding your business by registering your first branch location."
                            : "Try adjusting your search criteria or filter tabs."
                        }
                        buttonText={branches.length === 0 ? "+ Add First Branch" : undefined}
                        onButtonClick={branches.length === 0 ? () => navigate("/admin/branches/add") : undefined}
                      />
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          )}
        </TableScroll>

        {/* Pagination Footer */}
        {!isLoading && totalCount > 0 && (
          <TablePaginationFooter
            totalCount={totalCount}
            pageCount={pageCount}
            currentPageNumber={safeCurrentPage}
            dataLimit={pageSize}
            setDataLimit={(limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            }}
            setCurrentPageNumber={setCurrentPage}
          />
        )}
      </TableContainer>
    </div>
  );
};

export default BranchList;
