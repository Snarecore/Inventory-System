import React, { useState, useMemo } from "react";
import { FaFileExcel } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";
import Search from "@/components/table-components/Search";
import {
  TableContainer,
  TableToolbar,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TablePaginationFooter,
  TableSkeleton,
  EmptyState,
} from "@/components/common";
import { formatMoney } from "@/utils/formatters";
import { buildAndDownloadExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import moment from "moment";
import type { SaleItem } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

interface CustomerSalesReportTableProps {
  transactions: SaleItem[];
  isLoading?: boolean;
}

interface CustomerSummary {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  invoicesCount: number;
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
  lastDate: string;
}

export const CustomerSalesReportTable: React.FC<CustomerSalesReportTableProps> = ({
  transactions,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("billed_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Group transactions by customer
  const customerSummaries: CustomerSummary[] = useMemo(() => {
    const map: Record<string, CustomerSummary> = {};

    transactions.forEach((tx: any) => {
      const cId = String(
        tx.customerId || tx.customer_id || tx.partyId || "walkin"
      );
      const cName =
        tx.customerName ||
        tx.customer_name ||
        tx.partyName ||
        "Walk-in Customer";
      const cPhone = tx.customerPhone || tx.customer_phone || tx.partyPhone || "";
      const cAddr =
        tx.customerAddress || tx.customer_address || tx.partyAddress || "";
      const date = tx.salesDate || tx.saleDate || tx.date || "";

      const gt = Number(tx.grandTotal ?? tx.grand_total ?? tx.totalAmount ?? 0);
      const paid = Number(tx.paidAmount ?? tx.paid_amount ?? 0);
      const due = Number(tx.dueAmount ?? tx.due_amount ?? Math.max(0, gt - paid));

      const key = cPhone ? `${cName}_${cPhone}` : cName;

      if (!map[key]) {
        map[key] = {
          customerId: cId,
          customerName: cName,
          customerPhone: cPhone,
          customerAddress: cAddr,
          invoicesCount: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalDue: 0,
          lastDate: date,
        };
      }

      map[key].invoicesCount += 1;
      map[key].totalBilled += gt;
      map[key].totalPaid += paid;
      map[key].totalDue += due;

      if (
        date &&
        (!map[key].lastDate || moment(date).isAfter(moment(map[key].lastDate)))
      ) {
        map[key].lastDate = date;
      }
    });

    return Object.values(map);
  }, [transactions]);

  // Filter & Sort
  const filtered = useMemo(() => {
    let list = customerSummaries;

    if (statusFilter === "due_only") {
      list = list.filter((c) => c.totalDue > 0);
    } else if (statusFilter === "cleared_only") {
      list = list.filter((c) => c.totalDue <= 0);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.customerPhone.toLowerCase().includes(q) ||
          c.customerAddress.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortBy === "billed_desc") {
      sorted.sort((a, b) => b.totalBilled - a.totalBilled);
    } else if (sortBy === "due_desc") {
      sorted.sort((a, b) => b.totalDue - a.totalDue);
    } else if (sortBy === "orders_desc") {
      sorted.sort((a, b) => b.invoicesCount - a.invoicesCount);
    } else if (sortBy === "name_asc") {
      sorted.sort((a, b) => a.customerName.localeCompare(b.customerName));
    }

    return sorted;
  }, [customerSummaries, debouncedSearch, statusFilter, sortBy]);

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExport = async () => {
    if (customerSummaries.length === 0) {
      showErrorToast("No customer data to export");
      return;
    }

    try {
      const data = filtered.map((c, idx) => ({
        "SL": idx + 1,
        "Customer Name": c.customerName,
        "Phone": c.customerPhone,
        "Address": c.customerAddress,
        "Total Orders": c.invoicesCount,
        "Total Billed (BDT)": c.totalBilled,
        "Total Paid (BDT)": c.totalPaid,
        "Outstanding Due (BDT)": c.totalDue,
        "Last Order Date": c.lastDate
          ? moment(c.lastDate).format("DD MMM YYYY")
          : "-",
        "Status": c.totalDue > 0 ? "Has Due" : "Settled",
      }));

      const totalBilled = data.reduce((s, r) => s + (Number(r["Total Billed (BDT)"]) || 0), 0);
      const totalPaid = data.reduce((s, r) => s + (Number(r["Total Paid (BDT)"]) || 0), 0);
      const totalDue = data.reduce((s, r) => s + (Number(r["Outstanding Due (BDT)"]) || 0), 0);

      const totalRow = {
        SL: "TOTAL",
        "Customer Name": `Total Customers: ${data.length}`,
        Phone: "",
        Address: "",
        "Total Orders": "",
        "Total Billed (BDT)": totalBilled,
        "Total Paid (BDT)": totalPaid,
        "Outstanding Due (BDT)": totalDue,
        "Last Order Date": "",
        Status: "",
      };

      await buildAndDownloadExcel(data, totalRow, {
        fileName: `Customer_Sales_Report_${moment().format("YYYY-MM-DD")}.xlsx`,
        sheetName: "Customer Sales",
      });
      showSuccessToast("Customer sales report exported successfully");
    } catch (e: any) {
      showErrorToast(e?.message || "Export failed");
    }
  };

  return (
    <TableContainer>
      {/* Top Filter Bar */}
      <TableToolbar>
        <div className="w-full sm:w-48 md:w-56 shrink-0">
          <Search
            searchQuery={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            setSearchQuery={setSearchQuery}
            placeholder="Search customer name, phone, address..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="relative w-36 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--primary-color)] cursor-pointer appearance-none"
            >
              <option value="all">All Customers</option>
              <option value="due_only">With Outstanding Due</option>
              <option value="cleared_only">Settled / Zero Due</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-subtle)] pointer-events-none text-xs"
              size={13}
            />
          </div>

          {/* Sort selector */}
          <div className="relative w-36 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-[var(--ui-border)] rounded-lg bg-[var(--ui-surface-muted)]/50 hover:bg-[var(--ui-surface)] text-[var(--ui-text)] font-medium focus:outline-none focus:border-[var(--primary-color)] cursor-pointer appearance-none"
            >
              <option value="billed_desc">Highest Billed</option>
              <option value="due_desc">Highest Due</option>
              <option value="orders_desc">Most Orders</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ui-text-subtle)] pointer-events-none text-xs"
              size={13}
            />
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 h-8 text-xs font-semibold text-[var(--ui-success-dark)] bg-[var(--ui-success-light)] hover:bg-[var(--ui-success-border)] border border-[var(--ui-success-border)] rounded-lg transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <FaFileExcel className="text-[var(--ui-success)]" size={12} />
            <span>Export Excel</span>
          </button>
        </div>
      </TableToolbar>

      {/* Table */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={8} rowCount={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Customers Found"
            description="No customer accounts match the current filter criteria."
          />
        ) : (
          <Table>
            <TableHead>
              <TableTh align="center" width={40}>SL</TableTh>
              <TableTh>Customer Name & Details</TableTh>
              <TableTh align="center" width={90}>Orders</TableTh>
              <TableTh align="right" width={130}>Gross Billed (৳)</TableTh>
              <TableTh align="right" width={130}>Total Paid (৳)</TableTh>
              <TableTh align="right" width={130}>Outstanding Due (৳)</TableTh>
              <TableTh align="center" width={120}>Last Order</TableTh>
              <TableTh align="center" width={100}>Status</TableTh>
            </TableHead>
            <TableBody>
              {paginated.map((c, idx) => {
                const hasDue = c.totalDue > 0;

                return (
                  <tr
                    key={c.customerName + idx}
                    className="hover:bg-[var(--primary-color-light)]/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-[var(--ui-text)] font-semibold text-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[var(--ui-text)] text-xs">
                        {c.customerName}
                      </div>
                      <div className="text-[11px] text-[var(--ui-text-muted)] mt-0.5 flex flex-wrap items-center gap-2">
                        {c.customerPhone && (
                          <span className="font-mono text-[var(--ui-text-muted)]">
                            {c.customerPhone}
                          </span>
                        )}
                        {c.customerAddress && (
                          <span className="text-[var(--ui-text-subtle)] truncate max-w-xs">
                            • {c.customerAddress}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-xs text-[var(--ui-text)]">
                      {c.invoicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-xs text-[var(--ui-text)] whitespace-nowrap">
                      ৳ {formatMoney(c.totalBilled)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold font-mono text-xs text-[var(--ui-success-dark)] whitespace-nowrap">
                      ৳ {formatMoney(c.totalPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap">
                      {hasDue ? (
                        <span className="text-[var(--ui-danger)] font-bold">
                          ৳ {formatMoney(c.totalDue)}
                        </span>
                      ) : (
                        <span className="text-[var(--ui-text-subtle)] font-normal">৳ 0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[var(--ui-text-muted)] whitespace-nowrap text-xs">
                      {c.lastDate
                        ? moment(c.lastDate).format("DD MMM, YYYY")
                        : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          hasDue
                            ? "bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)] border-[var(--ui-danger-border)]"
                            : "bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] border-[var(--ui-success-border)]"
                        }`}
                      >
                        {hasDue ? "Has Due" : "Settled"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableScroll>

      {/* Pagination Footer */}
      {paginated.length > 0 && (
        <TablePaginationFooter
          totalCount={totalCount}
          pageCount={pageCount}
          currentPageNumber={currentPage}
          dataLimit={pageSize}
          setDataLimit={setPageSize}
          setCurrentPageNumber={setCurrentPage}
          handlePagination={(data) => setCurrentPage(data.selected + 1)}
          pageSizeOptions={[10, 20, 50]}
          entityLabel="customers"
        />
      )}
    </TableContainer>
  );
};

export default CustomerSalesReportTable;
