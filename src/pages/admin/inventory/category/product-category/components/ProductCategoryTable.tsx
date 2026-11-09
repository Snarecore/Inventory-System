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
  TableActionButtons,
  ExcelExportButton,
} from "@/components/common";
import type { ProductCategoryItem } from "@/types";
import { exportProductCategoriesToExcel } from "@/utils/excel-export";
import { showSuccessToast, showErrorToast } from "@/utils/toast-utils";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { FiChevronDown } from "react-icons/fi";
import { usePermission } from "@/hooks/usePermission";

interface ProductCategoryTableProps {
  categories: ProductCategoryItem[];
  isLoading: boolean;
  onAddNew: () => void;
  onEdit: (item: ProductCategoryItem) => void;
  onDelete: (item: ProductCategoryItem) => void;
  onToggleStatus: (item: ProductCategoryItem) => void;
  togglingId?: number | null;
}

export const ProductCategoryTable: React.FC<ProductCategoryTableProps> = ({
  categories,
  isLoading,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
  togglingId,
}) => {
  const { canCreate, canUpdate, canDelete } = usePermission();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState<"name" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Compute status counts in a single pass
  let statusActiveCount = 0;
  let statusInactiveCount = 0;
  const statusAllCount = categories.length;

  for (const c of categories) {
    const st = (c.status || "").toLowerCase();
    if (st === "active") statusActiveCount++;
    else if (st === "inactive") statusInactiveCount++;
  }

  // Status tabs configuration: All -> Active -> Inactive
  const statusTabs = [
    { label: "All", value: "", count: statusAllCount },
    { label: "Active", value: "Active", count: statusActiveCount, icon: FaCheckCircle },
    { label: "Inactive", value: "Inactive", count: statusInactiveCount, icon: FaTimesCircle },
  ];

  // Filter list
  const term = searchQuery.trim().toLowerCase();
  const filtered = categories.filter((item) => {
    const matchesSearch =
      !term ||
      (item.name || "").toLowerCase().includes(term) ||
      (item.description || "").toLowerCase().includes(term);

    const matchesStatus =
      !statusFilter || (item.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Sort list
  const sorted = [...filtered].sort((a, b) => {
    const factor = sortDir === "asc" ? 1 : -1;
    const valA = String(a[sortKey] || "").toLowerCase();
    const valB = String(b[sortKey] || "").toLowerCase();
    return valA.localeCompare(valB) * factor;
  });

  // Pagination slice
  const totalCount = sorted.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedRows = sorted.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortHeader = (label: string, key: typeof sortKey, align: string = "left") => {
    const isActive = sortKey === key;
    return (
      <span
        onClick={() => handleSort(key)}
        className={`inline-flex items-center gap-1 select-none text-current cursor-pointer ${
          align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : ""
        }`}
      >
        <span>{label}</span>
        <FiChevronDown
          size={11}
          className={`text-current transition-transform duration-200 ${
            isActive && sortDir === "asc" ? "rotate-180" : ""
          }`}
        />
      </span>
    );
  };

  const handleExport = () => {
    const dataToExport = filtered.length > 0 ? filtered : categories;
    if (!dataToExport || dataToExport.length === 0) {
      showErrorToast("No product category records available to export");
      return;
    }
    try {
      exportProductCategoriesToExcel(dataToExport);
      showSuccessToast(`Successfully exported ${dataToExport.length} categories to Excel!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export Excel file";
      showErrorToast(msg);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Main Table Container */}
      <TableContainer className="w-full">
        {/* Table Toolbar */}
        <TableToolbar>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            {/* Search Box */}
            <div className="w-full sm:w-72">
              <Search
                searchQuery={searchQuery}
                onSearchChange={(val) => {
                  setSearchQuery(val);
                  setCurrentPage(1);
                }}
                placeholder="Search by category name or description..."
              />
            </div>

            {/* Right Group: Status Segmented Tabs & Reusable Excel Export Button */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <div className="inline-flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50 h-8">
                {statusTabs.map((tab) => {
                  const isActive = statusFilter === tab.value;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(tab.value);
                        setCurrentPage(1);
                      }}
                      className={`h-7 px-3 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? tab.value === "Active"
                            ? "bg-white text-emerald-600 shadow-xs"
                            : tab.value === "Inactive"
                            ? "bg-white text-rose-600 shadow-xs"
                            : "bg-white text-[var(--color-primary)] shadow-xs"
                          : "text-gray-600 hover:text-black"
                      }`}
                    >
                      {Icon && (
                        <Icon
                          size={11}
                          className={
                            isActive
                              ? tab.value === "Active"
                                ? "text-emerald-600"
                                : "text-rose-600"
                              : "text-gray-400"
                          }
                        />
                      )}
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive
                            ? tab.value === "Active"
                              ? "bg-emerald-100 text-emerald-700"
                              : tab.value === "Inactive"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-sky-100 text-sky-700"
                            : "bg-gray-200/70 text-gray-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Reusable Excel Export Button */}
              <ExcelExportButton
                onClick={handleExport}
                title="Download Product Categories Excel Report"
              />
            </div>
          </div>
        </TableToolbar>

        {/* Main Table Content */}
        <TableScroll>
          {isLoading && categories.length === 0 ? (
            <div className="p-3">
              <TableSkeleton columnCount={5} rowCount={8} />
            </div>
          ) : (
            <Table minWidth={700}>
              <TableHead>
                <TableTh width={60} align="center">
                  SL
                </TableTh>
                <TableTh>
                  {renderSortHeader("Category Name", "name")}
                </TableTh>
                <TableTh width={280}>
                  Description
                </TableTh>
                <TableTh width={120} align="center">
                  {renderSortHeader("Status", "status", "center")}
                </TableTh>
                <TableTh width={110} align="center">
                  Action
                </TableTh>
              </TableHead>

              <TableBody>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((item, index) => {
                    const isActive = (item.status || "").toLowerCase() === "active";
                    const isToggling = togglingId === item.id;
                    const sl = (safeCurrentPage - 1) * pageSize + index + 1;

                    return (
                      <TableRow key={item.id || index}>
                        {/* SL */}
                        <TableCell align="center" className="text-black font-medium">
                          {sl}
                        </TableCell>

                        {/* Category Name */}
                        <TableCell>
                          <span className="font-semibold text-black truncate block">
                            {item.name}
                          </span>
                        </TableCell>

                        {/* Description */}
                        <TableCell className="text-gray-600 text-xs">
                          {item.description ? (
                            <span className="truncate max-w-[260px] block" title={item.description}>
                              {item.description}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">—</span>
                          )}
                        </TableCell>

                        {/* Status Toggle Badge */}
                        <TableCell align="center">
                          <button
                            type="button"
                            onClick={() => canUpdate("category_product") && onToggleStatus(item)}
                            disabled={isToggling || !canUpdate("category_product")}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                              !canUpdate("category_product")
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                : isToggling
                                ? "bg-gray-100 text-gray-500 border-gray-300 cursor-wait"
                                : isActive
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 cursor-pointer"
                                : "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 cursor-pointer"
                            }`}
                            title={
                              !canUpdate("category_product")
                                ? "Permission required to change status"
                                : "Click to toggle status"
                            }
                          >
                            {isToggling ? "Updating..." : isActive ? "Active" : "Inactive"}
                          </button>
                        </TableCell>

                        {/* Action: Edit & Delete */}
                        <TableCell align="center">
                          <TableActionButtons
                            onEdit={canUpdate("category_product") ? () => onEdit(item) : undefined}
                            onDelete={canDelete("category_product") ? () => onDelete(item) : undefined}
                            editTitle="Edit Category"
                            deleteTitle="Delete Category"
                            className="justify-center"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <EmptyState
                        title="No categories found"
                        description="There are no product categories matching your search or filters."
                        buttonText={canCreate("category_product") ? "+ Add Category" : undefined}
                        onButtonClick={canCreate("category_product") ? onAddNew : undefined}
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
            setDataLimit={setPageSize}
            setCurrentPageNumber={setCurrentPage}
            handlePagination={(d) => setCurrentPage(d.selected + 1)}
            entityLabel="categories"
            pageSizeOptions={[10, 20, 50, 100]}
          />
        )}
      </TableContainer>
    </div>
  );
};

export default ProductCategoryTable;
