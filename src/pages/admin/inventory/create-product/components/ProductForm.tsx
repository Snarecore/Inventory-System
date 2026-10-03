import React, { ChangeEvent, useState } from 'react';
import Button from '@/components/button/Button';
import SelectInput from '@/components/form/SelectField';
import TextEditor from '@/components/form/TextEditor';
import InputField from '@/components/form/TextInput';
import ProductMultipleImage from '@/components/image-multiple/ProductMultipleImage';
import ImageUpload from '@/components/image/ImageUpload';
import { IoMdAddCircleOutline, IoMdRemoveCircleOutline } from 'react-icons/io';
import { RiArrowDropDownLine } from 'react-icons/ri';
import { useNavigate } from "react-router-dom";
import { showSuccessToast, showErrorToast } from '@/utils/toast-utils';

interface Option {
    label: string;
    value: string;
}

interface ProductFormState {
    name: string;
    price: string;
    discountType: string;
    discountAmount: string;
    sku: string;
    videoUrl: string;
    cost: string;
    summary: string[];
    description: string;
    mainCategoryId: string;
    firstCategoryId: string;
    secondCategoryId: string;
    thirdCategoryId: string;
    featuredImage: File | string | null;
    productImages: (File | string)[];
}

const initialFieldValues: ProductFormState = {
    name: "",
    price: "",
    discountType: "none",
    discountAmount: "",
    sku: "",
    videoUrl: "",
    cost: "",
    summary: [""],
    description: "",
    mainCategoryId: "",
    firstCategoryId: "",
    secondCategoryId: "",
    thirdCategoryId: "",
    featuredImage: null,
    productImages: [],
};

const discountTypeOptions: Option[] = [
    { label: "None", value: "none" },
    { label: "Percentage", value: "percentage" },
    { label: "Flat", value: "flat" },
];

const mainCategoryOptions: Option[] = [
    { label: "Electronics", value: "electronics" },
    { label: "Clothing & Fashion", value: "clothing" },
    { label: "Home & Living", value: "home-living" },
    { label: "Beauty & Health", value: "beauty-health" },
    { label: "Books & Stationery", value: "books" },
];

const firstCategoryOptions: Option[] = [
    { label: "Mobile Phones", value: "mobile-phones" },
    { label: "Laptops & Computers", value: "laptops" },
    { label: "Men's Wear", value: "mens-wear" },
    { label: "Women's Wear", value: "womens-wear" },
    { label: "Skin Care", value: "skin-care" },
];

const CreateProductForm = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [fieldValues, setFieldValues] = useState<ProductFormState>(initialFieldValues);
    const [selectedDiscountType, setSelectedDiscountType] = useState<Option | null>(discountTypeOptions[0]);
    const [selectedMainCategory, setSelectedMainCategory] = useState<Option | null>(null);
    const [selectedFirstCategory, setSelectedFirstCategory] = useState<Option | null>(null);
    const [productImages, setProductImages] = useState<(File | string)[]>([]);
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const isDiscountNone = !selectedDiscountType || selectedDiscountType.value === "none";
    const isDiscountPct = selectedDiscountType?.value === "percentage";
    const isDiscountFlat = selectedDiscountType?.value === "flat";

    const handleGenerateSku = (e: React.MouseEvent) => {
        e.preventDefault();
        const code = "SKU-" + Math.random().toString(36).substring(2, 9).toUpperCase();
        setFieldValues((prev) => ({
            ...prev,
            sku: code
        }));
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFieldValues((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleDiscountTypeOptionChange = (option: Option) => {
        setSelectedDiscountType(option);
        setFieldValues((prev) => ({
            ...prev,
            discountType: option.value,
            discountAmount: option.value === "none" ? "" : prev.discountAmount
        }));
    };

    const handleMainCategoryChange = (option: Option) => {
        setSelectedMainCategory(option);
        setFieldValues((prev) => ({
            ...prev,
            mainCategoryId: option.value
        }));
    };

    const handleFirstCategoryChange = (option: Option) => {
        setSelectedFirstCategory(option);
        setFieldValues((prev) => ({
            ...prev,
            firstCategoryId: option.value
        }));
    };

    const handleSummaryChange = (index: number, value: string) => {
        const updatedSummary = [...fieldValues.summary];
        updatedSummary[index] = value;
        setFieldValues((prev) => ({
            ...prev,
            summary: updatedSummary
        }));
    };

    const handleAddSummary = () => {
        if (fieldValues.summary.length < 6) {
            setFieldValues((prev) => ({
                ...prev,
                summary: [...prev.summary, ""]
            }));
        }
    };

    const handleRemoveSummary = (index: number) => {
        if (fieldValues.summary.length > 1) {
            const updatedSummary = [...fieldValues.summary];
            updatedSummary.splice(index, 1);
            setFieldValues((prev) => ({
                ...prev,
                summary: updatedSummary
            }));
        }
    };

    const handleFeaturedImageUpload = (file: File | null) => {
        setFieldValues((prev) => ({ ...prev, featuredImage: file }));
    };

    const handleProductImagesUpload = (files: (File | string)[]) => {
        setProductImages(files);
        setFieldValues((prev) => ({ ...prev, productImages: files }));
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fieldValues.name.trim()) {
            showErrorToast("Product Name is required!");
            return;
        }
        if (!fieldValues.price) {
            showErrorToast("Product Price is required!");
            return;
        }

        setIsLoading(true);
        try {
            // Simulated submission delay for smooth UX
            await new Promise((resolve) => setTimeout(resolve, 600));
            showSuccessToast("Product created successfully!");
            navigate("/products");
        } catch (error) {
            showErrorToast("Failed to create product");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmitForm}>
            <div className="mx-auto bg-white shadow rounded-lg">
                <div
                    className="flex justify-between items-center px-4 sm:px-6 py-3 cursor-pointer select-none transition-all duration-300 ease-in-out hover:bg-gray-50 rounded-t-lg"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="text-base font-bold text-[#212b36]">
                        Product Information
                    </div>
                    <RiArrowDropDownLine
                        className={`text-2xl sm:text-3xl transition-all duration-300 ease-in-out ${isOpen ? "rotate-180" : ""}`}
                    />
                </div>

                <hr className="border-gray-200" />

                {isOpen && (
                    <>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <InputField
                                        label="Product Name"
                                        type="text"
                                        name="name"
                                        required
                                        value={fieldValues.name}
                                        onChange={handleChange}
                                        placeholder="Enter product title"
                                    />
                                </div>

                                <div className="relative">
                                    <InputField
                                        label="SKU"
                                        type="text"
                                        name="sku"
                                        required
                                        value={fieldValues.sku}
                                        onChange={handleChange}
                                        placeholder="Generate or enter SKU"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerateSku}
                                        className="absolute right-2 top-8 bg-[var(--color-primary)] text-white py-1.5 px-3 rounded-md text-xs font-semibold cursor-pointer hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm"
                                    >
                                        Generate
                                    </button>
                                </div>

                                <div>
                                    <InputField
                                        label="Price ($)"
                                        type="number"
                                        name="price"
                                        required
                                        value={fieldValues.price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <InputField
                                        label="Cost ($)"
                                        type="number"
                                        name="cost"
                                        value={fieldValues.cost}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                    />
                                </div>

                                <SelectInput
                                    label="Discount Type"
                                    value={selectedDiscountType}
                                    options={discountTypeOptions}
                                    onChange={handleDiscountTypeOptionChange}
                                    placeholder="Select Discount Type"
                                />

                                <div>
                                    <InputField
                                        label={`Discount Amount${isDiscountPct ? " (%)" : isDiscountFlat ? " ($)" : ""}`}
                                        type="number"
                                        name="discountAmount"
                                        value={fieldValues.discountAmount}
                                        onChange={handleChange}
                                        disabled={isDiscountNone}
                                        min={isDiscountPct ? 1 : 0}
                                        max={isDiscountPct ? 99 : undefined}
                                        placeholder={
                                            isDiscountNone
                                                ? "Select a discount type first"
                                                : isDiscountPct
                                                    ? "e.g., 10 for 10%"
                                                    : "e.g., 100 for flat"
                                        }
                                    />
                                    {isDiscountNone && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Choose &ldquo;Percentage&rdquo; or &ldquo;Flat&rdquo; to enter an amount.
                                        </p>
                                    )}
                                </div>

                                <SelectInput
                                    label="Main Category"
                                    value={selectedMainCategory}
                                    options={mainCategoryOptions}
                                    onChange={handleMainCategoryChange}
                                    placeholder="Select Main Category"
                                />

                                <SelectInput
                                    label="First Category"
                                    value={selectedFirstCategory}
                                    options={firstCategoryOptions}
                                    onChange={handleFirstCategoryChange}
                                    placeholder="Select Subcategory"
                                />

                                <div className="md:col-span-2">
                                    <p className="text-sm font-medium text-gray-700 w-full mb-2">Product Key Highlights / Summary</p>
                                    <div className="space-y-2.5">
                                        {fieldValues.summary.map((point, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={`Highlight point ${index + 1}`}
                                                    value={point}
                                                    onChange={(e) => handleSummaryChange(index, e.target.value)}
                                                    className="w-full h-10 px-3.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all"
                                                />
                                                {fieldValues.summary.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSummary(index)}
                                                        className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-500 hover:text-white cursor-pointer transition-colors"
                                                        title="Remove item"
                                                    >
                                                        <IoMdRemoveCircleOutline className="text-xl" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        <div className="flex justify-start pt-1">
                                            <Button
                                                label="Add Point"
                                                onClick={handleAddSummary}
                                                color="var(--color-primary)"
                                                hoverColor="var(--color-primary-hover)"
                                                icon={<IoMdAddCircleOutline size={18} />}
                                                disabled={fieldValues.summary.length >= 6}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6">
                            <p className="text-sm font-medium text-gray-700 w-full mb-2">Product Description</p>
                            <TextEditor value={description} onChange={(val) => {
                                setDescription(val);
                                setFieldValues((prev) => ({ ...prev, description: val }));
                            }} />
                        </div>
                    </>
                )}
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="col-span-1 lg:col-span-4 bg-white pb-4 rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base font-bold text-[#212b36]">
                                Featured Image
                            </h3>

                            <div>
                                <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[var(--primary-color-light)] text-black border border-[var(--primary-color)]">
                                    Recommended: 626×621 PX
                                </span>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 leading-relaxed">
                            Add one featured image to show as the main thumbnail for your product.
                        </p>
                    </div>
                    <div className="px-6 py-4">
                        <ImageUpload value={typeof fieldValues.featuredImage === 'string' ? fieldValues.featuredImage : null} onChange={handleFeaturedImageUpload} />
                    </div>
                </div>

                <div className="col-span-1 lg:col-span-8 bg-white rounded-lg shadow">
                    <ProductMultipleImage value={productImages} onChange={handleProductImagesUpload} />
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 py-6">
                <Button label="Cancel" onClick={() => navigate("/products")} color="var(--color-black)" hoverColor="var(--color-black)" />
                <Button label="Save Product" onClick={handleSubmitForm} color="var(--color-primary)" hoverColor="var(--color-primary-hover)" isLoading={isLoading} disabled={isLoading} />
            </div>
        </form>
    );
};

export default CreateProductForm;