import React, { useState, useMemo } from "react";
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
import moment from "moment";
import type { SaleItem } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";
import {
  aggregateCustomerSales,
  type CustomerSummary,
} from "../utils/sales-report-helpers";

interface CustomerSalesReportTableProps {
  transactions: SaleItem[];
  isLoading?: boolean;
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

  // Group transactions by customer using shared aggregator
  const customerSummaries: CustomerSummary[] = useMemo(
    () => aggregateCustomerSales(transactions),
    [transactions]
  );

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
        </div>
      </TableToolbar>

      {/* Table */}
      <TableScroll>
        {isLoading ? (
          <TableSkeleton columnCount={10} rowCount={8} />
        ) : paginated.length === 0 ? (
          <EmptyState
            title="No Customers Found"
            description="No customer accounts match the current filter criteria."
          />
        ) : (
          <Table>
            <TableHead>
              <TableTh align="center" width={40}>SL</TableTh>
              <TableTh>Customer Name</TableTh>
              <TableTh width={130}>Phone</TableTh>
              <TableTh width={180}>Address</TableTh>
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
                    <td className="py-2.5 px-3 font-medium text-[var(--ui-text)] text-xs whitespace-nowrap">
                      {c.customerName}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[var(--ui-text)] whitespace-nowrap">
                      {c.customerPhone || (
                        <span className="text-[var(--ui-text-subtle)] font-normal">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[var(--ui-text-muted)] max-w-[200px] truncate">
                      {c.customerAddress || (
                        <span className="text-[var(--ui-text-subtle)] font-normal">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs text-[var(--ui-text)]">
                      {c.invoicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-xs text-[var(--ui-text)] whitespace-nowrap">
                      ৳ {formatMoney(c.totalBilled)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-xs text-[var(--ui-success-dark)] whitespace-nowrap">
                      ৳ {formatMoney(c.totalPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs whitespace-nowrap">
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
