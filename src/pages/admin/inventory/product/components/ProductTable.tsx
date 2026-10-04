import { useState, useMemo } from "react";
import { FiEye, FiEdit, FiTrash2, FiPackage, FiAlertTriangle, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { Link } from "react-router-dom";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import Modal from "@/components/modal/Modal";
import DeleteModal from "@/components/modal/DeleteModal";
import { showSuccessToast } from "@/utils/toast-utils";
import type { ProductItem } from "@/types";

interface ProductTableProps {
    products: ProductItem[];
    totalCount: number;
    isLoading?: boolean;
    isFetching?: boolean;
    pageCount: number;
    currentPageNumber: number;
    setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
    handlePagination: (paginationData: { selected: number }) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    categoryFilter: string;
    setCategoryFilter: (category: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
    categoryOptions: { label: string; value: string }[];
    onRefresh: () => void;
}

export const ProductTable = ({
    products,
    totalCount,
    isLoading,
    isFetching,
    pageCount,
    currentPageNumber,
    setCurrentPageNumber,
    handlePagination,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    categoryOptions,
}: ProductTableProps) => {
    const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const statusOptions = [
        { label: "All Status", value: "" },
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Low Stock Alert", value: "low_stock" },
    ];

    const categoryDropdownOptions = useMemo(() => {
        return [{ label: "All Categories", value: "" }, ...categoryOptions];
    }, [categoryOptions]);

    const tableHeaders = [
        { key: "sl", label: "#", align: "text-center" },
        { key: "name", label: "Product Name & Code", align: "text-left" },
        { key: "category", label: "Category", align: "text-left" },
        { key: "sku", label: "SKU / Barcode", align: "text-left" },
        { key: "stock", label: "Stock & Unit", align: "text-center" },
        { key: "buyPrice", label: "Buy Price", align: "text-right" },
        { key: "sellPrice", label: "Sell Price", align: "text-right" },
        { key: "status", label: "Status", align: "text-center" },
        { key: "action", label: "Actions", align: "text-center" },
    ];

    const openQuickView = (product: ProductItem) => {
        setSelectedProduct(product);
        setIsDetailsModalOpen(true);
    };

    const closeQuickView = () => {
        setIsDetailsModalOpen(false);
        setSelectedProduct(null);
    };

    const openDeleteModal = (product: ProductItem) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
    };

    const handleDelete = () => {
        if (productToDelete) {
            showSuccessToast(`Product "${getName(productToDelete)}" removed successfully.`);
            closeDeleteModal();
        }
    };

    // Helper functions for safe field access
    const getName = (p: ProductItem) => p.name || p.productName || "Unnamed Product";
    const getCode = (p: ProductItem) => p.pcode || p.productCode || p.code || "";
    const getSku = (p: ProductItem) => p.sku || "-";
    const getBarcode = (p: ProductItem) => p.barcode || "";
    const getCategory = (p: ProductItem) => p.category || p.categoryName || "General";
    const getUnit = (p: ProductItem) => p.unit || "PCS";
    const getQuantity = (p: ProductItem) => Number(p.quantity ?? p.stock ?? p.stockQuantity ?? p.currentStock ?? p.current_stock ?? p.totalQuantity ?? p.qty ?? p.availableStock ?? 0);
    const getBuyPrice = (p: ProductItem) => Number(p.buy_price ?? p.buyPrice ?? 0);
    const getSellPrice = (p: ProductItem) => Number(p.sell_price ?? p.sellPrice ?? 0);
    const getLowThreshold = (p: ProductItem) => Number(p.low_stock_threshold ?? p.lowStockThreshold ?? 5);
    const isActive = (p: ProductItem) => {
        if (p.status === "active" || p.status === true || p.status === "ACTIVE" || String(p.status) === "true") return true;
        if (p.status === "inactive" || p.status === false || p.status === "INACTIVE" || String(p.status) === "false") return false;
        return true;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table Header: Search & Filters */}
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="w-full md:w-80">
                        <Search
                            searchQuery={searchQuery}
                            onSearchChange={(value) => {
                                setSearchQuery(value);
                                setCurrentPageNumber(1);
                            }}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Category Dropdown */}
                        <DropdownFilter
                            title="Category"
                            options={categoryDropdownOptions}
                            selectedOption={
                                categoryFilter
                                    ? categoryDropdownOptions.find((o) => o.value === categoryFilter) || null
                                    : null
                            }
                            isOpen={openDropdown === "category"}
                            onToggle={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
                            onSelect={(selected) => {
                                setCategoryFilter(selected ? selected.value : "");
                                setCurrentPageNumber(1);
                                setOpenDropdown(null);
                            }}
                        />

                        {/* Status Dropdown */}
                        <DropdownFilter
                            title="Status / Stock"
                            options={statusOptions}
                            selectedOption={
                                statusFilter
                                    ? statusOptions.find((o) => o.value === statusFilter) || null
                                    : null
                            }
                            isOpen={openDropdown === "status"}
                            onToggle={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
                            onSelect={(selected) => {
                                setStatusFilter(selected ? selected.value : "");
                                setCurrentPageNumber(1);
                                setOpenDropdown(null);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Loading Skeleton */}
            {isLoading || isFetching ? (
                <div className="p-4">
                    <TableSkeleton />
                </div>
            ) : (
                <>
                    {/* Products Table */}
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[950px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-600 tracking-wider">
                                    {tableHeaders.map(({ key, label, align }) => (
                                        <th
                                            key={key}
                                            className={`px-4 py-3.5 ${align} ${key === "sl" ? "w-14" : ""}`}
                                        >
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 bg-white text-sm">
                                {products.length > 0 ? (
                                    products.map((product, index) => {
                                        const qty = getQuantity(product);
                                        const lowThreshold = getLowThreshold(product);
                                        const isLowStock = qty <= lowThreshold;
                                        const active = isActive(product);
                                        const rowNumber = (currentPageNumber - 1) * 10 + (index + 1);

                                        return (
                                            <tr
                                                key={product.id || product.pcode || index}
                                                className="hover:bg-blue-50/40 transition-colors duration-150 group"
                                            >
                                                {/* SL */}
                                                <td className="px-4 py-3.5 text-center text-xs font-medium text-gray-500">
                                                    {rowNumber}
                                                </td>

                                                {/* Product Name & Code */}
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-[var(--color-primary,#009FE3)] flex items-center justify-center font-semibold text-sm border border-blue-100 flex-shrink-0 group-hover:scale-105 transition-transform">
                                                            <FiPackage className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-gray-900 group-hover:text-[var(--color-primary,#009FE3)] transition-colors line-clamp-1">
                                                                {getName(product)}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                                                {getCode(product) && (
                                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] text-gray-700">
                                                                        {getCode(product)}
                                                                    </span>
                                                                )}
                                                                {product.packing_levels && (
                                                                    <span className="text-[11px] text-gray-400">
                                                                        • {product.packing_levels}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Category */}
                                                <td className="px-4 py-3.5">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                        {getCategory(product)}
                                                    </span>
                                                </td>

                                                {/* SKU & Barcode */}
                                                <td className="px-4 py-3.5">
                                                    <div className="text-xs">
                                                        <div className="font-mono font-medium text-gray-800">
                                                            {getSku(product)}
                                                        </div>
                                                        {getBarcode(product) && (
                                                            <div className="text-[11px] text-gray-400 font-mono">
                                                                {getBarcode(product)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Stock & Unit */}
                                                <td className="px-4 py-3.5 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="font-semibold text-gray-900">
                                                            {qty}{" "}
                                                            <span className="text-xs text-gray-500 font-normal">
                                                                {getUnit(product)}
                                                            </span>
                                                        </span>
                                                        {isLowStock && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                                                                <FiAlertTriangle className="w-2.5 h-2.5" />
                                                                Low Stock ({lowThreshold})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Buy Price */}
                                                <td className="px-4 py-3.5 text-right font-medium text-gray-700">
                                                    ৳{getBuyPrice(product).toLocaleString()}
                                                </td>

                                                {/* Sell Price */}
                                                <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                                                    ৳{getSellPrice(product).toLocaleString()}
                                                    {product.secondary_unit && (
                                                        <div className="text-[11px] font-normal text-gray-500 mt-0.5">
                                                            ৳{Number(product.secondary_price || 0).toLocaleString()} / {product.secondary_unit}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3.5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                            active
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : "bg-red-50 text-red-700 border border-red-200"
                                                        }`}
                                                    >
                                                        {active ? (
                                                            <>
                                                                <FiCheckCircle className="w-3 h-3" />
                                                                Active
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FiXCircle className="w-3 h-3" />
                                                                Inactive
                                                            </>
                                                        )}
                                                    </span>
                                                </td>

                                                {/* Actions: Eye, Edit, Delete */}
                                                <td className="px-4 py-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {/* Eye / View Icon */}
                                                        <button
                                                            onClick={() => openQuickView(product)}
                                                            title="Quick View Details"
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white transition-all duration-200 shadow-xs hover:shadow hover:scale-105 cursor-pointer"
                                                        >
                                                            <FiEye className="w-4 h-4" />
                                                        </button>

                                                        {/* Edit Icon */}
                                                        <Link
                                                            to={`/admin/edit-product/${product.id || product.pcode || ""}`}
                                                            state={{ editData: product }}
                                                            title="Edit Product"
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all duration-200 shadow-xs hover:shadow hover:scale-105 cursor-pointer"
                                                        >
                                                            <FiEdit className="w-3.5 h-3.5" />
                                                        </Link>

                                                        {/* Delete Icon */}
                                                        <button
                                                            onClick={() => openDeleteModal(product)}
                                                            title="Delete Product"
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all duration-200 shadow-xs hover:shadow hover:scale-105 cursor-pointer"
                                                        >
                                                            <FiTrash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={tableHeaders.length} className="py-12 text-center">
                                            <EmptyState
                                                title={
                                                    searchQuery || categoryFilter || statusFilter
                                                        ? "No products matching your search/filters"
                                                        : "No products available in inventory"
                                                }
                                                description={
                                                    searchQuery || categoryFilter || statusFilter
                                                        ? "Try clearing the search or filters to see all products."
                                                        : "Click 'Add Product' above to create your first product."
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination & Summary Footer */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-gray-600">
                            Showing{" "}
                            <span className="font-semibold text-gray-900">
                                {products.length > 0 ? (currentPageNumber - 1) * 10 + 1 : 0}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-gray-900">
                                {Math.min(currentPageNumber * 10, totalCount)}
                            </span>{" "}
                            of <span className="font-semibold text-gray-900">{totalCount}</span> products
                        </div>

                        {pageCount > 1 && (
                            <Pagination
                                pageCount={pageCount}
                                currentPageNumber={currentPageNumber}
                                handlePagination={handlePagination}
                            />
                        )}
                    </div>
                </>
            )}

            {/* Quick View Details Modal */}
            {selectedProduct && isDetailsModalOpen && (
                <Modal
                    isOpen={isDetailsModalOpen}
                    title={`Product Details — ${getName(selectedProduct)}`}
                    onClose={closeQuickView}
                >
                    <div className="space-y-4 text-sm text-gray-700">
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                                <span className="text-xs text-gray-500 font-medium">Product Code</span>
                                <p className="font-mono font-semibold text-gray-900">{getCode(selectedProduct) || "N/A"}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 font-medium">SKU</span>
                                <p className="font-mono font-semibold text-gray-900">{getSku(selectedProduct)}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 font-medium">Barcode</span>
                                <p className="font-mono font-semibold text-gray-900">{getBarcode(selectedProduct) || "N/A"}</p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 font-medium">Category</span>
                                <p className="font-semibold text-gray-900">{getCategory(selectedProduct)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                            <div>
                                <span className="text-xs text-gray-500 font-medium">Current Stock</span>
                                <p className="text-base font-bold text-gray-900">
                                    {getQuantity(selectedProduct)} {getUnit(selectedProduct)}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 font-medium">Buy Price</span>
                                <p className="text-base font-bold text-gray-900">
                                    ৳{getBuyPrice(selectedProduct).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 font-medium">Sell Price</span>
                                <p className="text-base font-bold text-emerald-600">
                                    ৳{getSellPrice(selectedProduct).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {selectedProduct.secondary_unit && (
                            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100 flex items-center justify-between">
                                <span className="text-xs font-medium text-amber-900">
                                    Secondary Unit: <span className="font-bold">{selectedProduct.secondary_unit}</span>
                                </span>
                                <span className="text-xs font-bold text-amber-900">
                                    Price: ৳{Number(selectedProduct.secondary_price || 0).toLocaleString()}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 pt-2 border-t border-gray-100">
                            <div>
                                <span className="text-gray-400">Low Stock Alert:</span>{" "}
                                <span className="font-semibold text-gray-800">{getLowThreshold(selectedProduct)} {getUnit(selectedProduct)}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">Status:</span>{" "}
                                <span className={`font-semibold ${isActive(selectedProduct) ? "text-emerald-600" : "text-red-600"}`}>
                                    {isActive(selectedProduct) ? "Active" : "Inactive"}
                                </span>
                            </div>
                            {selectedProduct.packing_levels && (
                                <div className="col-span-2">
                                    <span className="text-gray-400">Packing Levels:</span>{" "}
                                    <span className="font-semibold text-gray-800">{selectedProduct.packing_levels}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 gap-2">
                            <Link
                                to={`/admin/products/${selectedProduct.id || selectedProduct.pcode || ""}`}
                                className="px-4 py-2 text-xs font-medium text-white bg-[var(--color-primary,#009FE3)] hover:opacity-90 rounded-lg transition-opacity"
                            >
                                Full Page View
                            </Link>
                            <button
                                onClick={closeQuickView}
                                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {productToDelete && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Product"
                    message={`Are you sure you want to delete "${getName(productToDelete)}"? This action cannot be undone.`}
                    onClose={closeDeleteModal}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};

export default ProductTable;
