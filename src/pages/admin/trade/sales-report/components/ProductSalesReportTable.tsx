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
import * as XLSX from "xlsx";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import moment from "moment";
import type { SaleItem } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

interface ProductSalesReportTableProps {
  transactions: SaleItem[];
  isLoading?: boolean;
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
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("revenue_desc");
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

    return Object.values(map);
  }, [transactions]);

  // Overall total revenue from products
  const grandProductRevenue = useMemo(
    () => productSummaries.reduce((acc, p) => acc + p.totalRevenue, 0),
    [productSummaries]
  );

  // Filter & Sort
  const filtered = useMemo(() => {
    let list = productSummaries;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q)
      );
    }

    const sorted = [...list];
    if (sortBy === "revenue_desc") {
      sorted.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (sortBy === "revenue_asc") {
      sorted.sort((a, b) => a.totalRevenue - b.totalRevenue);
    } else if (sortBy === "qty_desc") {
      sorted.sort((a, b) => b.totalQuantity - a.totalQuantity);
    } else if (sortBy === "name_asc") {
      sorted.sort((a, b) => a.productName.localeCompare(b.productName));
    }

    return sorted;
  }, [productSummaries, debouncedSearch, sortBy]);

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
      const data = filtered.map((p, idx) => ({
        "SL": idx + 1,
        "Product Code": p.productCode,
        "Product Name": p.productName,
        "Unit": p.unit,
        "Quantity Sold": p.totalQuantity,
        "Invoices Sold": p.invoicesCount,
        "Total Revenue (BDT)": p.totalRevenue,
        "Discount (BDT)": p.totalDiscount,
        "Share of Sales":
          grandProductRevenue > 0
            ? `${((p.totalRevenue / grandProductRevenue) * 100).toFixed(1)}%`
            : "0.0%",
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
            placeholder="Search product code, name..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort selector */}
          <div className="relative w-40 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-8 pl-2.5 pr-6 text-xs border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white text-gray-800 font-medium focus:outline-none focus:border-[var(--primary-color)] cursor-pointer appearance-none"
            >
              <option value="revenue_desc">Highest Revenue</option>
              <option value="revenue_asc">Lowest Revenue</option>
              <option value="qty_desc">Highest Qty Sold</option>
              <option value="name_asc">Product Name (A-Z)</option>
            </select>
            <FiChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"
              size={13}
            />
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 h-8 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <FaFileExcel className="text-emerald-600" size={12} />
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
            title="No Product Sales Found"
            description="No line items found in the current transactions set."
          />
        ) : (
          <Table>
            <TableHead>
              <TableTh align="center" width={40}>SL</TableTh>
              <TableTh width={130}>Product Code</TableTh>
              <TableTh>Product Description</TableTh>
              <TableTh align="center" width={70}>Unit</TableTh>
              <TableTh align="center" width={80}>Orders</TableTh>
              <TableTh align="right" width={100}>Qty Sold</TableTh>
              <TableTh align="right" width={110}>Avg Rate (৳)</TableTh>
              <TableTh align="right" width={110}>Discounts (৳)</TableTh>
              <TableTh align="right" width={130}>Net Revenue (৳)</TableTh>
              <TableTh align="right" width={110}>Contribution</TableTh>
            </TableHead>
            <TableBody>
              {paginated.map((item, idx) => {
                const sharePct =
                  grandProductRevenue > 0
                    ? ((item.totalRevenue / grandProductRevenue) * 100).toFixed(1)
                    : "0.0";
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
                    <td className="py-2.5 px-3 font-bold font-mono text-xs text-gray-900">
                      {item.productCode}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                      {item.productName}
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-500 text-xs">
                      {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-xs text-gray-700">
                      {item.invoicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-xs text-gray-900">
                      {item.totalQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-700">
                      ৳ {formatMoney(avgPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-500">
                      {item.totalDiscount > 0
                        ? `৳ ${formatMoney(item.totalDiscount)}`
                        : "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-xs text-gray-900 whitespace-nowrap">
                      ৳ {formatMoney(item.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-gray-700">
                      {sharePct}%
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
          entityLabel="products"
        />
      )}
    </TableContainer>
  );
};

export default ProductSalesReportTable;
