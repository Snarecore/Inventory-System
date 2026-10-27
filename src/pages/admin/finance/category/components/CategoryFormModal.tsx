import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, TextInput as InputField } from "@/components/common";
import {
  useInsertCategoryMutation,
  useUpdateCategoryMutation,
} from "@/hooks/useCategoryQueries";
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";
import type { CategoryItem, CategoryType } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";
import { TiDelete } from "react-icons/ti";
import { FaLayerGroup, FaArrowDown, FaArrowUp } from "react-icons/fa";

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: CategoryItem | null;
  existingCategories?: CategoryItem[];
}

const TYPE_OPTIONS: {
  label: string;
  value: CategoryType;
  icon: React.ComponentType<{ className?: string }>;
  activeColor: string;
}[] = [
  {
    label: "Expense",
    value: "Expense",
    icon: FaArrowDown,
    activeColor: "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-400",
  },
  {
    label: "Income",
    value: "Income",
    icon: FaArrowUp,
    activeColor: "border-sky-400 bg-sky-50 text-sky-700 ring-1 ring-sky-400",
  },
];

interface FormContentProps {
  categoryToEdit?: CategoryItem | null;
  existingCategories: CategoryItem[];
  onClose: () => void;
}

const CategoryFormContent: React.FC<FormContentProps> = ({
  categoryToEdit,
  existingCategories,
  onClose,
}) => {
  const [categoryName, setCategoryName] = useState(categoryToEdit?.categoryName || "");
  const [categoryType, setCategoryType] = useState<CategoryType>(
    categoryToEdit && normalizeCategoryType(String(categoryToEdit.type || "")) === "Income"
      ? "Income"
      : "Expense"
  );
  const [nameError, setNameError] = useState("");

  const isEditing = Boolean(categoryToEdit);

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
        openingBalance: 0,
      });
    } else {
      insertMutation.mutate({
        categoryName: trimmedName,
        categoryType,
        openingBalance: 0,
        transactionDate: new Date().toISOString(),
      });
    }
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-[var(--color-primary)]">
            <FaLayerGroup size={14} />
          </div>
          <h2 className="text-sm font-bold text-gray-900 leading-tight">
            {isEditing ? "Edit Category" : "Add New Category"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors cursor-pointer"
          title="Close"
        >
          <TiDelete className="text-2xl text-red-500" />
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Category Name */}
        <div>
          <InputField
            label="Category Name"
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
            Category Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((opt) => {
              const isSelected = categoryType === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategoryType(opt.value)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? opt.activeColor
                      : "border-gray-200 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="text-xs shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </form>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/80 flex items-center justify-end gap-2 shrink-0">
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
    </>
  );
};

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  existingCategories = [],
}) => {
  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] cursor-pointer"
          />

          {/* Sidebar Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pointer-events-none">
            <motion.div
              key={categoryToEdit ? `edit-${categoryToEdit.categoryId}` : "create"}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-screen max-w-[320px] bg-white shadow-2xl flex flex-col pointer-events-auto border-l border-gray-200"
            >
              <CategoryFormContent
                categoryToEdit={categoryToEdit}
                existingCategories={existingCategories}
                onClose={onClose}
              />
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CategoryFormModal;
