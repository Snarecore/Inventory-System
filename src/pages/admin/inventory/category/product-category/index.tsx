import React, { useState, useMemo } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import { Button, RefreshButton, DeleteModal } from "@/components/common";
import ProductCategoryTable from "./components/ProductCategoryTable";
import ProductCategoryFormModal from "./components/ProductCategoryFormModal";
import {
  useProductCategoryListQuery,
  useUpdateProductCategoryStatusMutation,
  useDeleteProductCategoryMutation,
} from "@/hooks/useProductCategoryQueries";
import type { ProductCategoryItem } from "@/types";
import { FaPlus } from "react-icons/fa";

export const ProductCategoryPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<ProductCategoryItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategoryItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // TanStack Query to fetch product categories
  const { data, isLoading, refetch } = useProductCategoryListQuery();
  const categories = useMemo(() => data?.categoryList ?? [], [data?.categoryList]);

  // Mutations
  const statusMutation = useUpdateProductCategoryStatusMutation();
  const deleteMutation = useDeleteProductCategoryMutation({
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
    },
  });

  // Handlers
  const handleAddNew = () => {
    setCategoryToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ProductCategoryItem) => {
    setCategoryToEdit(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: ProductCategoryItem) => {
    setCategoryToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    deleteMutation.mutate({ id: categoryToDelete.id });
  };

  const handleToggleStatus = (item: ProductCategoryItem) => {
    const currentStatus = (item.status || "").toLowerCase();
    const nextStatus = currentStatus === "active" ? "Inactive" : "Active";

    setTogglingId(item.id);
    statusMutation.mutate(
      {
        id: item.id,
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
          headerTitle="Product Categories"
          headerDescription="Manage categories for your products, inventory and POS"
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

      {/* Product Categories Table */}
      <ProductCategoryTable
        categories={categories}
        isLoading={isLoading}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onToggleStatus={handleToggleStatus}
        togglingId={togglingId}
      />

      {/* Add / Edit Category Drawer Modal */}
      <ProductCategoryFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        categoryToEdit={categoryToEdit}
        existingCategories={categories}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Product Category?"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? Products under this category may need to be reassigned.`}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        onDelete={handleConfirmDelete}
      />
    </div>
  );
};

export default ProductCategoryPage;
