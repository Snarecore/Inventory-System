import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CategoryDrawerModal, type CategoryDrawerStatus } from "@/components/common";
import {
  useInsertCategoryMutation,
  useUpdateCategoryMutation,
  useUpdateCategoryStatusMutation,
} from "@/hooks/useCategoryQueries";
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";
import type { CategoryItem, CategoryStatus, CategoryType } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";
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

const getInitialCategoryType = (category?: CategoryItem | null): CategoryType =>
  category && normalizeCategoryType(String(category.type || "")) === "Income"
    ? "Income"
    : "Expense";

const getInitialStatus = (category?: CategoryItem | null): CategoryDrawerStatus =>
  category?.status && String(category.status).toLowerCase() === "inactive"
    ? "Inactive"
    : "Active";

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  existingCategories = [],
}) => {
  const { t } = useTranslation();
  const [prevCategoryToEdit, setPrevCategoryToEdit] = useState(categoryToEdit);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [categoryType, setCategoryType] = useState<CategoryType>(() =>
    getInitialCategoryType(categoryToEdit)
  );

  if (categoryToEdit !== prevCategoryToEdit || isOpen !== prevIsOpen) {
    setPrevCategoryToEdit(categoryToEdit);
    setPrevIsOpen(isOpen);
    setCategoryType(isOpen ? getInitialCategoryType(categoryToEdit) : "Expense");
  }

  const isEditing = Boolean(categoryToEdit);

  const insertMutation = useInsertCategoryMutation({
    onSuccess: () => {
      setCategoryType("Expense");
      onClose();
    },
  });

  const updateMutation = useUpdateCategoryMutation({
    onSuccess: () => onClose(),
  });

  const statusMutation = useUpdateCategoryStatusMutation();

  const isSaving = insertMutation.isPending || updateMutation.isPending || statusMutation.isPending;

  const validateName = (trimmedName: string) => {
    const isDuplicate = existingCategories.some(
      (item) =>
        (item.categoryName || "").trim().toLowerCase() === trimmedName.toLowerCase() &&
        normalizeCategoryType(String(item.type || "")) === categoryType &&
        item.categoryId !== categoryToEdit?.categoryId
    );
    return isDuplicate
      ? `Category "${trimmedName}" already exists in ${categoryType}`
      : null;
  };

  const handleSubmitCategory = ({
    name,
    status,
  }: {
    name: string;
    status: CategoryDrawerStatus;
  }) => {
    if (isEditing && categoryToEdit) {
      if (isCategoryAdmin(categoryToEdit)) {
        showErrorToast("Default system category cannot be edited");
        return;
      }
      updateMutation.mutate({
        categoryId: categoryToEdit.categoryId,
        categoryName: name,
        categoryType,
        openingBalance: 0,
      });

      const currentStatus: CategoryStatus = getInitialStatus(categoryToEdit);
      if (status !== currentStatus) {
        statusMutation.mutate({
          categoryId: categoryToEdit.categoryId,
          status,
        });
      }
    } else {
      insertMutation.mutate({
        categoryName: name,
        categoryType,
        openingBalance: 0,
        transactionDate: new Date().toISOString(),
      });
    }
  };

  return (
    <CategoryDrawerModal
      isOpen={isOpen}
      onClose={onClose}
      isEditing={isEditing}
      contentKey={categoryToEdit ? `edit-${categoryToEdit.categoryId}` : "create"}
      title={isEditing ? t("Edit Category") : t("Add New Category")}
      icon={<FaLayerGroup size={14} />}
      permissionModule="category_finance"
      initialName={categoryToEdit?.categoryName || ""}
      initialStatus={getInitialStatus(categoryToEdit)}
      namePlaceholder={t("e.g. Office Rent, Electricity, Tea/Snacks")}
      isSaving={isSaving}
      submitLabel={isEditing ? t("Update Category") : t("Save Category")}
      onSubmitCategory={handleSubmitCategory}
      validateName={validateName}
      createPermissionMessage="You do not have permission to create categories."
      updatePermissionMessage="You do not have permission to update categories."
      maxWidth="max-w-[320px]"
    >
      {/* Category Type */}
      <div>
        <label className="block text-xs font-semibold text-gray-800 mb-1.5">
          {t("Category Type")} <span className="text-red-500">*</span>
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
                <span>{t(opt.label)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </CategoryDrawerModal>
  );
};

export default CategoryFormModal;
