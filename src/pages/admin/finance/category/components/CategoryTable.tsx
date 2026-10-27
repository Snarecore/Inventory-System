import React, { useState } from "react";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import {
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
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";
import type { CategoryItem, CategoryType } from "@/types";
import { FiChevronDown, FiLock } from "react-icons/fi";

interface CategoryTableProps {
  categories: CategoryItem[];
  isLoading: boolean;
  onAddNew: () => void;
  onEdit: (item: CategoryItem) => void;
  onToggleStatus: (item: CategoryItem) => void;
  togglingId?: number | null;
}

const typeOptions = [
  { label: "All Types", value: "" },
  { label: "Expense", value: "Expense" },
  { label: "Income", value: "Income" },
  { label: "Cash", value: "Cash" },
];

const statusOptions = [
  { label: "All Status", value: "" },
  { label: "Active", value: "Active" },
  { label: "Inactive", value: "Inactive" },
];

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  isLoading,
  onAddNew: _onAddNew,
  onEdit,
  onToggleStatus,
  togglingId,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Sorting
  const [sortKey, setSortKey] = useState<"categoryName" | "type" | "openingBalance" | "status">(
    "categoryName"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter list
  const term = searchQuery.trim().toLowerCase();
  const filtered = categories.filter((item) => {
    const itemType = normalizeCategoryType(item.type);
    const matchesSearch =
      !term ||
      (item.categoryName || "").toLowerCase().includes(term) ||
      itemType.toLowerCase().includes(term);

    const matchesType = !typeFilter || itemType.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus =
      !statusFilter || (item.status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort list
  const sorted = [...filtered].sort((a, b) => {
    const factor = sortDir === "asc" ? 1 : -1;
    if (sortKey === "openingBalance") {
      return (Number(a.openingBalance || 0) - Number(b.openingBalance || 0)) * factor;
    }
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
        className={`inline-flex items-center gap-1 select-none text-black cursor-pointer ${
          align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : ""
        }`}
      >
        <span>{label}</span>
        <FiChevronDown
          size={11}
          className={`text-black transition-transform duration-200 ${
            isActive && sortDir === "asc" ? "rotate-180" : ""
          }`}
        />
      </span>
    );
  };

  const formatMoney = (val?: string | number) => {
    const num = Number(val || 0);
    return `৳ ${num.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
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
              placeholder="Search by category name or type..."
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Dropdown */}
            <DropdownFilter
              title="Category Type"
              options={typeOptions}
              selectedOption={typeOptions.find((o) => o.value === typeFilter) || null}
              isOpen={openDropdown === "type"}
              onToggle={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
              onSelect={(selected) => {
                setTypeFilter(selected.value);
                setCurrentPage(1);
                setOpenDropdown(null);
              }}
            />

            {/* Status Dropdown */}
            <DropdownFilter
              title="Status"
              options={statusOptions}
              selectedOption={statusOptions.find((o) => o.value === statusFilter) || null}
              isOpen={openDropdown === "status"}
              onToggle={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
              onSelect={(selected) => {
                setStatusFilter(selected.value);
                setCurrentPage(1);
                setOpenDropdown(null);
              }}
            />
          </div>
        </div>
      </TableToolbar>

      {/* Main Table Content */}
      <TableScroll>
        {isLoading && categories.length === 0 ? (
          <div className="p-3">
            <TableSkeleton columnCount={6} rowCount={8} />
          </div>
        ) : (
          <Table minWidth={750}>
            <TableHead>
              <TableTh width={60} align="center">
                SL
              </TableTh>
              <TableTh>
                {renderSortHeader("Category Name", "categoryName")}
              </TableTh>
              <TableTh width={140}>
                {renderSortHeader("Type", "type")}
              </TableTh>
              <TableTh width={160} align="right">
                {renderSortHeader("Opening Balance", "openingBalance", "right")}
              </TableTh>
              <TableTh width={120} align="center">
                {renderSortHeader("Status", "status", "center")}
              </TableTh>
              <TableTh width={100} align="center">
                Action
              </TableTh>
            </TableHead>

            <TableBody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((item, index) => {
                  const isAdmin = isCategoryAdmin(item);
                  const normType = normalizeCategoryType(item.type);
                  const isActive = (item.status || "").toLowerCase() === "active";
                  const isToggling = togglingId === item.categoryId;
                  const sl = (safeCurrentPage - 1) * pageSize + index + 1;

                  return (
                    <TableRow key={item.categoryId || index}>
                      {/* SL */}
                      <TableCell align="center" className="text-gray-500 font-normal">
                        {sl}
                      </TableCell>

                      {/* Category Name */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium text-black truncate">
                            {item.categoryName}
                          </span>
                          {isAdmin && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300 shrink-0"
                              title="System default category — locked"
                            >
                              <FiLock size={10} />
                              Default
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            normType === "Expense"
                              ? "bg-rose-100 text-rose-800 border-rose-300"
                              : normType === "Income"
                              ? "bg-sky-100 text-sky-800 border-sky-300"
                              : "bg-purple-100 text-purple-800 border-purple-300"
                          }`}
                        >
                          {normType}
                        </span>
                      </TableCell>

                      {/* Opening Balance */}
                      <TableCell align="right">
                        {normType === "Cash" ? (
                          <span className="font-semibold text-gray-900">
                            {formatMoney(item.openingBalance)}
                          </span>
                        ) : (
                          <span className="text-gray-400 select-none">-</span>
                        )}
                      </TableCell>

                      {/* Status Toggle Badge */}
                      <TableCell align="center">
                        <button
                          type="button"
                          onClick={() => !isAdmin && onToggleStatus(item)}
                          disabled={isAdmin || isToggling}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                            isAdmin
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                              : isToggling
                              ? "bg-gray-100 text-gray-500 border-gray-300 cursor-wait"
                              : isActive
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 cursor-pointer"
                              : "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 cursor-pointer"
                          }`}
                          title={isAdmin ? "System default category status cannot be changed" : "Click to toggle status"}
                        >
                          {isToggling ? "Updating..." : isActive ? "Active" : "Inactive"}
                        </button>
                      </TableCell>

                      {/* Action: Edit */}
                      <TableCell align="center">
                        {isAdmin ? (
                          <span
                            className="p-1 rounded text-gray-300 cursor-not-allowed inline-flex items-center justify-center"
                            title="Default category cannot be edited"
                          >
                            <FiLock size={14} />
                          </span>
                        ) : (
                          <TableActionButtons
                            onEdit={() => onEdit(item)}
                            editTitle="Edit Category"
                            className="justify-center"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <EmptyState
                      title={
                        searchQuery || typeFilter || statusFilter
                          ? "No categories matching your search or filters"
                          : "No categories available"
                      }
                      description={
                        searchQuery || typeFilter || statusFilter
                          ? "Try clearing the search or filters to see all categories."
                          : "Click 'Add Category' above to create your first financial category."
                      }
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
          setCurrentPageNumber={(p) => setCurrentPage(p)}
          handlePagination={(d) => setCurrentPage(d.selected + 1)}
          entityLabel="categories"
          pageSizeOptions={[10, 20, 50, 100]}
        />
      )}
    </TableContainer>
  );
};

export default CategoryTable;
