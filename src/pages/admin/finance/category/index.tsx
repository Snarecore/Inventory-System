import React, { useState } from "react";
import PageHeader from "@/components/page-header/PageHeader";
import Button from "@/components/button/Button";
import RefreshButton from "@/components/table-components/RefreshButton";
import { MotionDiv } from "@/utils/framer.motion";
import CategoryTable from "./components/CategoryTable";
import CategoryFormModal from "./components/CategoryFormModal";
import {
  useCategoryListQuery,
  useUpdateCategoryStatusMutation,
} from "@/hooks/useCategoryQueries";
import { isCategoryAdmin, normalizeCategoryType } from "@/services/category-service";
import type { CategoryItem } from "@/types";
import { showErrorToast } from "@/utils/toast-utils";
import { FaPlus, FaLayerGroup, FaCheckCircle, FaTimesCircle, FaWallet } from "react-icons/fa";

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

  // Metrics calculation
  const totalCount = categories.length;
  let activeCount = 0;
  let inactiveCount = 0;
  let totalCashBalance = 0;

  for (const c of categories) {
    const st = (c.status || "").toLowerCase();
    if (st === "active") activeCount++;
    else if (st === "inactive") inactiveCount++;

    if (normalizeCategoryType(c.type) === "Cash") {
      totalCashBalance += Number(c.openingBalance || 0);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          headerTitle="Financial Categories"
          headerDescription="Manage Income, Expense, and Cash categories for accounting and vouchers"
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full">
        {/* 1. Total Categories - Blue */}
        <MotionDiv delay={0.05}>
          <div className="p-3 rounded-xl border bg-blue-50/60 border-blue-300 hover:border-blue-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                Total Categories
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-blue-600">
                {totalCount}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-blue-100 text-blue-600">
              <FaLayerGroup size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 2. Active Categories - Emerald */}
        <MotionDiv delay={0.1}>
          <div className="p-3 rounded-xl border bg-emerald-50/60 border-emerald-300 hover:border-emerald-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                Active Categories
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-emerald-600">
                {activeCount}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-emerald-100 text-emerald-600">
              <FaCheckCircle size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 3. Inactive Categories - Rose */}
        <MotionDiv delay={0.15}>
          <div className="p-3 rounded-xl border bg-rose-50/60 border-rose-300 hover:border-rose-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                Inactive Categories
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-rose-600">
                {inactiveCount}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-rose-100 text-rose-600">
              <FaTimesCircle size={16} />
            </div>
          </div>
        </MotionDiv>

        {/* 4. Cash Opening Balance - Purple */}
        <MotionDiv delay={0.2}>
          <div className="p-3 rounded-xl border bg-purple-50/60 border-purple-300 hover:border-purple-400 flex items-center justify-between gap-2.5 transition-all shadow-xs h-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-black tracking-wider truncate">
                Cash Opening Balance
              </span>
              <span className="text-base sm:text-lg font-bold truncate mt-0.5 text-purple-600">
                ৳ {totalCashBalance.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="p-2 rounded-lg shrink-0 bg-purple-100 text-purple-600">
              <FaWallet size={16} />
            </div>
          </div>
        </MotionDiv>
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
