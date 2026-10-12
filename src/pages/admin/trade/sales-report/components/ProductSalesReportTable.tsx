import React, { useState, useMemo } from "react";
import { FaBoxes, FaFileExcel, FaSearch } from "react-icons/fa";
import Search from "@/components/table-components/Search";
import EmptyState from "@/components/empty-state/EmptyState";
import Pagination from "@/components/pagination";
import { formatMoney } from "@/utils/formatters";
import * as XLSX from "xlsx";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import moment from "moment";
import type { SaleItem } from "@/types";

interface ProductSalesReportTableProps {
  transactions: SaleItem[];
}

interface ProductSummary {
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  totalQuantity: number;
  totalRevenue: number;
  totalDiscount: number;
  invoicesCount: number;
}

export const ProductSalesReportTable: React.FC<ProductSalesReportTableProps> = ({
  transactions,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Group line items by product
  const productSummaries: ProductSummary[] = useMemo(() => {
    const map: Record<string, ProductSummary> = {};

    transactions.forEach((tx: any) => {
      const details =
        tx.salesDetails ||
        tx.saleDetails ||
        tx.details ||
        tx.items ||
        tx.productsList ||
        [];

      if (Array.isArray(details)) {
        details.forEach((line: any) => {
          const pId = String(
            line.productId || line.product_id || line.id || line.pcode || "unknown"
          );
          const pCode =
            line.productCode || line.product_code || line.pcode || line.code || "-";
          const pName =
            line.productName ||
            line.product_name ||
            line.name ||
            line.title ||
            "Unnamed Product";
          const unit = line.unit || "pcs";
          const qty = Number(line.quantity ?? line.qty ?? 1);
          const price = Number(
            line.sellPrice ?? line.sell_price ?? line.price ?? line.rate ?? 0
          );
          const lineTotal =
            Number(line.total ?? line.total_price ?? 0) || qty * price;
          const disc = Number(line.discount ?? 0);

          const key = pCode !== "-" ? pCode : pName;

          if (!map[key]) {
            map[key] = {
              productId: pId,
              productCode: pCode,
              productName: pName,
              unit,
              totalQuantity: 0,
              totalRevenue: 0,
              totalDiscount: 0,
              invoicesCount: 0,
            };
          }

          map[key].totalQuantity += qty;
          map[key].totalRevenue += lineTotal;
          map[key].totalDiscount += disc;
          map[key].invoicesCount += 1;
        });
      }
    });

    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [transactions]);

  // Overall total revenue from products
  const grandProductRevenue = useMemo(() => {
    return productSummaries.reduce((acc, p) => acc + p.totalRevenue, 0);
  }, [productSummaries]);

  // Filtered
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return productSummaries;
    const q = searchQuery.toLowerCase().trim();
    return productSummaries.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.productCode.toLowerCase().includes(q)
    );
  }, [productSummaries, searchQuery]);

  const totalCount = filtered.length;
  const pageCount = Math.ceil(totalCount / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExport = () => {
    if (productSummaries.length === 0) {
      showErrorToast("No product data to export");
      return;
    }

    try {
      const data = productSummaries.map((p, idx) => ({
        "SL": idx + 1,
        "Product Code": p.productCode,
        "Product Name": p.productName,
        "Unit": p.unit,
        "Quantity Sold": p.totalQuantity,
        "Total Revenue (BDT)": p.totalRevenue,
        "Discount (BDT)": p.totalDiscount,
        "Invoices Sold": p.invoicesCount,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Product Sales");
      XLSX.writeFile(
        wb,
        `Product_Sales_Report_${moment().format("YYYY-MM-DD")}.xlsx`
      );
      showSuccessToast("Product sales report exported successfully");
    } catch (e: any) {
      showErrorToast(e?.message || "Export failed");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
      {/* Header filter bar */}
      <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sky-50 text-[#009fe3]">
            <FaBoxes size={14} />
          </span>
          <div>
            <h3 className="text-xs font-bold text-gray-900">
              Product-Wise Sales Summary (পণ্যভিত্তিক বিক্রির সারাংশ)
            </h3>
            <p className="text-[10px] text-gray-500">
              Ranked by total revenue generated across selected transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-full sm:w-56">
            <Search
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product..."
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
            title="No Product Sales Found"
            description="No line items found in the current transactions set."
          />
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                <th className="py-2.5 px-3 text-center w-10">SL</th>
                <th className="py-2.5 px-3">Product Code</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3 text-right">Qty Sold</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-right">Avg Price</th>
                <th className="py-2.5 px-3 text-right">Total Revenue</th>
                <th className="py-2.5 px-3 text-right">% of Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {paginated.map((item, idx) => {
                const sharePct =
                  grandProductRevenue > 0
                    ? Math.round((item.totalRevenue / grandProductRevenue) * 100)
                    : 0;
                const avgPrice =
                  item.totalQuantity > 0
                    ? Math.round(item.totalRevenue / item.totalQuantity)
                    : 0;

                return (
                  <tr
                    key={item.productCode + idx}
                    className="hover:bg-sky-50/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-gray-700 font-semibold text-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-2.5 px-3  font-bold text-gray-800">
                      {item.productCode}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-indigo-700">
                      {item.totalQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-500  text-[11px]">
                      {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-700">
                      ৳ {formatMoney(avgPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                      ৳ {formatMoney(item.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-gray-700 text-[11px]">
                          {sharePct}%
                        </span>
                        <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#009fe3] h-full rounded-full"
                            style={{ width: `${Math.min(100, sharePct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Summary Footer */}
            <tfoot className="bg-gray-50/80 font-bold text-gray-800 border-t border-gray-200">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 text-right  text-[11px]">
                  Total Across Visible Products:
                </td>
                <td className="py-2.5 px-3 text-right text-indigo-800">
                  {filtered.reduce((acc, p) => acc + p.totalQuantity, 0)}
                </td>
                <td colSpan={2}></td>
                <td className="py-2.5 px-3 text-right text-emerald-700">
                  ৳{" "}
                  {formatMoney(
                    filtered.reduce((acc, p) => acc + p.totalRevenue, 0)
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {paginated.length > 0 && (
        <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>entries per page (Total {totalCount} products)</span>
          </div>

          <Pagination
            pageCount={pageCount}
            currentPageNumber={currentPage}
            handlePagination={(data) => setCurrentPage(data.selected + 1)}
          />
        </div>
      )}
    </div>
  );
};

export default ProductSalesReportTable;
