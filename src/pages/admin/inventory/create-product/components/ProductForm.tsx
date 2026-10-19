import React, { ChangeEvent, useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    quantity: "",
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

    const queryClient = useQueryClient();
    const { postMutation, handleApiMutation } = useAPI();
    const insertProductUrl = apiConfig.inventory.insertProductUrl;
    const categoriesUrl = apiConfig.inventory.productCategoriesListUrl;
    const unitsUrl = apiConfig.inventory.productUnitsListUrl;
    const productListUrl = apiConfig.productList.productListUrl;

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
    const { data: productListData, isLoading: isProductListLoading, refetch: refetchProductList } = useQuery({
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
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (isEditMode) {
            refetchProductList();
        }
    }, [isEditMode, editId]);

    // Normalize product list
    const productList: ProductItem[] = useMemo(() => {
        if (!productListData) return [];
        let list: any[] = [];
        if (Array.isArray((productListData as any).productsList)) {
            list = (productListData as any).productsList;
        } else if (Array.isArray((productListData as any).data)) {
            list = (productListData as any).data;
        } else if (Array.isArray(productListData)) {
            list = productListData as ProductItem[];
        }
        return list.filter((p: any) => {
            const isDel = String(p.isDeleted || p.is_deleted || "").trim().toUpperCase();
            return isDel !== "Y" && isDel !== "YES" && isDel !== "TRUE" && isDel !== "1";
        });
    }, [productListData]);

    // Find product to edit if in edit mode
    const editingProduct: ProductItem | null = useMemo(() => {
        if (!isEditMode) return null;
        if (editId && productList.length > 0) {
            const found = productList.find(
                (p: any) =>
                    String(p.id) === String(editId) ||
                    String(p.pcode) === String(editId)
            );
            if (found) return found;
        }
        if (stateEditData) return stateEditData;
        return null;
    }, [isEditMode, editId, productList, stateEditData]);

    // Load product data into form fields when in edit mode
    useEffect(() => {
        if (isEditMode && editingProduct) {
            const name = editingProduct.name || "";
            const category = editingProduct.category || "";
            const unit = editingProduct.unit || "PCS";
            const secondary_unit = editingProduct.secondaryUnit || editingProduct.secondary_unit || "";
            const secondary_price = editingProduct.secondaryPrice !== undefined ? String(editingProduct.secondaryPrice) : (editingProduct.secondary_price !== undefined ? String(editingProduct.secondary_price) : "");
            const quantity = String(editingProduct.quantity ?? "0");
            const buy_price = editingProduct.buyPrice !== undefined ? String(editingProduct.buyPrice) : (editingProduct.buy_price !== undefined ? String(editingProduct.buy_price) : "");
            const sell_price = editingProduct.sellPrice !== undefined ? String(editingProduct.sellPrice) : (editingProduct.sell_price !== undefined ? String(editingProduct.sell_price) : "");
            const pcode = editingProduct.pcode || "";
            const sku = editingProduct.sku || "";
            const barcode = editingProduct.barcode || "";
            const low_stock_threshold = String(editingProduct.lowStockThreshold ?? editingProduct.low_stock_threshold ?? "5");
            const packing_levels = editingProduct.packingLevels || editingProduct.packing_levels || "";
            
            const isDec = (editingProduct as any).isDecimal === "Yes" || (editingProduct as any).isDecimal === true || (editingProduct as any).is_decimal === "Yes" || (editingProduct as any).is_decimal === true;
            setIsDecimalAllowed(isDec);

            const rawStatus = String(editingProduct.status ?? "").trim().toLowerCase();
            const status: "active" | "inactive" = (rawStatus === "inactive" || rawStatus === "false" || rawStatus === "0") ? "inactive" : "active";

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
        }
    }, [isEditMode, editingProduct]);

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

    // Active pricing unit: Secondary Unit if selected, otherwise Primary Unit
    const activePricingUnit = selectedSecondaryUnit?.label || selectedUnit?.label || "";

    // Numeric conversion ratio (1 Primary Unit = ? Secondary Units)
    const conversionMatch = (selectedUnit && selectedSecondaryUnit && fieldValues.packing_levels)
        ? fieldValues.packing_levels.match(/\d+(\.\d+)?/)
        : null;
    const conversionFactor = conversionMatch && parseFloat(conversionMatch[0]) > 0
        ? parseFloat(conversionMatch[0])
        : null;

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
                cleanQuantity = cleanQuantity.split('.')[0] || "";
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
                quantity: prev.quantity.includes('.') ? (prev.quantity.split('.')[0] || "") : prev.quantity
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
            const targetId = editingProduct?.id || (editingProduct as any)?.product_id || editId;
            const formattedPackingLevels = () => {
                const raw = fieldValues.packing_levels.trim();
                if (!raw) return null;
                if (/^\d+(\.\d+)?$/.test(raw) && fieldValues.secondary_unit && fieldValues.unit) {
                    return `${raw} ${fieldValues.secondary_unit}/${fieldValues.unit}`;
                }
                return raw;
            };

            const productPayload = withBranchScope({
                ...(isEditMode && targetId ? {
                    id: targetId,
                    product_id: targetId,
                    operation: "update",
                    updated_at: new Date().toISOString()
                } : {
                    operation: "insert",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }),
                name: fieldValues.name.trim(),
                category: fieldValues.category.trim() || "General",
                unit: fieldValues.unit.trim() || "PCS",
                secondary_unit: fieldValues.secondary_unit.trim() || null,
                secondary_price: fieldValues.secondary_unit.trim() ? (Number(fieldValues.sell_price) || Number(fieldValues.secondary_price) || 0) : 0,
                quantity: fieldValues.quantity ? Number(fieldValues.quantity) : 0,
                buy_price: Number(fieldValues.buy_price) || 0,
                sell_price: Number(fieldValues.sell_price) || 0,
                pcode: fieldValues.pcode.trim(),
                sku: fieldValues.sku.trim() || null,
                barcode: fieldValues.barcode.trim() || null,
                low_stock_threshold: fieldValues.low_stock_threshold ? Number(fieldValues.low_stock_threshold) : 0,
                packing_levels: formattedPackingLevels(),
                is_decimal: isDecimalAllowed ? "Yes" : "No",
                status: fieldValues.status === "active" ? "Active" : "Inactive",
            });

            const payload = {
                accessUser: buildAccessUser(),
                product: productPayload,
            };

            const result = await handleApiMutation({
                mutation: postMutation as any,
                url: insertProductUrl,
                body: payload as any,
                invalidateQueryKey: [productListQueryKey, productQueryKey, insertProductQueryKey],
                showSuccessMessage: true,
                showErrorMessage: true
            });

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
        <form onSubmit={handleSubmitForm} className="flex flex-col gap-2.5">
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-visible">
                <div
                    className="flex justify-between items-center px-3.5 sm:px-4 py-2 cursor-pointer select-none bg-gray-50/70 hover:bg-gray-100/70 rounded-t-xl transition-colors border-b border-gray-200"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <h2 className="text-xs sm:text-sm font-bold text-black flex items-center gap-1.5">
                        {isEditMode ? "Edit Product Information" : "Product Information"}
                    </h2>
                    <RiArrowDropDownLine
                        className={`text-xl sm:text-2xl text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>

                {isOpen && (
                    <div className="p-2.5 sm:p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                            {/* Row 1, Col 1: Product Name */}
                            <div>
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

                            {/* Row 1, Col 2: Category */}
                            <div className="relative z-30">
                                <SelectInput
                                    label={`Category${isCategoriesLoading ? " (Loading...)" : ""}`}
                                    value={selectedCategory}
                                    options={categoryOptions}
                                    onChange={handleCategorySelect}
                                    placeholder="Select Category"
                                />
                            </div>

                            {/* Row 1, Col 3: Unit (Primary) with Allow Decimal Toggle */}
                            <div className="relative z-20">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-black">
                                        Unit{isUnitsLoading ? " (Loading...)" : ""} <span className="text-red-600 ml-0.5">*</span>
                                    </label>
                                    <label 
                                        className="flex items-center gap-1 cursor-pointer select-none"
                                        title="Allow decimal numbers in quantity"
                                    >
                                        <span className="text-[10px] font-medium text-gray-400">Allow Decimal</span>
                                        <div className="relative inline-flex items-center flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={isDecimalAllowed}
                                                onChange={(e) => handleDecimalToggle(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-5 h-3 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--primary-color)]">
                                                <div
                                                    className={`absolute top-[1.5px] left-[1.5px] w-2 h-2 bg-white rounded-full transition-transform ${
                                                        isDecimalAllowed ? "translate-x-2" : ""
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

                            {/* Row 1, Col 4: Secondary Unit (Optional) */}
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

                            {/* Row 2, Col 1: Conversion Ratio (if Secondary Unit is chosen) OR Packing Levels (Optional) */}
                            {selectedUnit && selectedSecondaryUnit ? (
                                <div>
                                    <label htmlFor="packing_levels" className="text-xs font-semibold text-black block mb-1 truncate">
                                        Conversion Ratio (1 {selectedUnit.label} = ?)
                                    </label>
                                    <div className="flex items-center w-full transition-all duration-200 border border-gray-300 rounded-lg px-2 h-9 bg-white text-black text-xs focus-within:ring-1 focus-within:ring-[var(--primary-color)] focus-within:border-[var(--primary-color)]">
                                        <input
                                            id="packing_levels"
                                            name="packing_levels"
                                            type="text"
                                            value={fieldValues.packing_levels}
                                            onChange={handleChange}
                                            placeholder={`e.g. 10 (1 ${selectedUnit.label} = 10 ${selectedSecondaryUnit.label})`}
                                            className="w-full focus:outline-none placeholder:text-xs placeholder:text-gray-400 px-1 text-xs bg-transparent"
                                        />
                                        {fieldValues.packing_levels ? (
                                            <span className="shrink-0 text-[10px] font-semibold text-[var(--primary-color)] bg-[var(--primary-color-light)] border border-[var(--primary-color-muted)] px-1.5 py-0.5 rounded ml-1 whitespace-nowrap select-none">
                                                1 {selectedUnit.label} = {
                                                    fieldValues.packing_levels.toLowerCase().includes(selectedSecondaryUnit.label.toLowerCase())
                                                        ? fieldValues.packing_levels
                                                        : `${fieldValues.packing_levels} ${selectedSecondaryUnit.label}`
                                                }
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <InputField
                                        label="Packing Levels (Optional)"
                                        type="text"
                                        name="packing_levels"
                                        value={fieldValues.packing_levels}
                                        onChange={handleChange}
                                        placeholder="e.g. 10 pcs/box"
                                    />
                                </div>
                            )}

                            {/* Row 2, Col 2: Buy Price (based on Secondary Unit if selected, else Primary Unit) */}
                            <div>
                                <div className="flex items-center justify-between mb-1 gap-1">
                                    <label htmlFor="buy_price" className="text-xs font-semibold text-black truncate">
                                        Buy Price (৳) <span className="text-red-600">*</span>
                                    </label>
                                    {conversionFactor && fieldValues.buy_price && Number(fieldValues.buy_price) > 0 ? (
                                        <span className="text-[10px] font-bold text-[var(--primary-color)] bg-[var(--primary-color-light)] border border-[var(--primary-color-muted)] px-1.5 py-0.5 rounded leading-none whitespace-nowrap shrink-0">
                                            1 {selectedUnit?.label} = ৳{(Number(fieldValues.buy_price) * conversionFactor).toLocaleString()}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="flex items-center w-full transition-all duration-200 border border-gray-300 rounded-lg px-2.5 h-9 bg-white text-black text-xs focus-within:ring-1 focus-within:ring-[var(--primary-color)] focus-within:border-[var(--primary-color)]">
                                    <input
                                        id="buy_price"
                                        name="buy_price"
                                        type="number"
                                        required
                                        value={fieldValues.buy_price}
                                        onChange={handleChange}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="0.00"
                                        className="w-full focus:outline-none placeholder:text-xs placeholder:text-gray-400 px-1 text-xs bg-transparent"
                                    />
                                </div>
                            </div>

                            {/* Row 2, Col 3: Sell Price (based on Secondary Unit if selected, else Primary Unit) */}
                            <div>
                                <div className="flex items-center justify-between mb-1 gap-1">
                                    <label htmlFor="sell_price" className="text-xs font-semibold text-black truncate">
                                        Sell Price (৳) <span className="text-red-600">*</span>
                                    </label>
                                    {conversionFactor && fieldValues.sell_price && Number(fieldValues.sell_price) > 0 ? (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded leading-none whitespace-nowrap shrink-0">
                                            1 {selectedUnit?.label} = ৳{(Number(fieldValues.sell_price) * conversionFactor).toLocaleString()}
                                        </span>
                                    ) : null}
                                </div>
                                <div className="flex items-center w-full transition-all duration-200 border border-gray-300 rounded-lg px-2.5 h-9 bg-white text-black text-xs focus-within:ring-1 focus-within:ring-[var(--primary-color)] focus-within:border-[var(--primary-color)]">
                                    <input
                                        id="sell_price"
                                        name="sell_price"
                                        type="number"
                                        required
                                        value={fieldValues.sell_price}
                                        onChange={handleChange}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="0.00"
                                        className="w-full focus:outline-none placeholder:text-xs placeholder:text-gray-400 px-1 text-xs bg-transparent"
                                    />
                                </div>
                            </div>

                            {/* Row 2, Col 4: Quantity */}
                            <div>
                                <InputField
                                    label={activePricingUnit ? `Quantity (${activePricingUnit})` : "Quantity"}
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

                            {/* Row 3, Col 1: Low Stock Alert */}
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

                            {/* Row 3, Col 2: Product Code */}
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

                            {/* Row 3, Col 3: SKU */}
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

                            {/* Row 3, Col 4: Barcode */}
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
            <div className="bg-white shadow-xs rounded-xl border border-gray-200 p-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2.5">
                {/* Status Toggle on Left */}
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-black">
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
                        <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--primary-color)]">
                            <div
                                className={`absolute top-[2px] left-[2px] w-3 h-3 bg-white rounded-full transition-transform ${
                                    fieldValues.status === "active" ? "translate-x-4" : ""
                                }`}
                            />
                        </div>
                    </label>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        fieldValues.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                    }`}>
                        {fieldValues.status === "active" ? "Active" : "Inactive"}
                    </span>
                </div>

                {/* Cancel & Save/Update Buttons on Right */}
                <div className="flex items-center gap-2">
                    <Button
                        label="Cancel"
                        onClick={() => navigate("/admin/products")}
                        color="#6b7280"
                        hoverColor="#4b5563"
                        disabled={isLoading}
                        buttonClass="!text-xs !py-1.5"
                    />
                    <Button
                        label={isEditMode ? "Update Product" : "Save Product"}
                        onClick={handleSubmitForm}
                        color="var(--primary-color)"
                        hoverColor="var(--primary-color-hover)"
                        isLoading={isLoading}
                        disabled={isLoading}
                        buttonClass="!text-xs !py-1.5 font-bold"
                    />
                </div>
            </div>
        </form>
    );
};

export default CreateProductForm;