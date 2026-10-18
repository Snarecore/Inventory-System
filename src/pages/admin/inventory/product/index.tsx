import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaMoneyBillWave } from "react-icons/fa";
import { IoCubeOutline } from "react-icons/io5";
import { FiCheckCircle, FiAlertTriangle, FiXCircle } from "react-icons/fi";
import { MotionDiv } from "@/utils/framer.motion";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import ProductTable from "./components/ProductTable";
import apiConfig from "@/config/api.json";
import { productListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import type { ProductItem } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

const Products = () => {
    const [dataLimit, setDataLimit] = useState(10);
    const navigate = useNavigate();

    const [currentPageNumber, setCurrentPageNumber] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 250);
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        setCurrentPageNumber(1);
    };

    const productListUrl = apiConfig.productList.productListUrl;

    // 1. Fetch Product List from POST /get-product-list
    const {
        data: rawProductData,
        isLoading,
        isFetching,
        refetch: refetchProducts,
    } = useQuery({
        queryKey: [productListQueryKey],
        queryFn: async () => {
            const response = await postData<any>({
                url: productListUrl,
                body: { accessUser: buildAccessUser() },
            });
            return response;
        },
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
    });

    // Normalize product list from response
    const allProducts: ProductItem[] = useMemo(() => {
        if (!rawProductData) return [];
        let list: any[] = [];
        if (Array.isArray((rawProductData as any).productsList)) {
            list = (rawProductData as any).productsList;
        } else if (Array.isArray((rawProductData as any).data)) {
            list = (rawProductData as any).data;
        } else if (Array.isArray(rawProductData)) {
            list = rawProductData as ProductItem[];
        }
        return list.filter((p: any) => {
            const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
            return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
        });
    }, [rawProductData]);

    // Build Category dropdown options directly from existing products (zero extra network calls)
    const categoryOptions = useMemo(() => {
        const optionMap = new Map<string, string>();

        allProducts.forEach((p) => {
            const cat = p.category || p.categoryName;
            if (cat && typeof cat === "string" && cat.trim()) {
                const trimmed = cat.trim();
                optionMap.set(trimmed.toLowerCase(), trimmed);
            }
        });

        return Array.from(optionMap.values()).map((name) => ({
            label: name,
            value: name,
        }));
    }, [allProducts]);

    // Helper to evaluate product status
    const isProductActive = (p: ProductItem) => {
        const raw = String(p?.status ?? "").trim().toLowerCase();
        if (raw === "inactive" || raw === "false" || raw === "0") {
            return false;
        }
        return true;
    };

    const getProductQuantity = (p: ProductItem) =>
        Number(p.quantity ?? 0);

    // Filter products based on search, category, and status
    const filteredProducts = useMemo(() => {
        return allProducts.filter((product) => {
            // Search filter
            if (debouncedSearch.trim()) {
                const search = debouncedSearch.toLowerCase().trim();
                const name = (product.name || "").toLowerCase();
                const pcode = (product.pcode || "").toLowerCase();
                const sku = (product.sku || "").toLowerCase();
                const barcode = (product.barcode || "").toLowerCase();
                const category = (product.category || "").toLowerCase();

                const matchesSearch =
                    name.includes(search) ||
                    pcode.includes(search) ||
                    sku.includes(search) ||
                    barcode.includes(search) ||
                    category.includes(search);

                if (!matchesSearch) return false;
            }

            // Category filter
            if (categoryFilter) {
                const cat = (product.category || "").toLowerCase();
                if (cat !== categoryFilter.toLowerCase()) return false;
            }

            // Status filter
            if (statusFilter) {
                const active = isProductActive(product);
                const qty = getProductQuantity(product);
                const threshold = Number(product.lowStockThreshold ?? 5);

                if (statusFilter === "active" && !active) return false;
                if (statusFilter === "inactive" && active) return false;
                if (statusFilter === "low_stock" && qty > threshold) return false;
            }

            return true;
        });
    }, [allProducts, debouncedSearch, categoryFilter, statusFilter]);

    // Metrics
    const metrics = useMemo(() => {
        const total = allProducts.length;
        const activeCount = allProducts.filter(isProductActive).length;
        const inactiveCount = allProducts.filter((p) => !isProductActive(p)).length;
        const lowStockCount = allProducts.filter((p) => {
            const qty = getProductQuantity(p);
            const threshold = Number(p.lowStockThreshold ?? 5);
            return qty <= threshold;
        }).length;
        const totalStockValue = allProducts.reduce((sum, p) => {
            const qty = getProductQuantity(p);
            const buyPrice = Number(p.buyPrice ?? 0);
            return sum + qty * buyPrice;
        }, 0);

        return {
            total,
            activeCount,
            inactiveCount,
            lowStockCount,
            totalStockValue,
        };
    }, [allProducts]);

    // Sorted products (latest added product first)
    const sortedProducts = useMemo(() => {
        const reversed = [...filteredProducts].reverse();
        return reversed.sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            if (!isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0 && timeA !== timeB) {
                return timeB - timeA;
            }

            const rawIdA = a.id ?? a.pcode;
            const rawIdB = b.id ?? b.pcode;
            const numA = Number(String(rawIdA || '').replace(/\D/g, ''));
            const numB = Number(String(rawIdB || '').replace(/\D/g, ''));
            if (numA && numB && numA !== numB) {
                return numB - numA;
            }

            return 0;
        });
    }, [filteredProducts]);

    // Pagination calculations
    const pageCount = Math.max(1, Math.ceil(sortedProducts.length / dataLimit));
    const start = (currentPageNumber - 1) * dataLimit;
    const paginatedProducts = sortedProducts.slice(start, start + dataLimit);

    const handlePagination = (paginationData: { selected: number }) => {
        setCurrentPageNumber(paginationData.selected + 1);
    };

    const handleRefresh = () => {
        setSearchQuery("");
        setCategoryFilter("");
        setStatusFilter("");
        setCurrentPageNumber(1);
        refetchProducts();
    };

    return (
        <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
            {/* Header with Title & Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <PageHeader
                    headerTitle="Product List"
                    headerDescription="View, search and manage all inventory products"
                />
                <div className="flex items-center gap-2">
                    <RefreshButton onClick={handleRefresh} />
                    <Button
                        label="Add Product"
                        onClick={() => navigate("/admin/create-product")}
                        color="#009FE3"
                        hoverColor="#0085be"
                        icon={<FaPlus className="text-white text-xs" />}
                    />
                </div>
            </div>

            {/* KPI Summary Cards (5 Cards matching Sales & Purchases styling) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 w-full">
                {/* 1. Total Products - Blue */}
                <MotionDiv delay={0.05}>
                    <div className="p-3 rounded-xl border bg-blue-50/60 border-blue-300 hover:border-blue-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                                Total Products
                            </span>
                            <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-blue-600">
                                {metrics.total}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg shrink-0 bg-blue-100 text-blue-600">
                            <IoCubeOutline size={18} />
                        </div>
                    </div>
                </MotionDiv>

                {/* 2. Active Products - Emerald */}
                <MotionDiv delay={0.1}>
                    <div className="p-3 rounded-xl border bg-emerald-50/60 border-emerald-300 hover:border-emerald-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                                Active Products
                            </span>
                            <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-emerald-600">
                                {metrics.activeCount}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg shrink-0 bg-emerald-100 text-emerald-600">
                            <FiCheckCircle size={18} />
                        </div>
                    </div>
                </MotionDiv>

                {/* 3. Inactive Products - Rose */}
                <MotionDiv delay={0.15}>
                    <div className="p-3 rounded-xl border bg-rose-50/60 border-rose-300 hover:border-rose-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                                Inactive Products
                            </span>
                            <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-rose-600">
                                {metrics.inactiveCount}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg shrink-0 bg-rose-100 text-rose-600">
                            <FiXCircle size={18} />
                        </div>
                    </div>
                </MotionDiv>

                {/* 4. Low Stock Alert - Amber */}
                <MotionDiv delay={0.2}>
                    <div className="p-3 rounded-xl border bg-amber-50/60 border-amber-300 hover:border-amber-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                                Low Stock Alert
                            </span>
                            <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-amber-600">
                                {metrics.lowStockCount}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg shrink-0 bg-amber-100 text-amber-600">
                            <FiAlertTriangle size={18} />
                        </div>
                    </div>
                </MotionDiv>

                {/* 5. Stock Valuation - Purple */}
                <MotionDiv delay={0.25}>
                    <div className="p-3 rounded-xl border bg-purple-50/60 border-purple-300 hover:border-purple-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                                Stock Valuation
                            </span>
                            <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-purple-600">
                                ৳ {metrics.totalStockValue.toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div className="p-2 rounded-lg shrink-0 bg-purple-100 text-purple-600">
                            <FaMoneyBillWave size={18} />
                        </div>
                    </div>
                </MotionDiv>
            </div>

            {/* Products Table Component */}
            <ProductTable
                products={paginatedProducts}
                totalCount={sortedProducts.length}
                isLoading={isLoading}
                isFetching={isFetching}
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                setCurrentPageNumber={setCurrentPageNumber}
                dataLimit={dataLimit}
                setDataLimit={setDataLimit}
                handlePagination={handlePagination}
                searchQuery={searchQuery}
                setSearchQuery={handleSearchChange}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                categoryOptions={categoryOptions}
                onRefresh={handleRefresh}
            />
        </div>
    );
};

export default Products;
