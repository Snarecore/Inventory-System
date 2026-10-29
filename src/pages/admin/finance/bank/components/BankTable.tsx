import React, { useState } from "react";
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
import type { BankAccountItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import { exportBankAccountsToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { useUpdateBankAccountMutation } from "@/hooks/useBankQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { AccountStatusBadge, AccountStatusTabs } from "@/pages/admin/finance/components";
import { FaCreditCard } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";

interface BankTableProps {
  bankAccounts: BankAccountItem[];
  isLoading: boolean;
  onAddNew: () => void;
}

type SortKey = "bankName" | "bankAccountName" | "currentBalance" | "status";

export const BankTable: React.FC<BankTableProps> = ({ bankAccounts, isLoading, onAddNew }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("bankName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const updateMutation = useUpdateBankAccountMutation();

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Single-pass optimization: Filter and count in one single loop without useMemo
  const term = debouncedSearch.trim().toLowerCase();
  const hasStatusFilter = Boolean(statusFilter);
  const statusFilterLower = statusFilter.toLowerCase();

  let activeCount = 0;
  let inactiveCount = 0;
  const filtered: BankAccountItem[] = [];

  for (let i = 0; i < bankAccounts.length; i++) {
    const item = bankAccounts[i];
    const statusLower = (item.status || "").toLowerCase();

    // 1. Tab count collection
    if (statusLower === "active") activeCount++;
    else if (statusLower === "inactive") inactiveCount++;

    // 2. Filter criteria checks
    if (hasStatusFilter && statusLower !== statusFilterLower) continue;
    if (term) {
      const searchTarget = `${item.bankName} ${item.bankAccountName} ${item.accountNo}`.toLowerCase();
      if (!searchTarget.includes(term)) continue;
    }

    filtered.push(item);
  }

  const sorted = [...filtered].sort((a, b) => {
    const factor = sortDir === "asc" ? 1 : -1;
    if (sortKey === "currentBalance") {
      return (Number(a.currentBalance || 0) - Number(b.currentBalance || 0)) * factor;
    }
    return String(a[sortKey] || "").toLowerCase().localeCompare(String(b[sortKey] || "").toLowerCase()) * factor;
  });

  // Pagination
  const totalCount = sorted.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const rows = sorted.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const renderSort = (label: string, key: SortKey, align = "left") => (
    <span
      onClick={() => toggleSort(key)}
      className={`inline-flex items-center gap-1 select-none text-black cursor-pointer ${align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : ""}`}
    >
      <span>{label}</span>
      <FiChevronDown size={11} className={`text-black transition-transform duration-200 ${sortKey === key && sortDir === "asc" ? "rotate-180" : ""}`} />
    </span>
  );

  const handleToggleStatus = (item: BankAccountItem) => {
    const nextStatus = (item.status || "").toLowerCase() === "active" ? "Inactive" : "Active";
    updateMutation.mutate({
      bankId: item.bankId,
      bankName: item.bankName,
      bankAccountName: item.bankAccountName,
      accountNo: item.accountNo,
      openingBalance: Number(item.openingBalance ?? item.currentBalance ?? 0),
      balanceDate: item.balanceDate || "",
      transactionDate: item.transactionDate || item.balanceDate || "",
      hasCard: Boolean(item.hasCard),
      cardType: item.cardType || null,
      cardNumber: item.cardNumber || null,
      status: nextStatus,
    });
  };

  const handleExport = () => {
    const data = filtered.length > 0 ? filtered : bankAccounts;
    if (!data.length) return showErrorToast("No bank accounts available to export");
    try {
      exportBankAccountsToExcel(data);
      showSuccessToast(`Exported ${data.length} bank accounts to Excel!`);
    } catch (err: unknown) {
      showErrorToast(err instanceof Error ? err.message : "Failed to export Excel file");
    }
  };

  return (
    <TableContainer className="w-full">
      <TableToolbar>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <div className="w-full sm:w-72">
            <Search searchQuery={searchQuery} onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} placeholder="Search bank, account name, no..." />
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <AccountStatusTabs
              currentStatus={statusFilter}
              onChangeStatus={(st) => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              totalCount={bankAccounts.length}
              activeCount={activeCount}
              inactiveCount={inactiveCount}
              allLabel="All Accounts"
            />
            <ExcelExportButton onClick={handleExport} title="Download Bank Accounts Excel Report" />
          </div>
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && bankAccounts.length === 0 ? (
          <div className="p-3"><TableSkeleton columnCount={8} rowCount={6} /></div>
        ) : (
          <Table minWidth={800}>
            <TableHead>
              <TableTh width={50} align="center">SL</TableTh>
              <TableTh width={220}>{renderSort("Bank Name", "bankName")}</TableTh>
              <TableTh width={200}>{renderSort("Account Name", "bankAccountName")}</TableTh>
              <TableTh width={170}>Account Number</TableTh>
              <TableTh width={140} align="right">{renderSort("Balance", "currentBalance", "right")}</TableTh>
              <TableTh width={90} align="center">Card</TableTh>
              <TableTh width={100} align="center">{renderSort("Status", "status", "center")}</TableTh>
              <TableTh width={80} align="center">Action</TableTh>
            </TableHead>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((item, idx) => {
                  return (
                    <TableRow key={item.bankId || idx}>
                      <TableCell align="center" className="text-black font-normal">{(safeCurrentPage - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell>
                        <span className="text-black block truncate text-xs font-semibold">{item.bankName}</span>
                      </TableCell>
                      <TableCell><span className="font-medium text-black truncate block">{item.bankAccountName || "N/A"}</span></TableCell>
                      <TableCell><span className="text-xs text-black font-medium truncate block">{item.accountNo || "N/A"}</span></TableCell>
                      <TableCell align="right"><span className="text-black text-xs font-bold">৳ {formatMoney(item.currentBalance)}</span></TableCell>
                      <TableCell align="center">
                        {item.hasCard ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase" title={`Card: ${item.cardType || "Card"}`}>
                            <FaCreditCard size={10} /><span>{item.cardType || "Card"}</span>
                          </span>
                        ) : <span className="text-gray-400 text-xs">N/A</span>}
                      </TableCell>
                      <TableCell align="center">
                        <AccountStatusBadge
                          status={item.status}
                          onToggle={() => handleToggleStatus(item)}
                          disabled={updateMutation.isPending}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TableActionButtons
                          onEdit={() => navigate(`/admin/edit-bank/${item.bankId}`)}
                          editTitle="Edit Bank Account"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <EmptyState title="No bank accounts found" description="There are no bank accounts registered yet or matching your search." buttonText="+ Add Bank Account" onButtonClick={onAddNew} />
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
          setDataLimit={(limit) => { setPageSize(limit); setCurrentPage(1); }}
          setCurrentPageNumber={setCurrentPage}
          handlePagination={(d) => setCurrentPage(d.selected + 1)}
          entityLabel="bank accounts"
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
    </TableContainer>
  );
};

export default BankTable;
