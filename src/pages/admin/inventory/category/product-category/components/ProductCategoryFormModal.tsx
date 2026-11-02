import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TextInput } from "@/components/common";
import {
  useInsertProductCategoryMutation,
  useUpdateProductCategoryMutation,
} from "@/hooks/useProductCategoryQueries";
import type { ProductCategoryItem, ProductCategoryStatus } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";
import { TiDelete } from "react-icons/ti";
import { FaBoxes, FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";

interface ProductCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: ProductCategoryItem | null;
  existingCategories?: ProductCategoryItem[];
}

interface FormContentProps {
  categoryToEdit?: ProductCategoryItem | null;
  existingCategories: ProductCategoryItem[];
  onClose: () => void;
}

const ProductCategoryFormContent: React.FC<FormContentProps> = ({
  categoryToEdit,
  existingCategories,
  onClose,
}) => {
  const [name, setName] = useState(categoryToEdit?.name || "");
  const [description, setDescription] = useState(categoryToEdit?.description || "");
  const [status, setStatus] = useState<ProductCategoryStatus>(
    (categoryToEdit?.status || "Active") as ProductCategoryStatus
  );
  const [nameError, setNameError] = useState("");

  const isEditing = Boolean(categoryToEdit);

  const insertMutation = useInsertProductCategoryMutation({
    onSuccess: () => onClose(),
  });

  const updateMutation = useUpdateProductCategoryMutation({
    onSuccess: () => onClose(),
  });

  const isSaving = insertMutation.isPending || updateMutation.isPending;

  const handleNameChange = (val: string) => {
    setName(val);
    if (nameError) setNameError("");
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Category name is required");
      showErrorToast("Please enter a category name");
      return;
    }

    // Check duplicate name
    const isDuplicate = existingCategories.some(
      (item) =>
        (item.name || "").trim().toLowerCase() === trimmedName.toLowerCase() &&
        item.id !== categoryToEdit?.id
    );

    if (isDuplicate) {
      const err = `Category "${trimmedName}" already exists`;
      setNameError(err);
      showErrorToast(err);
      return;
    }

    if (isEditing && categoryToEdit) {
      updateMutation.mutate({
        id: categoryToEdit.id,
        name: trimmedName,
        description: description.trim(),
        sortOrder: categoryToEdit.sortOrder || 0,
        status,
      });
    } else {
      insertMutation.mutate({
        name: trimmedName,
        description: description.trim(),
        sortOrder: existingCategories.length + 1,
        status,
      });
    }
  };

  return (
    <>
      {/* Drawer Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-[var(--color-primary)]">
            <FaBoxes size={15} />
          </div>
          <h2 className="text-sm font-bold text-gray-900 leading-tight">
            {isEditing ? "Edit Product Category" : "Add Product Category"}
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

      {/* Drawer Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Category Name */}
        <div>
          <TextInput
            label="Category Name"
            placeholder="e.g. Beverages, Electronics, Bakery"
            value={name}
            onChange={handleNameChange}
            error={nameError}
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional brief description of this product category..."
            className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all resize-none text-black"
          />
        </div>

        {/* Status Toggle */}
        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1.5">
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus("Active")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                status === "Active"
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-400"
                  : "border-gray-200 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
              }`}
            >
              <FaCheckCircle className="text-xs shrink-0 text-emerald-600" />
              <span>Active</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus("Inactive")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                status === "Inactive"
                  ? "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-400"
                  : "border-gray-200 bg-gray-50/60 text-gray-600 hover:border-gray-300 hover:bg-gray-100"
              }`}
            >
              <FaTimesCircle className="text-xs shrink-0 text-rose-600" />
              <span>Inactive</span>
            </button>
          </div>
        </div>
      </form>

      {/* Drawer Footer */}
      <div className="px-4 py-2.5 border-t border-[var(--ui-border)] bg-[var(--ui-surface-sunken)]/60 flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="h-8 px-3 text-xs font-medium rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={isSaving}
          className="h-8 px-4 text-xs font-semibold rounded-md bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
        >
          {isSaving ? (
            <>
              <FaSpinner className="animate-spin -ml-0.5 text-white" size={13} />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEditing ? "Update Category" : "Save Category"}</span>
          )}
        </button>
      </div>
    </>
  );
};

export const ProductCategoryFormModal: React.FC<ProductCategoryFormModalProps> = ({
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
              key={categoryToEdit ? `edit-${categoryToEdit.id}` : "create"}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-screen max-w-[340px] bg-white shadow-2xl flex flex-col pointer-events-auto border-l border-gray-200"
            >
              <ProductCategoryFormContent
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

export default ProductCategoryFormModal;
