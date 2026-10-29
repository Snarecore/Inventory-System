import React, { useState, useMemo } from "react";
import { Modal, Button } from "@/components/common";
import CategoryFormModal from "../category/components/CategoryFormModal";
import type { CategoryItem, CategoryType } from "@/types";
import { FaSearch, FaPlus, FaCheckCircle, FaTimes, FaTag } from "react-icons/fa";

interface CategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CategoryType;
  categories: CategoryItem[];
  selectedCategoryId?: number | null;
  onSelectCategory: (category: CategoryItem) => void;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  isOpen,
  onClose,
  type,
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        c.status.toLowerCase() === "active" &&
        c.type.toLowerCase() === type.toLowerCase()
    );
  }, [categories, type]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeCategories;
    return activeCategories.filter((c) =>
      c.categoryName.toLowerCase().includes(q)
    );
  }, [activeCategories, search]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Select ${type} Category`}
        width="w-full max-w-lg"
      >
        <div className="flex flex-col gap-3.5 py-1">
          {/* Top toolbar */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${type.toLowerCase()} categories...`}
                className="w-full pl-9 pr-9 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition-colors focus:ring-2 focus:ring-[var(--color-primary)]/20"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>
            <Button
              label="Add New"
              size="sm"
              icon={<FaPlus className="text-xs" />}
              onClick={() => setIsCreateOpen(true)}
              color="var(--color-primary)"
              hoverColor="var(--color-primary-hover)"
              className="!py-2 !px-3 shrink-0"
            />
          </div>

          {/* Categories List */}
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400 flex flex-col items-center gap-2">
                <FaTag className="text-2xl text-gray-300" />
                <p>
                  {search
                    ? `No ${type.toLowerCase()} category matches "${search}"`
                    : `No active ${type.toLowerCase()} categories found.`}
                </p>
                <Button
                  label={`Create "${search || type}" Category`}
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  color="var(--color-primary)"
                  hoverColor="var(--color-primary-hover)"
                  className="mt-1"
                />
              </div>
            ) : (
              filteredCategories.map((c) => {
                const isSelected = c.categoryId === selectedCategoryId;
                return (
                  <div
                    key={c.categoryId}
                    onClick={() => {
                      onSelectCategory(c);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-sky-50/70 ring-1 ring-[var(--color-primary)] shadow-xs"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[var(--color-primary)] text-white"
                            : type === "Expense"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        <FaTag className="text-xs" />
                      </div>
                      <div className="min-w-0 flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-black truncate">
                          {c.categoryName}
                        </span>
                        {isSelected && (
                          <FaCheckCircle className="text-[var(--color-primary)] text-xs shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Inline Create Category Modal */}
      {isCreateOpen && (
        <CategoryFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          existingCategories={categories}
        />
      )}
    </>
  );
};

export default CategoryPickerModal;
