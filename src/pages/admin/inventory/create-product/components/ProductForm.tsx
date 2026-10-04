import React, { ChangeEvent, useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/button/Button';
import SelectInput from '@/components/form/SelectField';
import InputField from '@/components/form/TextInput';
import { RiArrowDropDownLine } from 'react-icons/ri';
import { useNavigate } from "react-router-dom";
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

interface Option {
    label: string;
    value: string;
}

interface ProductFormState {
    name: string;
    category: string;
    unit: string;
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
    const [isOpen, setIsOpen] = useState(true);
    const [fieldValues, setFieldValues] = useState<ProductFormState>(initialFieldValues);
    const [selectedUnit, setSelectedUnit] = useState<Option | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Option | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { postMutation, handleApiMutation } = useAPI();
    const navigate = useNavigate();
    const insertProductUrl = apiConfig.inventory?.insertProductUrl || "insert-product";
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

    // 3. Fetch Product List to get the last sequence number and auto-generate pcode, barcode, sku
    const { data: productListData } = useQuery({
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

    // Auto-generate next pcode, barcode, sku based on existing products in the system
    useEffect(() => {
        if (productListData) {
            let list: any[] = [];
            if (Array.isArray((productListData as any).productsList)) {
                list = (productListData as any).productsList;
            } else if (Array.isArray((productListData as any).data)) {
                list = (productListData as any).data;
            } else if (Array.isArray(productListData)) {
                list = productListData as any[];
            }

            let maxNum = 0;
            list.forEach((item: any) => {
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

            const nextNum = maxNum > 0 ? maxNum + 1 : (list.length + 1);
            const generatedPcode = `P-${String(nextNum).padStart(4, "0")}`;
            const generatedBarcode = `894${String(nextNum).padStart(9, "0")}`;
            const generatedSku = `SKU-${String(nextNum).padStart(4, "0")}`;

            setFieldValues((prev) => ({
                ...prev,
                pcode: prev.pcode || generatedPcode,
                barcode: prev.barcode || generatedBarcode,
                sku: prev.sku || generatedSku,
            }));
        } else {
            setFieldValues((prev) => ({
                ...prev,
                pcode: prev.pcode || "P-0001",
                barcode: prev.barcode || "894000000001",
                sku: prev.sku || "SKU-0001",
            }));
        }
    }, [productListData]);

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
                if (typeof item === 'string') return { label: item, value: item };
                const name = item.name || item.unitName || item.unit_name || item.title || "";
                return { label: name, value: name };
            }).filter(opt => Boolean(opt.value));
        }

        return [];
    }, [rawUnitData]);

    // Sync selected category when options are loaded
    useEffect(() => {
        if (categoryOptions.length > 0) {
            if (!fieldValues.category) {
                const initialCat = categoryOptions[0];
                setSelectedCategory(initialCat);
                setFieldValues((prev) => ({ ...prev, category: initialCat.value }));
            } else {
                const match = categoryOptions.find(
                    (opt) => opt.value.toLowerCase() === fieldValues.category.toLowerCase()
                );
                if (match) setSelectedCategory(match);
            }
        }
    }, [categoryOptions]);

    // Sync selected unit when options are loaded
    useEffect(() => {
        if (unitOptions.length > 0) {
            if (!fieldValues.unit) {
                const initialUnit = unitOptions[0];
                setSelectedUnit(initialUnit);
                setFieldValues((prev) => ({ ...prev, unit: initialUnit.value }));
            } else {
                const match = unitOptions.find(
                    (opt) => opt.value.toLowerCase() === fieldValues.unit.toLowerCase()
                );
                if (match) setSelectedUnit(match);
            }
        }
    }, [unitOptions]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
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
        setFieldValues((prev) => ({
            ...prev,
            unit: option.value
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
            const payload = {
                accessUser: buildAccessUser(),
                product: withBranchScope({
                    name: fieldValues.name.trim(),
                    category: fieldValues.category.trim(),
                    unit: fieldValues.unit.trim() || "PCS",
                    quantity: fieldValues.quantity ? Number(fieldValues.quantity) : 0,
                    buy_price: Number(fieldValues.buy_price) || 0,
                    sell_price: Number(fieldValues.sell_price) || 0,
                    pcode: fieldValues.pcode.trim(),
                    sku: fieldValues.sku.trim(),
                    barcode: fieldValues.barcode.trim(),
                    low_stock_threshold: fieldValues.low_stock_threshold ? Number(fieldValues.low_stock_threshold) : 0,
                    packing_levels: fieldValues.packing_levels.trim(),
                    status: fieldValues.status,
                })
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
            showErrorToast(error?.message || "Failed to create product");
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
                        Product Information
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

                            {/* Unit */}
                            <div className="relative z-20">
                                <SelectInput
                                    label={`Unit${isUnitsLoading ? " (Loading...)" : ""}`}
                                    value={selectedUnit}
                                    options={unitOptions}
                                    onChange={handleUnitSelect}
                                    placeholder="Select Unit"
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <InputField
                                    label="Quantity"
                                    type="number"
                                    name="quantity"
                                    value={fieldValues.quantity}
                                    onChange={handleChange}
                                    placeholder="0"
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

                            {/* Status (Compact in 3rd column under Barcode) */}
                            <div className="lg:col-start-3 flex justify-end items-center">
                                <div className="flex items-center justify-between gap-3 bg-gray-50 px-3.5 py-1.5 rounded-lg border border-gray-200 h-[38px] w-full sm:w-44">
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
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-4 py-1">
                <Button
                    label="Cancel"
                    onClick={() => navigate("/admin/products")}
                    color="#6b7280"
                    hoverColor="#4b5563"
                    disabled={isLoading}
                />
                <Button
                    label="Save Product"
                    onClick={handleSubmitForm}
                    color="#009FE3"
                    hoverColor="#0085be"
                    isLoading={isLoading}
                    disabled={isLoading}
                />
            </div>
        </form>
    );
};

export default CreateProductForm;