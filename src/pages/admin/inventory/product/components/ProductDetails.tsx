import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiPackage, FiCheckCircle, FiXCircle, FiAlertTriangle } from "react-icons/fi";
import PageHeader from "@/components/page-header/PageHeader";
import apiConfig from "@/config/api.json";
import { productListQueryKey } from "@/config/query-key";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import type { ProductItem } from "@/types";
import { getProductStockDisplay } from "@/utils/product-unit";

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const productListUrl = apiConfig.productList.productListUrl;

    const { data: rawProductData, isLoading } = useQuery({
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

    const product: ProductItem | null = useMemo(() => {
        if (!rawProductData || !id) return null;
        let list: ProductItem[] = [];
        if (Array.isArray((rawProductData as any).productsList)) {
            list = (rawProductData as any).productsList;
        } else if (Array.isArray((rawProductData as any).data)) {
            list = (rawProductData as any).data;
        } else if (Array.isArray(rawProductData)) {
            list = rawProductData as ProductItem[];
        }

        return (
            list.find(
                (p) =>
                    String(p.id) === String(id) ||
                    String(p.pcode) === String(id) ||
                    String(p.productCode) === String(id) ||
                    String(p.sku) === String(id)
            ) || null
        );
    }, [rawProductData, id]);

    if (isLoading) {
        return (
            <div className="p-6">
                <TableSkeleton />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="p-6 max-w-4xl mx-auto text-center space-y-4">
                <p className="text-lg font-semibold text-[var(--ui-text)]">Product Not Found</p>
                <p className="text-sm text-[var(--ui-text-muted)]">The product ID or code "{id}" does not exist in inventory.</p>
                <button
                    onClick={() => navigate("/admin/products")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary,#009FE3)] text-white rounded-lg text-sm font-medium hover:opacity-90"
                >
                    <FiArrowLeft /> Back to Product List
                </button>
            </div>
        );
    }

    const name = product.name || "Unnamed Product";
    const pcode = product.pcode || "-";
    const sku = product.sku || "-";
    const barcode = product.barcode || "-";
    const category = product.category || "General";
    const unit = product.unit || "PCS";
    const quantity = Number(product.quantity ?? 0);
    const buyPrice = Number(product.buyPrice ?? 0);
    const sellPrice = Number(product.sellPrice ?? 0);
    const lowThreshold = Number(product.lowStockThreshold ?? 5);
    const isLowStock = quantity <= lowThreshold;
    const stockInfo = getProductStockDisplay(product);
    const isActive =
        product.status === "active" ||
        product.status === true ||
        product.status === "ACTIVE" ||
        String(product.status) === "true";

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/admin/products")}
                        className="p-2 rounded-lg border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-sunken)] transition-colors"
                        title="Back"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <PageHeader
                        headerTitle={name}
                        headerDescription={`Product Code: ${pcode} • SKU: ${sku}`}
                    />
                </div>

                <Link
                    to="/admin/create-product"
                    className="px-4 py-2 bg-[var(--color-primary,#009FE3)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    Add Another Product
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Details Card */}
                <div className="md:col-span-2 bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-sm p-6 space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-[var(--ui-text)] mb-4 pb-2 border-b border-[var(--ui-border)]">
                            General Information
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[var(--ui-surface-muted)] p-3 rounded-lg">
                                <dt className="text-xs text-[var(--ui-text-muted)] font-medium">Product Name</dt>
                                <dd className="text-sm font-semibold text-[var(--ui-text)] mt-1">{name}</dd>
                            </div>

                            <div className="bg-[var(--ui-surface-muted)] p-3 rounded-lg">
                                <dt className="text-xs text-[var(--ui-text-muted)] font-medium">Category</dt>
                                <dd className="text-sm font-semibold text-[var(--ui-text)] mt-1">{category}</dd>
                            </div>

                            <div className="bg-[var(--ui-surface-muted)] p-3 rounded-lg">
                                <dt className="text-xs text-[var(--ui-text-muted)] font-medium">Product Code (PCode)</dt>
                                <dd className="text-sm  font-semibold text-[var(--ui-text)] mt-1">{pcode}</dd>
                            </div>

                            <div className="bg-[var(--ui-surface-muted)] p-3 rounded-lg">
                                <dt className="text-xs text-[var(--ui-text-muted)] font-medium">SKU</dt>
                                <dd className="text-sm  font-semibold text-[var(--ui-text)] mt-1">{sku}</dd>
                            </div>

                            <div className="bg-[var(--ui-surface-muted)] p-3 rounded-lg">
                                <dt className="text-xs text-[var(--ui-text-muted)] font-medium">Barcode</dt>
                                <dd className="text-sm   font-semibold text-[var(--ui-text)] mt-1">{barcode}</dd>
                            </div>

                            <div className="bg-[var(--ui-surface-muted)] p-3 rounded-lg">
                                <dt className="text-xs text-[var(--ui-text-muted)] font-medium">Packing Levels</dt>
                                <dd className="text-sm font-semibold text-[var(--ui-text)] mt-1">
                                    {product.packing_levels || product.packingLevels || "N/A"}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div>
                        <h3 className="text-base font-bold text-[var(--ui-text)] mb-4 pb-2 border-b border-[var(--ui-border)]">
                            Pricing & Secondary Units
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="bg-[var(--primary-color-light)]/50 p-3.5 rounded-lg border border-[var(--primary-color-muted)]">
                                <span className="text-xs text-[var(--ui-text-muted)] font-medium">Buy Price</span>
                                <p className="text-lg font-bold text-[var(--ui-text)] mt-1">৳{buyPrice.toLocaleString()}</p>
                            </div>

                            <div className="bg-[var(--ui-success-light)]/50 p-3.5 rounded-lg border border-[var(--ui-success-border)]">
                                <span className="text-xs text-[var(--ui-text-muted)] font-medium">Sell Price</span>
                                <p className="text-lg font-bold text-[var(--ui-success)] mt-1">৳{sellPrice.toLocaleString()}</p>
                            </div>

                            <div className="bg-[var(--ui-info-light)]/50 p-3.5 rounded-lg border border-[var(--ui-info-border)]">
                                <span className="text-xs text-[var(--ui-text-muted)] font-medium">Profit Margin</span>
                                <p className="text-lg font-bold text-[var(--ui-info)] mt-1">
                                    ৳{(sellPrice - buyPrice).toLocaleString()}{" "}
                                    <span className="text-xs font-normal">
                                        ({buyPrice > 0 ? (((sellPrice - buyPrice) / buyPrice) * 100).toFixed(1) : 0}%)
                                    </span>
                                </p>
                            </div>
                        </div>

                        {product.secondary_unit && (
                            <div className="mt-4 p-4 bg-[var(--ui-warning-light)] rounded-lg border border-[var(--ui-warning-border)] flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-medium text-[var(--ui-warning-dark)]">Secondary Unit</span>
                                    <p className="text-sm font-bold text-[var(--ui-warning-dark)] mt-0.5">{product.secondary_unit}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-medium text-[var(--ui-warning-dark)]">Secondary Unit Price</span>
                                    <p className="text-sm font-bold text-[var(--ui-warning-dark)] mt-0.5">
                                        ৳{Number(product.secondary_price || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stock & Status Side Panel */}
                <div className="space-y-6">
                    <div className="bg-[var(--ui-surface)] rounded-xl border border-[var(--ui-border)] shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-[var(--ui-text)]">Inventory Status</h3>
                            <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md ${
                                    isActive
                                        ? "bg-[var(--ui-success-border)] text-[var(--ui-success-dark)] border border-[var(--ui-success-border)]"
                                        : "bg-[var(--ui-danger-border)] text-[var(--ui-danger-dark)] border border-[var(--ui-danger-border)]"
                                }`}
                            >
                                {isActive ? (
                                    <>
                                        <FiCheckCircle className="w-3.5 h-3.5" />
                                        Active
                                    </>
                                ) : (
                                    <>
                                        <FiXCircle className="w-3.5 h-3.5" />
                                        Inactive
                                    </>
                                )}
                            </span>
                        </div>

                        <div className="p-4 bg-[var(--ui-surface-muted)] rounded-lg text-center">
                            <span className="text-xs text-[var(--ui-text-muted)] font-medium">Available Quantity</span>
                            <p className="text-3xl font-extrabold text-[var(--ui-text)] mt-1">
                                {stockInfo.displayStock}
                            </p>
                            {stockInfo.hasSecondaryUnit && (
                                <span className="text-xs text-[var(--ui-text-subtle)] block mt-1">
                                    ({stockInfo.primaryStockText})
                                </span>
                            )}
                            {isLowStock && (
                                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ui-warning-dark)] bg-[var(--ui-warning-border)] border border-[var(--ui-warning-border)] px-2.5 py-1 rounded-md mt-2">
                                    <FiAlertTriangle className="w-3.5 h-3.5" />
                                    Low Stock Alert (Threshold: {lowThreshold} {unit})
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-[var(--ui-border)] text-xs text-[var(--ui-text-muted)]">
                            <div className="flex justify-between">
                                <span className="text-[var(--ui-text-muted)]">Low Stock Threshold:</span>
                                <span className="font-semibold text-[var(--ui-text)]">{lowThreshold} {unit}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--ui-text-muted)]">Total Valuation:</span>
                                <span className="font-semibold text-[var(--ui-text)]">৳{(quantity * buyPrice).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--primary-color-light)]/60 rounded-xl border border-[var(--primary-color-muted)] p-5 flex items-start gap-3.5">
                        <div className="p-2.5 bg-[var(--primary-color-muted)] text-[var(--color-primary,#009FE3)] rounded-lg flex-shrink-0">
                            <FiPackage className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[var(--ui-text)]">Need to update stock?</h4>
                            <p className="text-xs text-[var(--ui-text-muted)] mt-1">
                                Purchases and Sales directly update inventory stock for this item in real-time.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;