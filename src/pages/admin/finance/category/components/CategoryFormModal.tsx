import React, { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import InputField from "@/components/form/TextInput";
import CurrencyInput from "@/components/form/CurrencyInput";
import {
  useInsertCategoryMutation,
  useUpdateCategoryMutation,
} from "@/hooks/useCategoryQueries";
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";
import type { CategoryItem, CategoryType } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryItem | null;
  existingCategories?: CategoryItem[];
}

const TYPE_OPTIONS: { label: string; value: CategoryType }[] = [
  { label: "Expense", value: "Expense" },
  { label: "Income", value: "Income" },
  { label: "Cash", value: "Cash" },
];

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  existingCategories = [],
}) => {
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<CategoryType>("Expense");
  const [openingBalance, setOpeningBalance] = useState<string | number>(0);
  const [nameError, setNameError] = useState("");

  const isEditing = Boolean(categoryToEdit);

  // Sync state when modal opens or categoryToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setCategoryName(categoryToEdit.categoryName || "");
        setCategoryType(normalizeCategoryType(String(categoryToEdit.type || "Expense")));
        setOpeningBalance(Number(categoryToEdit.openingBalance || 0));
      } else {
        setCategoryName("");
        setCategoryType("Expense");
        setOpeningBalance(0);
      }
      setNameError("");
    }
  }, [isOpen, categoryToEdit]);

  const insertMutation = useInsertCategoryMutation({
    onSuccess: () => onClose(),
  });

  const updateMutation = useUpdateCategoryMutation({
    onSuccess: () => onClose(),
  });

  const isSaving = insertMutation.isPending || updateMutation.isPending;

  const handleNameChange = (val: string) => {
    setCategoryName(val);
    if (nameError) setNameError("");
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setNameError("Category name is required");
      showErrorToast("Please enter a category name");
      return;
    }

    // Check duplicate name
    const isDuplicate = existingCategories.some(
      (item) =>
        (item.categoryName || "").trim().toLowerCase() === trimmedName.toLowerCase() &&
        item.categoryId !== categoryToEdit?.categoryId
    );

    if (isDuplicate) {
      const err = `Category "${trimmedName}" already exists`;
      setNameError(err);
      showErrorToast(err);
      return;
    }

    if (isEditing && categoryToEdit) {
      if (isCategoryAdmin(categoryToEdit)) {
        showErrorToast("Default system category cannot be edited");
        return;
      }
      updateMutation.mutate({
        categoryId: categoryToEdit.categoryId,
        categoryName: trimmedName,
        categoryType,
        openingBalance: categoryType === "Cash" ? Number(openingBalance || 0) : 0,
      });
    } else {
      insertMutation.mutate({
        categoryName: trimmedName,
        categoryType,
        openingBalance: categoryType === "Cash" ? Number(openingBalance || 0) : 0,
        transactionDate: new Date().toISOString(),
      });
    }
  };

  const isCash = categoryType === "Cash";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Category" : "Add New Category"}
      maxWidth="max-w-md"
      footerButtons={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            label="Cancel"
            onClick={onClose}
            color="var(--color-secondary)"
            hoverColor="var(--color-secondary-hover)"
            disabled={isSaving}
          />
          <Button
            label={isEditing ? "Update Category" : "Save Category"}
            onClick={() => handleSubmit()}
            color="var(--color-primary)"
            hoverColor="var(--color-primary-hover)"
            isLoading={isSaving}
            disabled={isSaving}
          />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Category Name */}
        <div>
          <InputField
            label="Category Name *"
            placeholder="e.g. Office Rent, Electricity, Tea/Snacks"
            value={categoryName}
            onChange={handleNameChange}
            error={nameError}
            required
            autoFocus
          />
        </div>

        {/* Category Type */}
        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1.5">
            Category Type *
          </label>
          <div className="relative">
            <select
              value={categoryType}
              onChange={(e) => setCategoryType(e.target.value as CategoryType)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs bg-white text-gray-800 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {categoryType === "Expense" && "Used for booking business expenditures and daily costs."}
            {categoryType === "Income" && "Used for booking auxiliary and non-trade incomes."}
            {categoryType === "Cash" && "Used for cash drawer and cash balance account tracking."}
          </p>
        </div>

        {/* Opening Balance (Enabled only for Cash category) */}
        <div>
          {isCash ? (
            <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1">
              <CurrencyInput
                label="Opening Balance"
                value={openingBalance}
                onChange={(val) => setOpeningBalance(val)}
                currencySymbol="৳"
                placeholder="0.00"
                className="w-full"
              />
              <p className="text-[10px] text-gray-500">
                * An opening balance financial entry will be generated automatically for this cash drawer.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-400 italic">
              Opening balance is only applicable for Cash categories.
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default CategoryFormModal;
