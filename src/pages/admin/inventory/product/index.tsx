import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaMoneyBillWave } from "react-icons/fa";
import { IoCubeOutline } from "react-icons/io5";
import { FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { MotionDiv } from "@/utils/framer.motion";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import ProductTable from "./components/ProductTable";
import apiConfig from "@/config/api.json";
import { productListQueryKey, productCategoriesListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { getData, postData } from "@/services/api-service";
import type { ProductItem } from "@/types";

const Products = () => {
    const dataLimit = 10;
    const navigate = useNavigate();

    const [currentPageNumber, setCurrentPageNumber] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPageNumber(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const productListUrl = apiConfig.productList?.productListUrl || "get-product-list";
    const categoriesUrl = apiConfig.inventory?.productCategoriesListUrl || "product-categories-list";

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
    });

    // 2. Fetch Categories from GET /product-categories-list
    const { data: rawCategoryData, refetch: refetchCategories } = useQuery({
        queryKey: [productCategoriesListQueryKey],
        queryFn: async () => {
            try {
                return await getData<any>({ url: categoriesUrl });
            } catch {
                return null;
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    // Normalize product list from response
    const allProducts: ProductItem[] = useMemo(() => {
        if (!rawProductData) return [];
        if (Array.isArray((rawProductData as any).productsList)) {
            return (rawProductData as any).productsList;
        }
        if (Array.isArray((rawProductData as any).data)) {
            return (rawProductData as any).data;
        }
        if (Array.isArray(rawProductData)) {
            return rawProductData as ProductItem[];
        }
        return [];
    }, [rawProductData]);

    // Build Category dropdown options
    const categoryOptions = useMemo(() => {
        const optionMap = new Map<string, string>();

        // From categories API
        let list: any[] = [];
        if (Array.isArray(rawCategoryData)) {
            list = rawCategoryData;
        } else if (rawCategoryData && typeof rawCategoryData === "object") {
            if (Array.isArray(rawCategoryData.data)) list = rawCategoryData.data;
            else if (Array.isArray(rawCategoryData.categories)) list = rawCategoryData.categories;
            else if (Array.isArray(rawCategoryData.categoryList)) list = rawCategoryData.categoryList;
        }

        list.forEach((item: any) => {
            const name = typeof item === "string" ? item : (item.name || item.categoryName || item.title || "");
            if (name) optionMap.set(name.toLowerCase(), name);
        });

        // Also add any categories found in products
        allProducts.forEach((p) => {
            const cat = p.category || p.categoryName;
            if (cat) optionMap.set(cat.toLowerCase(), cat);
        });

        return Array.from(optionMap.values()).map((name) => ({
            label: name,
            value: name,
        }));
    }, [rawCategoryData, allProducts]);

    // Helper to evaluate product status
    const isProductActive = (p: ProductItem) => {
        if (p.status === "active" || p.status === true || p.status === "ACTIVE" || String(p.status) === "true") return true;
        if (p.status === "inactive" || p.status === false || p.status === "INACTIVE" || String(p.status) === "false") return false;
        return true;
    };

    const getProductQuantity = (p: ProductItem) =>
        Number(p.quantity ?? p.stock ?? p.stockQuantity ?? p.currentStock ?? p.current_stock ?? p.totalQuantity ?? p.qty ?? p.availableStock ?? 0);

    // Filter products based on search, category, and status
    const filteredProducts = useMemo(() => {
        return allProducts.filter((product) => {
            // Search filter
            if (debouncedSearch.trim()) {
                const search = debouncedSearch.toLowerCase().trim();
                const name = (product.name || product.productName || "").toLowerCase();
                const pcode = (product.pcode || product.productCode || product.code || "").toLowerCase();
                const sku = (product.sku || "").toLowerCase();
                const barcode = (product.barcode || "").toLowerCase();
                const category = (product.category || product.categoryName || "").toLowerCase();

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
                const cat = (product.category || product.categoryName || "").toLowerCase();
                if (cat !== categoryFilter.toLowerCase()) return false;
            }

            // Status filter
            if (statusFilter) {
                const active = isProductActive(product);
                const qty = getProductQuantity(product);
                const threshold = Number(product.low_stock_threshold ?? product.lowStockThreshold ?? 5);

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
        const lowStockCount = allProducts.filter((p) => {
            const qty = getProductQuantity(p);
            const threshold = Number(p.low_stock_threshold ?? p.lowStockThreshold ?? 5);
            return qty <= threshold;
        }).length;
        const totalStockValue = allProducts.reduce((sum, p) => {
            const qty = getProductQuantity(p);
            const buyPrice = Number(p.buy_price ?? p.buyPrice ?? 0);
            return sum + qty * buyPrice;
        }, 0);

        return {
            total,
            activeCount,
            lowStockCount,
            totalStockValue,
        };
    }, [allProducts]);

    // Pagination calculations
    const pageCount = Math.max(1, Math.ceil(filteredProducts.length / dataLimit));
    const paginatedProducts = useMemo(() => {
        const start = (currentPageNumber - 1) * dataLimit;
        return filteredProducts.slice(start, start + dataLimit);
    }, [filteredProducts, currentPageNumber, dataLimit]);

    const handlePagination = (paginationData: { selected: number }) => {
        setCurrentPageNumber(paginationData.selected + 1);
    };

    const handleRefresh = () => {
        setSearchQuery("");
        setDebouncedSearch("");
        setCategoryFilter("");
        setStatusFilter("");
        setCurrentPageNumber(1);
        refetchProducts();
        refetchCategories();
    };

    return (
        <div className="flex flex-col gap-3.5 p-4 sm:p-5 max-w-[1600px] mx-auto w-full">
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

            {/* Dashboard-Inspired KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {/* 1. Total Products - Sky Blue */}
                <MotionDiv delay={0.05}>
                    <div className="px-4 py-3 rounded-xl bg-[#009fe3] text-white shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[22px] font-bold tracking-tight">{metrics.total}</p>
                                <p className="text-[11px] font-medium text-white/90 uppercase tracking-wider">Total Products</p>
                            </div>
                            <div className="text-3xl text-white/90">
                                <IoCubeOutline />
                            </div>
                        </div>
                    </div>
                </MotionDiv>

                {/* 2. Active Products - Emerald Green */}
                <MotionDiv delay={0.1}>
                    <div className="px-4 py-3 rounded-xl bg-[#28c76f] text-white shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[22px] font-bold tracking-tight">{metrics.activeCount}</p>
                                <p className="text-[11px] font-medium text-white/90 uppercase tracking-wider">Active Products</p>
                            </div>
                            <div className="text-3xl text-white/90">
                                <FiCheckCircle />
                            </div>
                        </div>
                    </div>
                </MotionDiv>

                {/* 3. Low Stock Alert - Amber / Orange */}
                <MotionDiv delay={0.15}>
                    <div className="px-4 py-3 rounded-xl bg-[#FE9F43] text-white shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[22px] font-bold tracking-tight">{metrics.lowStockCount}</p>
                                <p className="text-[11px] font-medium text-white/90 uppercase tracking-wider">Low Stock Alert</p>
                            </div>
                            <div className="text-3xl text-white/90">
                                <FiAlertTriangle />
                            </div>
                        </div>
                    </div>
                </MotionDiv>

                {/* 4. Stock Valuation - Rich Indigo / Violet */}
                <MotionDiv delay={0.2}>
                    <div className="px-4 py-3 rounded-xl bg-[#7367f0] text-white shadow-xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[22px] font-bold tracking-tight">৳{metrics.totalStockValue.toLocaleString('en-IN')}</p>
                                <p className="text-[11px] font-medium text-white/90 uppercase tracking-wider">Stock Valuation</p>
                            </div>
                            <div className="text-3xl text-white/90">
                                <FaMoneyBillWave />
                            </div>
                        </div>
                    </div>
                </MotionDiv>
            </div>

            {/* Products Table Component */}
            <ProductTable
                products={paginatedProducts}
                totalCount={filteredProducts.length}
                isLoading={isLoading}
                isFetching={isFetching}
                pageCount={pageCount}
                currentPageNumber={currentPageNumber}
                setCurrentPageNumber={setCurrentPageNumber}
                handlePagination={handlePagination}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
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
