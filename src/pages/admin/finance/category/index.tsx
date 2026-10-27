import React, { useState } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import { Button, RefreshButton } from "@/components/common";
import CategoryTable from "./components/CategoryTable";
import CategoryFormModal from "./components/CategoryFormModal";
import {
  useCategoryListQuery,
  useUpdateCategoryStatusMutation,
} from "@/hooks/useCategoryQueries";
import { isCategoryAdmin } from "@/services/category-service";
import type { CategoryItem } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";
import { FaPlus } from "react-icons/fa";

export const CategoryPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryItem | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // TanStack Query to fetch category list
  const { data, isLoading, refetch } = useCategoryListQuery();
  const categories = data?.categoryList || [];

  // TanStack Query mutation for toggling status
  const statusMutation = useUpdateCategoryStatusMutation();

  // Handlers
  const handleAddNew = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: CategoryItem) => {
    if (isCategoryAdmin(item)) {
      showErrorToast(`"${item.categoryName}" is a default system category and cannot be edited.`);
      return;
    }
    setCategoryToEdit(item);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (item: CategoryItem) => {
    if (isCategoryAdmin(item)) {
      showErrorToast(`"${item.categoryName}" is a default system category. Status cannot be changed.`);
      return;
    }

    const currentStatus = (item.status || "").toLowerCase();
    const nextStatus = currentStatus === "active" ? "Inactive" : "Active";

    setTogglingId(item.categoryId);
    statusMutation.mutate(
      {
        categoryId: item.categoryId,
        status: nextStatus,
      },
      {
        onSettled: () => {
          setTogglingId(null);
        },
      }
    );
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCategoryToEdit(null);
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Financial Categories"
          headerDescription="Manage Income and Expense categories for accounting and vouchers"
        />
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => refetch()} isLoading={isLoading} />
          <Button
            label="Add Category"
            onClick={handleAddNew}
            color="var(--color-primary)"
            hoverColor="var(--color-primary-hover)"
            icon={<FaPlus className="text-white text-xs" />}
          />
        </div>
      </div>

      {/* Categories Table */}
      <CategoryTable
        categories={categories}
        isLoading={isLoading}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        togglingId={togglingId}
      />

      {/* Add / Edit Category Modal */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        categoryToEdit={categoryToEdit}
        existingCategories={categories}
      />
    </div>
  );
};

export default CategoryPage;
