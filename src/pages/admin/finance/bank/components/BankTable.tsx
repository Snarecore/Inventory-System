import React, { useState } from "react";
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
} from "@/components/common";
import type { BankAccountItem } from "@/types";
import { formatMoney } from "@/utils/formatters";
import { exportBankAccountsToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { FaCreditCard, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";

interface BankTableProps {
  bankAccounts: BankAccountItem[];
  isLoading: boolean;
  onAddNew: () => void;
}

type SortKey = "bankName" | "bankAccountName" | "currentBalance" | "status";

export const BankTable: React.FC<BankTableProps> = ({ bankAccounts, isLoading, onAddNew }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("bankName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Status counts in single pass without memo
  let activeCount = 0, inactiveCount = 0;
  for (const b of bankAccounts) {
    const s = (b.status || "").toLowerCase();
    if (s === "active") activeCount++;
    else if (s === "inactive") inactiveCount++;
  }

  // Filter & Sort
  const term = searchQuery.trim().toLowerCase();
  const filtered = bankAccounts.filter((item) => {
    const matchSearch = !term ||
      (item.bankName || "").toLowerCase().includes(term) ||
      (item.bankAccountName || "").toLowerCase().includes(term) ||
      (item.accountNo || "").toLowerCase().includes(term) ||
      (item.branchName || "").toLowerCase().includes(term);
    const matchStatus = !statusFilter || (item.status || "").toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

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

  const statusTabs = [
    { label: "All Accounts", value: "", count: bankAccounts.length },
    { label: "Active", value: "Active", count: activeCount, icon: FaCheckCircle, text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
    { label: "Inactive", value: "Inactive", count: inactiveCount, icon: FaTimesCircle, text: "text-rose-600", badge: "bg-rose-100 text-rose-700" },
  ];

  return (
    <TableContainer className="w-full">
      <TableToolbar>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <div className="w-full sm:w-72">
            <Search searchQuery={searchQuery} onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} placeholder="Search bank, account name, no..." />
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <div className="inline-flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 h-8">
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.value;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
                    className={`h-7 px-3 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      active ? `bg-white shadow-xs ${tab.text || "text-[var(--color-primary)]"}` : "text-gray-600 hover:text-black"
                    }`}
                  >
                    {Icon && <Icon size={11} className={active ? tab.text : "text-gray-400"} />}
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${active ? (tab.badge || "bg-sky-100 text-sky-700") : "bg-gray-200/70 text-gray-600"}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <ExcelExportButton onClick={handleExport} title="Download Bank Accounts Excel Report" />
          </div>
        </div>
      </TableToolbar>

      <TableScroll>
        {isLoading && bankAccounts.length === 0 ? (
          <div className="p-3"><TableSkeleton columnCount={7} rowCount={6} /></div>
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
            </TableHead>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((item, idx) => {
                  const isActive = (item.status || "").toLowerCase() === "active";
                  return (
                    <TableRow key={item.bankId || idx}>
                      <TableCell align="center" className="text-black font-normal">{(safeCurrentPage - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <span className=" text-black block truncate text-xs">{item.bankName}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="font-medium text-black truncate block">{item.bankAccountName || "N/A"}</span></TableCell>
                      <TableCell><span className="text-xs text-black px-2 py-0.5 inline-block">{item.accountNo || "N/A"}</span></TableCell>
                      <TableCell align="right"><span className=" text-black">৳ {formatMoney(item.currentBalance)}</span></TableCell>
                      <TableCell align="center">
                        {item.hasCard ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase" title={`Card: ${item.cardType || "Card"}`}>
                            <FaCreditCard size={10} /><span>{item.cardType || "Card"}</span>
                          </span>
                        ) : <span className="text-black text-xs">N/A</span>}
                      </TableCell>
                      <TableCell align="center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${isActive ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"}`}>
                          {item.status || "Inactive"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
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
