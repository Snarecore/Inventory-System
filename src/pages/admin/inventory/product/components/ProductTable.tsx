import { useState, useMemo } from "react";
import { FiEye, FiEdit, FiTrash2 } from "react-icons/fi";
import { Link } from "react-router-dom";
import Search from "@/components/table-components/Search";
import DropdownFilter from "@/components/table-components/DropdownFilter";
import EmptyState from "@/components/empty-state/EmptyState";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import Pagination from "@/components/pagination";
import Modal from "@/components/modal/Modal";
import DeleteModal from "@/components/modal/DeleteModal";
import { showErrorToast } from "@/utils/toast-utils";
import { useAPI } from "@/hooks/useApi";
import apiConfig from "@/config/api.json";
import { productListQueryKey, productQueryKey, insertProductQueryKey } from "@/config/query-key";
import { buildAccessUser, withBranchScope } from "@/utils/access-user";
import type { ProductItem } from "@/types";

interface ProductTableProps {
    products: ProductItem[];
    totalCount: number;
    isLoading?: boolean;
    isFetching?: boolean;
    pageCount: number;
    currentPageNumber: number;
    setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
    dataLimit: number;
    setDataLimit: React.Dispatch<React.SetStateAction<number>>;
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
    dataLimit,
    setDataLimit,
    handlePagination,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    categoryOptions,
    onRefresh,
}: ProductTableProps) => {
    const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const { handleApiMutation, postMutation } = useAPI();
    const insertProductUrl = apiConfig.inventory?.insertProductUrl || "insert-product";

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
        { key: "sl", label: "SL", align: "text-center" },
        { key: "name", label: "Product Name", align: "text-left" },
        { key: "category", label: "Category", align: "text-left" },
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

    const handleDelete = async () => {
        if (!productToDelete) return;
        try {
            const deletePayload = withBranchScope({
                ...productToDelete,
                id: productToDelete.id || (productToDelete as any).product_id,
                product_id: productToDelete.id || (productToDelete as any).product_id,
                name: getName(productToDelete),
                pcode: getCode(productToDelete),
                category: getCategory(productToDelete),
                unit: getUnit(productToDelete),
                buy_price: getBuyPrice(productToDelete),
                sell_price: getSellPrice(productToDelete),
                is_deleted: "YES",
                isDeleted: "YES",
                isSync: "YES",
                status: "Inactive",
                operation: "delete",
                updated_at: new Date().toISOString()
            });

            const result = await handleApiMutation({
                mutation: postMutation as any,
                url: insertProductUrl,
                body: {
                    accessUser: buildAccessUser(),
                    product: deletePayload
                },
                invalidateQueryKey: [productListQueryKey, productQueryKey, insertProductQueryKey],
                showSuccessMessage: true,
                showErrorMessage: true
            });

            if (result?.success) {
                closeDeleteModal();
                onRefresh();
            }
        } catch (error) {
            console.error("Failed to delete product:", error);
            showErrorToast("Failed to delete product.");
        }
    };

    const handleToggleProductStatus = async (product: ProductItem) => {
        const prodId = product.id || (product as any).product_id || product.pcode;
        const targetId = String(prodId || "");
        if (!targetId || togglingId) return;

        setTogglingId(targetId);
        const nextStatus = isActive(product) ? "Inactive" : "Active";

        try {
            const updatedProductPayload = withBranchScope({
                ...product,
                id: product.id || (product as any).product_id,
                product_id: product.id || (product as any).product_id,
                name: getName(product),
                pcode: getCode(product),
                category: getCategory(product),
                unit: getUnit(product),
                buy_price: getBuyPrice(product),
                sell_price: getSellPrice(product),
                status: nextStatus,
                operation: "update",
                updated_at: new Date().toISOString()
            });

            const result = await handleApiMutation({
                mutation: postMutation as any,
                url: insertProductUrl,
                body: {
                    accessUser: buildAccessUser(),
                    product: updatedProductPayload
                },
                invalidateQueryKey: [productListQueryKey, productQueryKey, insertProductQueryKey],
                showSuccessMessage: true,
                showErrorMessage: true
            });

            if (result?.success) {
                onRefresh();
            }
        } catch (error) {
            console.error("Failed to toggle status:", error);
        } finally {
            setTogglingId(null);
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
        const raw = String(p?.status ?? "").trim().toLowerCase();
        if (raw === "inactive" || raw === "false" || raw === "0" || p?.status === false || p?.status === 0) {
            return false;
        }
        return true;
    };

    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col relative z-20 overflow-visible">
            {/* Table Header: Search (Left) & Controls/Filters (Right) */}
            <div className="p-2 sm:p-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 relative z-40 overflow-visible">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
                    {/* Left: Search Box */}
                    <div className="w-full sm:w-56">
                        <Search
                            searchQuery={searchQuery}
                            onSearchChange={(value) => {
                                setSearchQuery(value);
                                setCurrentPageNumber(1);
                            }}
                            placeholder="Search products..."
                        />
                    </div>

                    {/* Right: Show Entries & Dropdown Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Show Entries Card */}
                        <div className="border border-gray-200 rounded-lg px-2 h-8 inline-flex items-center gap-1.5 bg-gray-50/50 hover:bg-white text-xs text-black whitespace-nowrap">
                            <span>Show</span>
                            <select
                                value={dataLimit}
                                onChange={(e) => {
                                    setDataLimit(Number(e.target.value));
                                    setCurrentPageNumber(1);
                                }}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs text-black bg-white focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                            >
                                {[10, 20, 50, 70, 100].map((limit) => (
                                    <option key={limit} value={limit}>
                                        {limit}
                                    </option>
                                ))}
                            </select>
                            <span>entries</span>
                        </div>

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
            {isLoading && products.length === 0 ? (
                <div className="p-4">
                    <TableSkeleton />
                </div>
            ) : (
                <>
                    {/* Products Table */}
                    <div className="w-full overflow-x-auto relative z-10">
                        <table className="w-full text-left border-collapse min-w-[950px] text-xs">
                            <thead>
                                <tr className="bg-[#41BEF3] text-black text-xs font-semibold">
                                    {tableHeaders.map(({ key, label, align }) => (
                                        <th
                                            key={key}
                                            className={`py-2 px-3 ${align} ${key === "sl" ? "w-10 text-center" : ""}`}
                                        >
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 bg-white">
                                {products.length > 0 ? (
                                    products.map((product, index) => {
                                        const qty = getQuantity(product);
                                        const lowThreshold = getLowThreshold(product);
                                        const isLowStock = qty <= lowThreshold;
                                        const active = isActive(product);
                                        const rowNumber = (currentPageNumber - 1) * dataLimit + (index + 1);
                                        const prodId = String(product.id || product.pcode || index);

                                        return (
                                            <tr
                                                key={prodId}
                                                className="hover:bg-sky-50/40 transition-colors duration-150 group"
                                            >
                                                {/* SL */}
                                                <td className="py-2 px-3 text-center text-xs font-normal text-black">
                                                    {rowNumber}
                                                </td>

                                                {/* Product Name */}
                                                <td className="py-2 px-3 font-normal text-xs text-black">
                                                    <div className="min-w-0">
                                                        <span className="font-normal text-xs text-black block truncate">
                                                            {getName(product)}
                                                        </span>
                                                        {product.packing_levels && (
                                                            <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                                                                • {product.packing_levels}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Category */}
                                                <td className="py-2 px-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                                        {getCategory(product)}
                                                    </span>
                                                </td>

                                                {/* Stock & Unit */}
                                                <td className="py-2 px-3 text-center">
                                                    <div className="inline-flex items-center justify-center gap-1.5">
                                                        <span className="font-normal text-xs text-black">
                                                            {qty} {getUnit(product)}
                                                        </span>
                                                        {isLowStock && (
                                                            <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                                                Low Stock
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Buy Price */}
                                                <td className="py-2 px-3 text-right font-normal text-xs text-black whitespace-nowrap">
                                                    ৳{getBuyPrice(product).toLocaleString('en-IN')}
                                                </td>

                                                {/* Sell Price */}
                                                <td className="py-2 px-3 text-right font-normal text-xs text-black whitespace-nowrap">
                                                    ৳{getSellPrice(product).toLocaleString('en-IN')}
                                                </td>

                                                {/* Status Badge */}
                                                <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        disabled={togglingId === prodId}
                                                        onClick={() => handleToggleProductStatus(product)}
                                                        title={`Click to mark as ${active ? "Inactive" : "Active"}`}
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer transition-colors ${
                                                            active
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                                        } ${togglingId === prodId ? "opacity-50 cursor-wait" : ""}`}
                                                    >
                                                        {active ? "Active" : "Inactive"}
                                                    </button>
                                                </td>

                                                {/* Actions: Eye, Edit, Delete */}
                                                <td className="py-2 px-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {/* Eye / View Icon */}
                                                        <button
                                                            type="button"
                                                            onClick={() => openQuickView(product)}
                                                            title="Quick View Details"
                                                            className="p-1 rounded-md hover:bg-sky-50 text-sky-600 transition-colors cursor-pointer"
                                                        >
                                                            <FiEye size={14} />
                                                        </button>

                                                        {/* Edit Icon */}
                                                        <Link
                                                            to={`/admin/edit-product/${product.id || product.pcode || ""}`}
                                                            state={{ editData: product }}
                                                            title="Edit Product"
                                                            className="p-1 rounded-md hover:bg-amber-50 text-amber-600 transition-colors cursor-pointer"
                                                        >
                                                            <FiEdit size={14} />
                                                        </Link>

                                                        {/* Delete Icon */}
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeleteModal(product)}
                                                            title="Delete Product"
                                                            className="p-1 rounded-md hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                                                        >
                                                            <FiTrash2 size={14} />
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
                    <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="text-xs text-black">
                            Showing{" "}
                            <span className="font-semibold text-black">
                                {products.length > 0 ? (currentPageNumber - 1) * dataLimit + 1 : 0}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold text-black">
                                {Math.min(currentPageNumber * dataLimit, totalCount)}
                            </span>{" "}
                            of <span className="font-semibold text-black">{totalCount}</span> products
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
                    onClose={closeQuickView}
                    title="Product Quick View"
                    maxWidth="w-full max-w-3xl"
                >
                    <div className="space-y-3 text-black">
                        {/* Header info - single line */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-200">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h3 className="text-base font-semibold text-black">
                                    {getName(selectedProduct)}
                                </h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-black border border-gray-300">
                                    {getCategory(selectedProduct)}
                                </span>
                                {getCode(selectedProduct) && (
                                    <span className="text-xs   text-black">
                                        (Code: {getCode(selectedProduct)})
                                    </span>
                                )}
                            </div>
                            <div>
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        isActive(selectedProduct)
                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                            : "bg-rose-50 text-rose-800 border border-rose-200"
                                    }`}
                                >
                                    ● {isActive(selectedProduct) ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>

                        {/* Stock & Pricing */}
                        <div>
                            <h4 className="text-xs font-semibold tracking-wider text-black mb-1.5">
                                Stock & Pricing
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Available Stock</span>
                                    <span className="text-sm font-semibold text-black">
                                        {getQuantity(selectedProduct)} {getUnit(selectedProduct)}
                                    </span>
                                </div>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Low Stock Alert</span>
                                    <span className="text-sm font-medium text-black">
                                        {getLowThreshold(selectedProduct)} {getUnit(selectedProduct)}
                                    </span>
                                </div>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Buy Price</span>
                                    <span className="text-sm font-semibold text-black">
                                        ৳{getBuyPrice(selectedProduct).toLocaleString()}
                                    </span>
                                </div>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Sell Price</span>
                                    <span className="text-sm font-semibold text-black">
                                        ৳{getSellPrice(selectedProduct).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Identification & Units */}
                        <div>
                            <h4 className="text-xs font-semibold tracking-wider text-black mb-1.5">
                                Identification & Unit Details
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">SKU</span>
                                    <span className="text-xs   font-medium text-black">
                                        {getSku(selectedProduct)}
                                    </span>
                                </div>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Barcode</span>
                                    <span className="text-xs   font-medium text-black">
                                        {getBarcode(selectedProduct) || "-"}
                                    </span>
                                </div>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Primary Unit</span>
                                    <span className="text-xs font-medium text-black">
                                        {getUnit(selectedProduct)}
                                    </span>
                                </div>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Secondary Unit</span>
                                    <span className="text-xs font-medium text-black">
                                        {(selectedProduct as any).secondary_unit || (selectedProduct as any).secondaryUnit || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Additional Configurations */}
                        <div>
                            <h4 className="text-xs font-semibold tracking-wider text-black mb-1.5">
                                Additional Details
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Decimal Quantity Sale</span>
                                    <span className="text-xs font-medium text-black">
                                        {(selectedProduct as any).is_decimal === "Yes" || (selectedProduct as any).is_decimal === true || (selectedProduct as any).isDecimal === "Yes" || (selectedProduct as any).isDecimal === true ? "Allowed (Fractional quantity supported)" : "Not Allowed (Whole numbers only)"}
                                    </span>
                                </div>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <span className="text-xs text-black block mb-0.5">Packing Levels</span>
                                    <span className="text-xs font-medium text-black">
                                        {selectedProduct.packing_levels || (selectedProduct as any).packingLevels || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Description (if any) */}
                        {selectedProduct.description && (
                            <div>
                                <h4 className="text-xs font-semibold tracking-wider text-black mb-1.5">
                                    Description / Note
                                </h4>
                                <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-medium text-black">
                                    {selectedProduct.description}
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="pt-2.5 border-t border-gray-200 flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={closeQuickView}
                                className="px-4 py-1.5 text-xs font-medium text-black bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                            <Link
                                to={`/admin/edit-product/${selectedProduct.id || selectedProduct.pcode || ""}`}
                                state={{ editData: selectedProduct }}
                                className="px-4 py-1.5 text-xs font-medium text-white bg-[var(--color-primary,#009FE3)] hover:opacity-90 rounded-lg transition-opacity inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                                <FiEdit className="w-3.5 h-3.5" />
                                Edit Product
                            </Link>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {productToDelete && isDeleteModalOpen && (
                <DeleteModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Product"
                    message={
                        getQuantity(productToDelete) > 0
                            ? `Are you sure you want to delete "${getName(productToDelete)}"? Currently it has ${getQuantity(productToDelete)} ${getUnit(productToDelete)} in stock. Deleting will inactivate and remove it from your inventory.`
                            : `Are you sure you want to delete "${getName(productToDelete)}"? This will inactivate and remove it from your inventory.`
                    }
                    onClose={closeDeleteModal}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};

export default ProductTable;
