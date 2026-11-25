import React, { useState } from "react";
import { CategoryDrawerModal, type CategoryDrawerStatus } from "@/components/common";
import {
  useInsertProductCategoryMutation,
  useUpdateProductCategoryMutation,
} from "@/hooks/useProductCategoryQueries";
import type { ProductCategoryItem } from "@/types";
import { FaBoxes } from "react-icons/fa";

interface ProductCategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: ProductCategoryItem | null;
  existingCategories?: ProductCategoryItem[];
}

const getInitialStatus = (category?: ProductCategoryItem | null): CategoryDrawerStatus =>
  category?.status && String(category.status).toLowerCase() === "inactive"
    ? "Inactive"
    : "Active";

export const ProductCategoryFormModal: React.FC<ProductCategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  existingCategories = [],
}) => {
  const [prevCategoryToEdit, setPrevCategoryToEdit] = useState(categoryToEdit);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [description, setDescription] = useState(categoryToEdit?.description || "");

  if (categoryToEdit !== prevCategoryToEdit || isOpen !== prevIsOpen) {
    setPrevCategoryToEdit(categoryToEdit);
    setPrevIsOpen(isOpen);
    setDescription(isOpen ? categoryToEdit?.description || "" : "");
  }

  const isEditing = Boolean(categoryToEdit);

  const insertMutation = useInsertProductCategoryMutation({
    onSuccess: () => {
      setDescription("");
      onClose();
    },
  });

  const updateMutation = useUpdateProductCategoryMutation({
    onSuccess: () => onClose(),
  });

  const isSaving = insertMutation.isPending || updateMutation.isPending;

  const validateName = (trimmedName: string) => {
    const isDuplicate = existingCategories.some(
      (item) =>
        (item.name || "").trim().toLowerCase() === trimmedName.toLowerCase() &&
        item.id !== categoryToEdit?.id
    );
    return isDuplicate ? `Category "${trimmedName}" already exists` : null;
  };

  const handleSubmitCategory = ({
    name,
    status,
  }: {
    name: string;
    status: CategoryDrawerStatus;
  }) => {
    if (isEditing && categoryToEdit) {
      updateMutation.mutate({
        id: categoryToEdit.id,
        name,
        description: description.trim(),
        sortOrder: categoryToEdit.sortOrder || 0,
        status,
      });
    } else {
      insertMutation.mutate({
        name,
        description: description.trim(),
        sortOrder: existingCategories.length + 1,
        status,
      });
    }
  };

  return (
    <CategoryDrawerModal
      isOpen={isOpen}
      onClose={onClose}
      isEditing={isEditing}
      contentKey={categoryToEdit ? `edit-${categoryToEdit.id}` : "create"}
      title={isEditing ? "Edit Product Category" : "Add Product Category"}
      icon={<FaBoxes size={15} />}
      permissionModule="category_product"
      initialName={categoryToEdit?.name || ""}
      initialStatus={getInitialStatus(categoryToEdit)}
      namePlaceholder="e.g. Beverages, Electronics, Bakery"
      isSaving={isSaving}
      submitLabel={isEditing ? "Update Category" : "Save Category"}
      onSubmitCategory={handleSubmitCategory}
      validateName={validateName}
      createPermissionMessage="You do not have permission to create product categories."
      updatePermissionMessage="You do not have permission to update product categories."
      maxWidth="max-w-[340px]"
    >
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
    </CategoryDrawerModal>
  );
};

export default ProductCategoryFormModal;
