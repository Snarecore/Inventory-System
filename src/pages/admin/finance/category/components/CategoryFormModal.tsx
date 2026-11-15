import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DrawerModal, Button, TextInput as InputField } from "@/components/common";
import {
  useInsertCategoryMutation,
  useUpdateCategoryMutation,
  useUpdateCategoryStatusMutation,
} from "@/hooks/useCategoryQueries";
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";
import type { CategoryItem, CategoryStatus, CategoryType } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";
import { FaLayerGroup, FaArrowDown, FaArrowUp, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { usePermission } from "@/hooks/usePermission";

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

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  existingCategories = [],
}) => {
  const { t } = useTranslation();
  const { canCreate, canUpdate } = usePermission();
  const [prevCategoryToEdit, setPrevCategoryToEdit] = useState(categoryToEdit);
  const [categoryName, setCategoryName] = useState(categoryToEdit?.categoryName || "");
  const [categoryType, setCategoryType] = useState<CategoryType>(
    categoryToEdit && normalizeCategoryType(String(categoryToEdit.type || "")) === "Income"
      ? "Income"
      : "Expense"
  );
  const [status, setStatus] = useState<CategoryStatus>(
    (categoryToEdit?.status && String(categoryToEdit.status).toLowerCase() === "inactive")
      ? "Inactive"
      : "Active"
  );
  const [nameError, setNameError] = useState("");

  if (categoryToEdit !== prevCategoryToEdit) {
    setPrevCategoryToEdit(categoryToEdit);
    setCategoryName(categoryToEdit?.categoryName || "");
    setCategoryType(
      categoryToEdit && normalizeCategoryType(String(categoryToEdit.type || "")) === "Income"
        ? "Income"
        : "Expense"
    );
    setStatus(
      (categoryToEdit?.status && String(categoryToEdit.status).toLowerCase() === "inactive")
        ? "Inactive"
        : "Active"
    );
    setNameError("");
  }

  const isEditing = Boolean(categoryToEdit);

  const insertMutation = useInsertCategoryMutation({
    onSuccess: () => onClose(),
  });

  const updateMutation = useUpdateCategoryMutation({
    onSuccess: () => onClose(),
  });

  const statusMutation = useUpdateCategoryStatusMutation();

  const isSaving = insertMutation.isPending || updateMutation.isPending || statusMutation.isPending;

  const handleNameChange = (val: string) => {
    setCategoryName(val);
    if (nameError) setNameError("");
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;

    if (isEditing && !canUpdate("category_finance")) {
      showErrorToast("You do not have permission to update categories.");
      return;
    }
    if (!isEditing && !canCreate("category_finance")) {
      showErrorToast("You do not have permission to create categories.");
      return;
    }

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setNameError(t("Category name is required"));
      showErrorToast(t("Please enter a category name"));
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

      const currentStatus: CategoryStatus =
        String(categoryToEdit.status || "").toLowerCase() === "inactive" ? "Inactive" : "Active";
      if (status !== currentStatus) {
        statusMutation.mutate({
          categoryId: categoryToEdit.categoryId,
          status,
        });
      }
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
    <DrawerModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t("Edit Category") : t("Add New Category")}
      icon={<FaLayerGroup size={14} />}
      maxWidth="max-w-[320px]"
      contentKey={categoryToEdit ? `edit-${categoryToEdit.categoryId}` : "create"}
      onSubmit={handleSubmit}
      footerButtons={
        <>
          <Button
            label={t("Cancel")}
            onClick={onClose}
            variant="outline"
            disabled={isSaving}
            buttonClass="!bg-white hover:!bg-gray-50 !border-gray-300 !text-gray-700 shadow-2xs font-medium !rounded-md !py-[0.4rem] !px-4 text-xs sm:text-sm"
          />
          <Button
            label={isEditing ? t("Update Category") : t("Save Category")}
            type="submit"
            color="var(--color-primary)"
            hoverColor="var(--color-primary-hover)"
            isLoading={isSaving}
            disabled={isSaving || (isEditing ? !canUpdate("category_finance") : !canCreate("category_finance"))}
          />
        </>
      }
    >
      {/* Category Name */}
      <div>
        <InputField
          label={t("Category Name")}
          placeholder={t("e.g. Office Rent, Electricity, Tea/Snacks")}
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

      {/* Status Toggle - Only visible when editing */}
      {isEditing && (
        <div>
          <label className="block text-xs font-semibold text-gray-800 mb-1.5">
            {t("Status")}
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
              <span>{t("Active")}</span>
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
              <span>{t("Inactive")}</span>
            </button>
          </div>
        </div>
      )}
    </DrawerModal>
  );
};

export default CategoryFormModal;
