import React, { ChangeEvent, useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import Button from '@/components/button/Button';
import SelectInput from '@/components/form/SelectField';
import InputField from '@/components/form/TextInput';
import { RiArrowDropDownLine } from 'react-icons/ri';
import { showErrorToast } from '@/utils/toast-utils';
import { useAPI } from '@/hooks/useApi';
import apiConfig from '@/config/api.json';
import { 
    productListQueryKey, 
    productQueryKey, 
    insertProductQueryKey,
    productCategoriesListQueryKey,
    productUnitsListQueryKey
} from '@/config/query-key';
import { buildAccessUser, withBranchScope } from '@/utils/access-user';
import { getData, postData } from '@/services/api-service';
import type { ProductItem } from '@/types';

interface Option {
    label: string;
    value: string;
    decimalAllow?: boolean;
}

interface ProductFormState {
    name: string;
    category: string;
    unit: string;
    secondary_unit: string;
    secondary_price: string;
    quantity: string;
    buy_price: string;
    sell_price: string;
    pcode: string;
    sku: string;
    barcode: string;
    low_stock_threshold: string;
    packing_levels: string;
    status: "active" | "inactive";
}

const initialFieldValues: ProductFormState = {
    name: "",
    category: "",
    unit: "",
    secondary_unit: "",
    secondary_price: "",
    quantity: "0",
    buy_price: "",
    sell_price: "",
    pcode: "",
    sku: "",
    barcode: "",
    low_stock_threshold: "5",
    packing_levels: "",
    status: "active",
};

const CreateProductForm = () => {
    const { id: routeId } = useParams();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Determine edit mode & target product ID/code
    const editId = routeId || searchParams.get("id") || searchParams.get("edit");
    const stateEditData: ProductItem | undefined = (location.state as any)?.editData;
    const isEditMode = Boolean(editId || stateEditData);

    const [isOpen, setIsOpen] = useState(true);
    const [fieldValues, setFieldValues] = useState<ProductFormState>(initialFieldValues);
    const [selectedUnit, setSelectedUnit] = useState<Option | null>(null);
    const [selectedSecondaryUnit, setSelectedSecondaryUnit] = useState<Option | null>(null);
    const [isDecimalAllowed, setIsDecimalAllowed] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Option | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

    const { postMutation, patchMutation, handleApiMutation } = useAPI();
    const insertProductUrl = apiConfig.inventory?.insertProductUrl || "insert-product";
    const productBaseUrl = apiConfig.inventory?.productUrl || "product";
    const categoriesUrl = apiConfig.inventory?.productCategoriesListUrl || "product-categories-list";
    const unitsUrl = apiConfig.inventory?.productUnitsListUrl || "product-units-list";
    const productListUrl = apiConfig.productList?.productListUrl || "get-product-list";

    // 1. Fetch Categories via GET /product-categories-list
    const { data: rawCategoryData, isLoading: isCategoriesLoading } = useQuery({
        queryKey: [productCategoriesListQueryKey],
        queryFn: async () => {
            const res = await getData<any>({ url: categoriesUrl });
            return res;
        },
        staleTime: 5 * 60 * 1000,
    });

    // 2. Fetch Units via GET /product-units-list
    const { data: rawUnitData, isLoading: isUnitsLoading } = useQuery({
        queryKey: [productUnitsListQueryKey],
        queryFn: async () => {
            const res = await getData<any>({ url: unitsUrl });
            return res;
        },
        staleTime: 5 * 60 * 1000,
    });

    // 3. Fetch Product List to prefill edit form or auto-generate pcode/barcode for new product
    const { data: productListData, isLoading: isProductListLoading } = useQuery({
        queryKey: [productListQueryKey],
        queryFn: async () => {
            try {
                const res = await postData<any>({
                    url: productListUrl,
                    body: { accessUser: buildAccessUser() }
                });
                return res;
            } catch {
                return null;
            }
        },
        staleTime: 30 * 1000,
    });

    // Normalize product list
    const productList: ProductItem[] = useMemo(() => {
        if (!productListData) return [];
        if (Array.isArray((productListData as any).productsList)) {
            return (productListData as any).productsList;
        } else if (Array.isArray((productListData as any).data)) {
            return (productListData as any).data;
        } else if (Array.isArray(productListData)) {
            return productListData as ProductItem[];
        }
        return [];
    }, [productListData]);

    // Find product to edit if in edit mode
    const editingProduct: ProductItem | null = useMemo(() => {
        if (!isEditMode) return null;
        if (stateEditData) return stateEditData;
        if (editId && productList.length > 0) {
            return (
                productList.find(
                    (p) =>
                        String(p.id) === String(editId) ||
                        String(p.pcode) === String(editId) ||
                        String(p.productCode) === String(editId) ||
                        String(p.sku) === String(editId)
                ) || null
            );
        }
        return null;
    }, [isEditMode, stateEditData, editId, productList]);

    // Load product data into form fields when in edit mode
    useEffect(() => {
        if (isEditMode && editingProduct && !hasLoadedInitialData) {
            const name = editingProduct.name || editingProduct.productName || "";
            const category = editingProduct.category || editingProduct.categoryName || "";
            const unit = editingProduct.unit || "PCS";
            const secondary_unit = editingProduct.secondary_unit || editingProduct.secondaryUnit || "";
            const secondary_price = editingProduct.secondary_price !== undefined ? String(editingProduct.secondary_price) : "";
            const quantity = String(editingProduct.quantity ?? editingProduct.stock ?? "0");
            const buy_price = editingProduct.buy_price !== undefined ? String(editingProduct.buy_price) : (editingProduct.buyPrice !== undefined ? String(editingProduct.buyPrice) : "");
            const sell_price = editingProduct.sell_price !== undefined ? String(editingProduct.sell_price) : (editingProduct.sellPrice !== undefined ? String(editingProduct.sellPrice) : "");
            const pcode = editingProduct.pcode || editingProduct.productCode || editingProduct.code || "";
            const sku = editingProduct.sku || "";
            const barcode = editingProduct.barcode || "";
            const low_stock_threshold = String(editingProduct.low_stock_threshold ?? editingProduct.lowStockThreshold ?? "5");
            const packing_levels = editingProduct.packing_levels || editingProduct.packingLevels || "";
            const status = (editingProduct.status === "inactive" || editingProduct.status === false || editingProduct.status === "INACTIVE") ? "inactive" : "active";

            setFieldValues({
                name,
                category,
                unit,
                secondary_unit,
                secondary_price,
                quantity,
                buy_price,
                sell_price,
                pcode,
                sku,
                barcode,
                low_stock_threshold,
                packing_levels,
                status,
            });

            if (category) {
                setSelectedCategory({ label: category, value: category });
            }
            if (unit) {
                setSelectedUnit({ label: unit, value: unit });
            }
            if (secondary_unit) {
                setSelectedSecondaryUnit({ label: secondary_unit, value: secondary_unit });
            }

            setHasLoadedInitialData(true);
        }
    }, [isEditMode, editingProduct, hasLoadedInitialData]);

    // Auto-generate next pcode, barcode, sku ONLY in Create mode
    useEffect(() => {
        if (!isEditMode && productListData) {
            let maxNum = 0;
            productList.forEach((item: any) => {
                const codeStr = item.pcode || item.productCode || item.code || "";
                const match = String(codeStr).match(/\d+/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxNum) maxNum = num;
                }
                if (item.id && typeof item.id === 'number' && item.id > maxNum) {
                    maxNum = item.id;
                }
            });

            const nextNum = maxNum > 0 ? maxNum + 1 : (productList.length + 1);
            const generatedPcode = `P-${String(nextNum).padStart(4, "0")}`;
            const generatedBarcode = `894${String(nextNum).padStart(9, "0")}`;
            const generatedSku = `SKU-${String(nextNum).padStart(4, "0")}`;

            setFieldValues((prev) => ({
                ...prev,
                pcode: prev.pcode || generatedPcode,
                barcode: prev.barcode || generatedBarcode,
                sku: prev.sku || generatedSku,
            }));
        } else if (!isEditMode) {
            setFieldValues((prev) => ({
                ...prev,
                pcode: prev.pcode || "P-0001",
                barcode: prev.barcode || "894000000001",
                sku: prev.sku || "SKU-0001",
            }));
        }
    }, [isEditMode, productListData, productList]);

    // Parse category options directly from server response
    const categoryOptions: Option[] = useMemo(() => {
        let list: any[] = [];
        if (Array.isArray(rawCategoryData)) {
            list = rawCategoryData;
        } else if (rawCategoryData && typeof rawCategoryData === 'object') {
            if (Array.isArray(rawCategoryData.data)) list = rawCategoryData.data;
            else if (Array.isArray(rawCategoryData.categories)) list = rawCategoryData.categories;
            else if (Array.isArray(rawCategoryData.categoryList)) list = rawCategoryData.categoryList;
        }

        if (list.length > 0) {
            return list.map((item: any) => {
                if (typeof item === 'string') return { label: item, value: item };
                const name = item.name || item.categoryName || item.category_name || item.title || "";
                return { label: name, value: name };
            }).filter(opt => Boolean(opt.value));
        }

        return [];
    }, [rawCategoryData]);

    // Parse unit options directly from server response
    const unitOptions: Option[] = useMemo(() => {
        let list: any[] = [];
        if (Array.isArray(rawUnitData)) {
            list = rawUnitData;
        } else if (rawUnitData && typeof rawUnitData === 'object') {
            if (Array.isArray(rawUnitData.data)) list = rawUnitData.data;
            else if (Array.isArray(rawUnitData.units)) list = rawUnitData.units;
            else if (Array.isArray(rawUnitData.unitList)) list = rawUnitData.unitList;
        }

        if (list.length > 0) {
            return list.map((item: any) => {
                if (typeof item === 'string') return { label: item, value: item, decimalAllow: false };
                const name = item.name || item.unitName || item.unit_name || item.title || "";
                const decimalAllow = item.decimalAllow !== undefined
                    ? Boolean(item.decimalAllow)
                    : (item.decimal_allow !== undefined ? Boolean(item.decimal_allow) : false);
                return { label: name, value: name, decimalAllow };
            }).filter(opt => Boolean(opt.value));
        }

        return [];
    }, [rawUnitData]);

    // Filter secondary unit options: exclude the currently selected primary unit
    const secondaryUnitOptions: Option[] = useMemo(() => {
        if (!selectedUnit?.value) return [];
        return unitOptions.filter(
            (opt) => opt.value.toLowerCase() !== selectedUnit.value.toLowerCase()
        );
    }, [unitOptions, selectedUnit]);

    // Sync selected category when options are loaded
    useEffect(() => {
        if (categoryOptions.length > 0) {
            if (!fieldValues.category && !isEditMode) {
                const initialCat = categoryOptions[0];
                setSelectedCategory(initialCat);
                setFieldValues((prev) => ({ ...prev, category: initialCat.value }));
            } else if (fieldValues.category) {
                const match = categoryOptions.find(
                    (opt) => opt.value.toLowerCase() === fieldValues.category.toLowerCase()
                );
                if (match) setSelectedCategory(match);
            }
        }
    }, [categoryOptions, fieldValues.category, isEditMode]);

    // Sync selected unit when options are loaded
    useEffect(() => {
        if (unitOptions.length > 0) {
            if (!fieldValues.unit && !isEditMode) {
                const initialUnit = unitOptions[0];
                setSelectedUnit(initialUnit);
                setIsDecimalAllowed(Boolean(initialUnit.decimalAllow));
                setFieldValues((prev) => ({ ...prev, unit: initialUnit.value }));
            } else if (fieldValues.unit) {
                const match = unitOptions.find(
                    (opt) => opt.value.toLowerCase() === fieldValues.unit.toLowerCase()
                );
                if (match) {
                    setSelectedUnit(match);
                    setIsDecimalAllowed(Boolean(match.decimalAllow));
                }
            }
        }
    }, [unitOptions, fieldValues.unit, isEditMode]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        if (name === "quantity") {
            if (!isDecimalAllowed) {
                // Disallow decimals: strip non-digits
                const sanitized = value.replace(/[^0-9]/g, '');
                setFieldValues((prev) => ({
                    ...prev,
                    quantity: sanitized
                }));
                return;
            }
        }

        setFieldValues((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCategorySelect = (option: Option) => {
        setSelectedCategory(option);
        setFieldValues((prev) => ({
            ...prev,
            category: option.value
        }));
    };

    const handleUnitSelect = (option: Option) => {
        setSelectedUnit(option);
        const allowDec = Boolean(option.decimalAllow);
        setIsDecimalAllowed(allowDec);

        setFieldValues((prev) => {
            const isSameAsSecondary = prev.secondary_unit.toLowerCase() === option.value.toLowerCase();
            if (isSameAsSecondary) {
                setSelectedSecondaryUnit(null);
            }

            let cleanQuantity = prev.quantity;
            if (!allowDec && cleanQuantity.includes('.')) {
                cleanQuantity = cleanQuantity.split('.')[0] || "0";
            }

            return {
                ...prev,
                unit: option.value,
                quantity: cleanQuantity,
                secondary_unit: isSameAsSecondary ? "" : prev.secondary_unit,
                secondary_price: isSameAsSecondary ? "" : prev.secondary_price,
            };
        });
    };

    const handleDecimalToggle = (checked: boolean) => {
        setIsDecimalAllowed(checked);
        if (!checked) {
            setFieldValues((prev) => ({
                ...prev,
                quantity: prev.quantity.includes('.') ? (prev.quantity.split('.')[0] || "0") : prev.quantity
            }));
        }
    };

    const handleSecondaryUnitSelect = (option: Option) => {
        setSelectedSecondaryUnit(option);
        setFieldValues((prev) => ({
            ...prev,
            secondary_unit: option.value
        }));
    };

    const handleStatusToggle = (checked: boolean) => {
        setFieldValues((prev) => ({
            ...prev,
            status: checked ? "active" : "inactive"
        }));
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fieldValues.name.trim()) {
            showErrorToast("Product Name is required!");
            return;
        }
        if (fieldValues.buy_price === "" || isNaN(Number(fieldValues.buy_price))) {
            showErrorToast("Valid Buy Price is required!");
            return;
        }
        if (fieldValues.sell_price === "" || isNaN(Number(fieldValues.sell_price))) {
            showErrorToast("Valid Sell Price is required!");
            return;
        }

        setIsLoading(true);
        try {
            const targetId = editingProduct?.id || editId || fieldValues.pcode;
            const productPayload = withBranchScope({
                ...(isEditMode && targetId ? { id: targetId } : {}),
                name: fieldValues.name.trim(),
                category: fieldValues.category.trim(),
                unit: fieldValues.unit.trim() || "PCS",
                secondary_unit: fieldValues.secondary_unit.trim(),
                secondary_price: fieldValues.secondary_price ? Number(fieldValues.secondary_price) : 0,
                quantity: fieldValues.quantity ? Number(fieldValues.quantity) : 0,
                buy_price: Number(fieldValues.buy_price) || 0,
                sell_price: Number(fieldValues.sell_price) || 0,
                pcode: fieldValues.pcode.trim(),
                sku: fieldValues.sku.trim(),
                barcode: fieldValues.barcode.trim(),
                low_stock_threshold: fieldValues.low_stock_threshold ? Number(fieldValues.low_stock_threshold) : 0,
                packing_levels: fieldValues.packing_levels.trim(),
                status: fieldValues.status,
            });

            const payload = {
                accessUser: buildAccessUser(),
                product: productPayload,
            };

            let result: any;

            if (isEditMode) {
                // Try PATCH first if configured, with automatic fallback to POST /insert-product
                try {
                    result = await handleApiMutation({
                        mutation: patchMutation as any,
                        url: `${productBaseUrl}/${targetId}`,
                        body: payload as any,
                        invalidateQueryKey: [productListQueryKey, productQueryKey, insertProductQueryKey],
                        showSuccessMessage: true,
                        showErrorMessage: false,
                    });
                } catch {
                    result = null;
                }

                // If PATCH is not supported by the backend (404/405/Error), use POST /insert-product (v4 upsert standard)
                if (!result?.success) {
                    result = await handleApiMutation({
                        mutation: postMutation as any,
                        url: insertProductUrl,
                        body: payload as any,
                        invalidateQueryKey: [productListQueryKey, productQueryKey, insertProductQueryKey],
                        showSuccessMessage: true,
                        showErrorMessage: true
                    });
                }
            } else {
                // POST Mutation for creating product
                result = await handleApiMutation({
                    mutation: postMutation as any,
                    url: insertProductUrl,
                    body: payload as any,
                    invalidateQueryKey: [productListQueryKey, productQueryKey, insertProductQueryKey],
                    showSuccessMessage: true,
                    showErrorMessage: true
                });
            }

            if (result?.success) {
                navigate("/admin/products");
            }
        } catch (error: any) {
            console.error("Product submit error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmitForm} className="space-y-5">
            <div className="mx-auto bg-white shadow-sm rounded-lg border border-gray-100">
                <div
                    className="flex justify-between items-center px-4 sm:px-6 py-2.5 cursor-pointer select-none transition-all duration-300 ease-in-out hover:bg-gray-50 rounded-t-lg"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <h2 className="text-base font-bold text-[#212b36]">
                        {isEditMode ? "Edit Product Information" : "Product Information"}
                    </h2>
                    <RiArrowDropDownLine
                        className={`text-2xl sm:text-3xl transition-all duration-300 ease-in-out text-gray-500 ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>

                <hr className="border-gray-200" />

                {isOpen && (
                    <div className="p-3.5 sm:p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2.5">
                            {/* Product Name */}
                            <div className="md:col-span-2 lg:col-span-2">
                                <InputField
                                    label="Product Name"
                                    type="text"
                                    name="name"
                                    required
                                    value={fieldValues.name}
                                    onChange={handleChange}
                                    placeholder="e.g. Wireless Mouse"
                                />
                            </div>

                            {/* Category */}
                            <div className="relative z-30">
                                <SelectInput
                                    label={`Category${isCategoriesLoading ? " (Loading...)" : ""}`}
                                    value={selectedCategory}
                                    options={categoryOptions}
                                    onChange={handleCategorySelect}
                                    placeholder="Select Category"
                                />
                            </div>

                            {/* Unit (Primary) with Allow Decimal Toggle */}
                            <div className="relative z-20">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-sm font-medium text-[#212b36]">
                                        Unit{isUnitsLoading ? " (Loading...)" : ""} <span className="text-red-600 ml-0.5">*</span>
                                    </label>
                                    <label 
                                        className="flex items-center gap-1 cursor-pointer select-none"
                                        title="Allow decimal numbers in quantity"
                                    >
                                        <span className="text-[11px] font-medium text-gray-400">Allow Decimal</span>
                                        <div className="relative inline-flex items-center flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={isDecimalAllowed}
                                                onChange={(e) => handleDecimalToggle(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-6 h-3.5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--color-primary,#009FE3)]">
                                                <div
                                                    className={`absolute top-[2px] left-[2px] w-2.5 h-2.5 bg-white rounded-full transition-transform ${
                                                        isDecimalAllowed ? "translate-x-2.5" : ""
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    </label>
                                </div>
                                <SelectInput
                                    label=""
                                    value={selectedUnit}
                                    options={unitOptions}
                                    onChange={handleUnitSelect}
                                    placeholder="Select Unit"
                                />
                            </div>

                            {/* Secondary Unit (Optional) */}
                            <div className="relative z-20">
                                <SelectInput
                                    label="Secondary Unit (Optional)"
                                    value={selectedSecondaryUnit}
                                    options={secondaryUnitOptions}
                                    onChange={handleSecondaryUnitSelect}
                                    placeholder={selectedUnit ? "Select Secondary Unit (Optional)" : "Select Unit First"}
                                    disabled={!selectedUnit || secondaryUnitOptions.length === 0}
                                />
                            </div>

                            {/* Secondary Unit Price (Optional) */}
                            <div>
                                <InputField
                                    label="Secondary Unit Price (৳)"
                                    type="number"
                                    name="secondary_price"
                                    value={fieldValues.secondary_price}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    disabled={!selectedUnit || !fieldValues.secondary_unit}
                                />
                            </div>

                            {/* Buy Price */}
                            <div>
                                <InputField
                                    label="Buy Price (৳)"
                                    type="number"
                                    name="buy_price"
                                    required
                                    value={fieldValues.buy_price}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Sell Price */}
                            <div>
                                <InputField
                                    label="Sell Price (৳)"
                                    type="number"
                                    name="sell_price"
                                    required
                                    value={fieldValues.sell_price}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <InputField
                                    label="Quantity"
                                    type={isDecimalAllowed ? "number" : "text"}
                                    name="quantity"
                                    value={fieldValues.quantity}
                                    onChange={handleChange}
                                    placeholder="0"
                                    step={isDecimalAllowed ? "0.01" : "1"}
                                    onKeyDown={(e) => {
                                        if (!isDecimalAllowed && (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E')) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>

                            {/* Low Stock Alert */}
                            <div>
                                <InputField
                                    label="Low Stock Alert"
                                    type="number"
                                    name="low_stock_threshold"
                                    value={fieldValues.low_stock_threshold}
                                    onChange={handleChange}
                                    placeholder="5"
                                />
                            </div>

                            {/* Packing Levels */}
                            <div>
                                <InputField
                                    label="Packing Levels"
                                    type="text"
                                    name="packing_levels"
                                    value={fieldValues.packing_levels}
                                    onChange={handleChange}
                                    placeholder="e.g. 10 pcs/box"
                                />
                            </div>

                            {/* Product Code */}
                            <div>
                                <InputField
                                    label="Product Code"
                                    type="text"
                                    name="pcode"
                                    value={fieldValues.pcode}
                                    onChange={handleChange}
                                    placeholder="e.g. P-1001"
                                />
                            </div>

                            {/* SKU */}
                            <div>
                                <InputField
                                    label="SKU"
                                    type="text"
                                    name="sku"
                                    value={fieldValues.sku}
                                    onChange={handleChange}
                                    placeholder="e.g. SKU-1001"
                                />
                            </div>

                            {/* Barcode */}
                            <div>
                                <InputField
                                    label="Barcode"
                                    type="text"
                                    name="barcode"
                                    value={fieldValues.barcode}
                                    onChange={handleChange}
                                    placeholder="e.g. 894000001001"
                                />
                            </div>

                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Action Bar with Status and Action Buttons */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-4">
                {/* Status Toggle on Left */}
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[#212b36]">
                        Status
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                            type="checkbox"
                            name="status"
                            checked={fieldValues.status === "active"}
                            onChange={(e) => handleStatusToggle(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--color-primary,#009FE3)]">
                            <div
                                className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform ${
                                    fieldValues.status === "active" ? "translate-x-4" : ""
                                }`}
                            />
                        </div>
                    </label>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        fieldValues.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                    }`}>
                        {fieldValues.status === "active" ? "Active" : "Inactive"}
                    </span>
                </div>

                {/* Cancel & Save/Update Buttons on Right */}
                <div className="flex items-center gap-3">
                    <Button
                        label="Cancel"
                        onClick={() => navigate("/admin/products")}
                        color="#6b7280"
                        hoverColor="#4b5563"
                        disabled={isLoading}
                    />
                    <Button
                        label={isEditMode ? "Update Product" : "Save Product"}
                        onClick={handleSubmitForm}
                        color="#009FE3"
                        hoverColor="#0085be"
                        isLoading={isLoading}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </form>
    );
};

export default CreateProductForm;