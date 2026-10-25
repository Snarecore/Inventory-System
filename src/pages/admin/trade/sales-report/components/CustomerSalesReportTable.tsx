import React, { useState, useMemo } from "react";
import { FaUserTie, FaFileExcel, FaPhone, FaMapMarkerAlt } from "react-icons/fa";
import Search from "@/components/table-components/Search";
import EmptyState from "@/components/empty-state/EmptyState";
import TablePaginationFooter from "@/components/table-components/TablePaginationFooter";
import { formatMoney } from "@/utils/formatters";
import * as XLSX from "xlsx";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import moment from "moment";
import type { SaleItem } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

interface CustomerSalesReportTableProps {
  transactions: SaleItem[];
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
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [filterDueOnly, setFilterDueOnly] = useState(false);
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

    return Object.values(map).sort((a, b) => b.totalBilled - a.totalBilled);
  }, [transactions]);

  // Filtered
  const filtered = useMemo(() => {
    return customerSummaries.filter((c) => {
      if (filterDueOnly && c.totalDue <= 0) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        return (
          c.customerName.toLowerCase().includes(q) ||
          c.customerPhone.toLowerCase().includes(q) ||
          c.customerAddress.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customerSummaries, debouncedSearch, filterDueOnly]);

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExport = () => {
    if (customerSummaries.length === 0) {
      showErrorToast("No customer data to export");
      return;
    }

    try {
      const data = customerSummaries.map((c, idx) => ({
        "SL": idx + 1,
        "Customer Name": c.customerName,
        "Phone": c.customerPhone,
        "Address": c.customerAddress,
        "Total Invoices": c.invoicesCount,
        "Total Billed (BDT)": c.totalBilled,
        "Total Paid (BDT)": c.totalPaid,
        "Outstanding Due (BDT)": c.totalDue,
        "Last Purchase Date": c.lastDate
          ? moment(c.lastDate).format("DD MMM YYYY")
          : "-",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customer Sales");
      XLSX.writeFile(
        wb,
        `Customer_Sales_Report_${moment().format("YYYY-MM-DD")}.xlsx`
      );
      showSuccessToast("Customer sales report exported successfully");
    } catch (e: any) {
      showErrorToast(e?.message || "Export failed");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <FaUserTie size={14} />
          </span>
          <div>
            <h3 className="text-xs font-bold text-gray-900">
              Customer-Wise Sales Analysis (কাস্টমারভিত্তিক হিসাব)
            </h3>
            <p className="text-[10px] text-gray-500">
              Breakdown of total purchases, collections, and outstanding dues per customer
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100">
            <input
              type="checkbox"
              checked={filterDueOnly}
              onChange={(e) => {
                setFilterDueOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="accent-[#009fe3] rounded cursor-pointer"
            />
            <span className="text-[11px]">Due Customers Only</span>
          </label>

          <div className="w-full sm:w-52">
            <Search
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search customer..."
            />
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <FaFileExcel className="text-emerald-600" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        {paginated.length === 0 ? (
          <EmptyState
            title="No Customers Found"
            description="No customers match the current search or filters."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                <th className="py-2.5 px-3 text-center w-10">SL</th>
                <th className="py-2.5 px-3">Customer Information</th>
                <th className="py-2.5 px-3 text-center">Invoices</th>
                <th className="py-2.5 px-3 text-right">Total Billed</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
                <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                <th className="py-2.5 px-3 text-center">Last Purchase</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {paginated.map((c, idx) => {
                const hasDue = c.totalDue > 0;

                return (
                  <tr
                    key={c.customerName + idx}
                    className="hover:bg-sky-50/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-gray-700 font-semibold text-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-gray-900">
                        {c.customerName}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        {c.customerPhone && (
                          <span className="flex items-center gap-1">
                            <FaPhone size={8} />
                            {c.customerPhone}
                          </span>
                        )}
                        {c.customerAddress && (
                          <span className="flex items-center gap-1">
                            <FaMapMarkerAlt size={8} />
                            {c.customerAddress}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                      {c.invoicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                      ৳ {formatMoney(c.totalBilled)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                      ৳ {formatMoney(c.totalPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black whitespace-nowrap">
                      {hasDue ? (
                        <span className="text-rose-600">
                          ৳ {formatMoney(c.totalDue)}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium">৳ 0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-600 whitespace-nowrap text-[11px]">
                      {c.lastDate ? moment(c.lastDate).format("DD MMM, YYYY") : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasDue ? (
                        <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                          Has Due
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Cleared
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Summary Footer */}
            <tfoot className="bg-gray-50/80 font-bold text-gray-800 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 text-right  text-[11px]">
                  Total Across Visible Customers:
                </td>
                <td className="py-2.5 px-3 text-center text-indigo-800">
                  {filtered.reduce((acc, c) => acc + c.invoicesCount, 0)}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-900">
                  ৳{" "}
                  {formatMoney(
                    filtered.reduce((acc, c) => acc + c.totalBilled, 0)
                  )}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700">
                  ৳{" "}
                  {formatMoney(
                    filtered.reduce((acc, c) => acc + c.totalPaid, 0)
                  )}
                </td>
                <td className="py-2.5 px-3 text-right text-rose-700">
                  ৳{" "}
                  {formatMoney(
                    filtered.reduce((acc, c) => acc + c.totalDue, 0)
                  )}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

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
    </div>
  );
};

export default CustomerSalesReportTable;
