import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  ExcelExportButton,
  TableActionButtons,
} from "@/components/common";
import type { MfsUserItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import { exportMfsAccountsToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { useUpdateMfsUserStatusMutation } from "@/hooks/useMfsQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { methodMeta } from "@/services/mfs-service";
import MfsLogo from "./MfsLogo";
import { AccountStatusBadge, AccountStatusTabs } from "@/pages/admin/finance/components";
import { FiChevronDown } from "react-icons/fi";
import { usePermission } from "@/hooks/usePermission";

interface MfsTableProps {
  mfsAccounts: MfsUserItem[];
  isLoading: boolean;
  onAddNew: () => void;
}

type SortKey = "method" | "name" | "phoneNumber" | "currentBalance" | "status";

export const MfsTable: React.FC<MfsTableProps> = ({ mfsAccounts, isLoading, onAddNew }) => {
  const { canCreate, canUpdate } = usePermission();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("method");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const updateStatusMutation = useUpdateMfsUserStatusMutation();

  const debouncedSearch = useDebounce(searchQuery, 300);

  const term = debouncedSearch.trim().toLowerCase();
  const hasStatusFilter = Boolean(statusFilter);
  const statusFilterLower = statusFilter.toLowerCase();

  let activeCount = 0;
  let inactiveCount = 0;
  const filtered: MfsUserItem[] = [];

  for (const item of mfsAccounts) {
    const isItemActive = (item.status || "").toLowerCase() === "active";
    if (isItemActive) {
      activeCount++;
    } else {
      inactiveCount++;
    }

    if (hasStatusFilter) {
      if (statusFilterLower === "active" && !isItemActive) continue;
      if (statusFilterLower === "inactive" && isItemActive) continue;
    }
    if (term) {
      const searchTarget = `${item.name} ${item.method} ${item.phoneNumber}`.toLowerCase();
      if (!searchTarget.includes(term)) continue;
    }

    filtered.push(item);
  }

  const sorted = [...filtered].sort((a, b) => {
    const factor = sortDir === "asc" ? 1 : -1;
    if (sortKey === "currentBalance") {
      return (Number(a.currentBalance || 0) - Number(b.currentBalance || 0)) * factor;
    }
    const valA = String(a[sortKey] || "").toLowerCase();
    const valB = String(b[sortKey] || "").toLowerCase();
    return valA.localeCompare(valB) * factor;
  });

  const totalCount = sorted.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const rows = sorted.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const renderSort = useCallback(
    (label: string, key: SortKey, align = "left") => (
      <span
        onClick={() => toggleSort(key)}
        className={`inline-flex items-center gap-1 select-none text-black cursor-pointer ${
          align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : ""
        }`}
      >
        <span>{label}</span>
        <FiChevronDown
          size={11}
          className={`text-black transition-transform duration-200 ${
            sortKey === key && sortDir === "asc" ? "rotate-180" : ""
          }`}
        />
      </span>
    ),
    [sortKey, sortDir, toggleSort]
  );

  const handleToggleStatus = useCallback(
    (item: MfsUserItem) => {
      const nextStatus = (item.status || "").toLowerCase() === "active" ? "Inactive" : "Active";
      updateStatusMutation.mutate({
        id: item.id,
        status: nextStatus,
      });
    },
    [updateStatusMutation]
  );

  const handleExport = () => {
    const dataToExport = filtered;
    if (!dataToExport.length) return showErrorToast("No MFS accounts available to export");
    try {
      exportMfsAccountsToExcel(dataToExport);
      showSuccessToast(`Exported ${dataToExport.length} MFS accounts to Excel!`);
    } catch (err: unknown) {
      showErrorToast(err instanceof Error ? err.message : "Failed to export Excel file");
    }
  };

  return (
    <TableContainer className="w-full">
      <TableToolbar>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <div className="w-full sm:w-72">
            <Search
              searchQuery={searchQuery}
              onSearchChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              placeholder="Search wallet, provider, phone..."
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <AccountStatusTabs
              currentStatus={statusFilter}
              onChangeStatus={(status) => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              totalCount={mfsAccounts.length}
              activeCount={activeCount}
              inactiveCount={inactiveCount}
              allLabel="All Wallets"
            />
            <ExcelExportButton onClick={handleExport} title="Download MFS Accounts Excel Report" />
          </div>
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && mfsAccounts.length === 0 ? (
          <div className="p-3">
            <TableSkeleton columnCount={7} rowCount={6} />
          </div>
        ) : (
          <Table minWidth={850}>
            <TableHead>
              <TableTh width={50} align="center">SL</TableTh>
              <TableTh width={180}>{renderSort("Provider", "method")}</TableTh>
              <TableTh width={220}>{renderSort("Account Name", "name")}</TableTh>
              <TableTh width={180}>{renderSort("Phone Number", "phoneNumber")}</TableTh>
              <TableTh width={150} align="right">{renderSort("Current Balance", "currentBalance", "right")}</TableTh>
              <TableTh width={110} align="center">{renderSort("Status", "status", "center")}</TableTh>
              <TableTh width={80} align="center">Action</TableTh>
            </TableHead>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((item, idx) => {
                  const brand = methodMeta(item.method);

                  return (
                    <TableRow key={item.id || idx}>
                      <TableCell align="center" className="text-black font-normal">
                        {(safeCurrentPage - 1) * pageSize + idx + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MfsLogo method={item.method} size={26} />
                          <span className="font-bold text-xs text-gray-900">{brand.label}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-semibold text-xs text-gray-900 block truncate">
                          {item.name || "N/A"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs text-gray-900 font-medium">
                          {item.phoneNumber || "N/A"}
                        </span>
                      </TableCell>

                      <TableCell align="right">
                        <span className="text-black text-xs font-bold">
                          ৳ {formatMoney(item.currentBalance)}
                        </span>
                      </TableCell>

                      <TableCell align="center">
                        <AccountStatusBadge
                          status={item.status}
                          onToggle={() => canUpdate("mfs") && handleToggleStatus(item)}
                          disabled={updateStatusMutation.isPending || !canUpdate("mfs")}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <TableActionButtons
                          onEdit={canUpdate("mfs") ? () => navigate(`/admin/edit-mfs/${item.id}`) : undefined}
                          editTitle="Edit MFS Account"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <EmptyState
                      title="No MFS accounts found"
                      description="There are no Mobile Financial Service accounts registered yet or matching your search."
                      buttonText={canCreate("mfs") ? "+ Add MFS Account" : undefined}
                      onButtonClick={canCreate("mfs") ? onAddNew : undefined}
                    />
                  </td>
                </tr>
              )}
            </TableBody>
          </Table>
        )}
      </TableScroll>

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
          handlePagination={(d) => setCurrentPage(d.selected + 1)}
          entityLabel="MFS accounts"
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
    </TableContainer>
  );
};

export default MfsTable;
