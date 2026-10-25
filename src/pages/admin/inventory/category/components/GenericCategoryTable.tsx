import React, { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import DeleteModal from "@/components/modal/DeleteModal";
import TableSkeleton from "@/components/skeleton/TableSkeleton";
import EmptyState from "@/components/empty-state/EmptyState";
import Pagination from "@/components/pagination";
import {
  TableContainer,
  TableScroll,
  Table,
  TableHead,
  TableTh,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/common";
import { useAPI } from "@/hooks/useApi";

export interface GenericCategoryItem {
  id: string;
  name: string;
  status: boolean;
  image?: string;
  bannerImage?: string;
  mainCategoryName?: string;
  firstCategoryName?: string;
  secondCategoryName?: string;
  [key: string]: any;
}

export interface GenericCategoryTableProps<T extends GenericCategoryItem> {
  dataList: T[];
  tableHeaders: { key: string; label: string }[];
  apiUrl: string;
  queryKey: string;
  pageCount: number;
  currentPageNumber: number;
  handlePagination: (paginationData: { selected: number }) => void;
  isLoading?: boolean;
  onEdit: (data?: T) => void;
  fetchData: () => void;
  renderCustomCell?: (key: string, item: T) => React.ReactNode | null;
}

export const GenericCategoryTable = <T extends GenericCategoryItem>({
  dataList,
  tableHeaders,
  apiUrl,
  queryKey,
  pageCount,
  currentPageNumber,
  handlePagination,
  isLoading,
  onEdit,
  fetchData,
  renderCustomCell,
}: GenericCategoryTableProps<T>) => {
  const { handleDeleteAPI, handleApiMutation, patchMutation } = useAPI();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<T | null>(null);

  const openDeleteModal = (category: T) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setSelectedCategory(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    const response = await handleDeleteAPI({
      url: `${apiUrl}/${selectedCategory.id}`,
      invalidateQueryKey: [queryKey],
      showSuccessMessage: true,
    });
    if (response) {
      fetchData();
      closeDeleteModal();
    }
  };

  const handleToggleStatus = async (category: T) => {
    try {
      const newStatus = !Boolean(category.status);
      const result = await handleApiMutation({
        mutation: patchMutation,
        url: `${apiUrl}/${category.id}`,
        body: { status: newStatus },
        invalidateQueryKey: [queryKey],
        showSuccessMessage: true,
        showErrorMessage: true,
      });

      if (result?.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to toggle category status:", error);
    }
  };

  if (isLoading && (!dataList || dataList.length === 0)) {
    return <TableSkeleton columnCount={tableHeaders.length} rowCount={8} />;
  }

  const renderCellContent = (key: string, data: T, index: number) => {
    if (renderCustomCell) {
      const custom = renderCustomCell(key, data);
      if (custom !== null && custom !== undefined) return custom;
    }

    switch (key) {
      case "sl":
        return (currentPageNumber - 1) * 10 + index + 1;

      case "image":
        return data.image ? (
          <img
            src={data.image}
            alt="category"
            className="w-10 h-10 object-cover rounded-md p-0.5 border border-gray-100 hover:scale-105 transition-all ease-in-out duration-300"
          />
        ) : (
          <span className="text-xs text-gray-400">No Image</span>
        );

      case "bannerImage":
        return data.bannerImage ? (
          <img
            src={data.bannerImage}
            alt="banner"
            className="w-20 h-9 object-cover rounded-md shadow-xs border border-gray-200 hover:scale-105 transition-all ease-in-out duration-300"
          />
        ) : (
          <span className="text-xs text-gray-400">No Banner</span>
        );

      case "name":
        return <span className="font-medium text-black">{data.name}</span>;

      case "mainCategoryName":
        return <span className="text-gray-700">{data.mainCategoryName || "-"}</span>;

      case "firstCategoryName":
        return <span className="text-gray-700">{data.firstCategoryName || "-"}</span>;

      case "secondCategoryName":
        return <span className="text-gray-700">{data.secondCategoryName || "-"}</span>;

      case "status": {
        const isActive = Boolean(data.status);
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => handleToggleStatus(data)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[var(--color-primary)] relative transition-all duration-200">
                <div
                  className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 ${
                    isActive ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </div>
            </label>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
        );
      }

      case "action":
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(data)}
              className="p-1 rounded text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
              title="Edit"
            >
              <FaEdit size={14} />
            </button>
            <button
              type="button"
              onClick={() => openDeleteModal(data)}
              className="p-1 rounded text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
              title="Delete"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        );

      default:
        return String(data[key] ?? "-");
    }
  };

  return (
    <TableContainer>
      <TableScroll>
        <Table minWidth={800}>
          <TableHead>
            {tableHeaders.map(({ key, label }) => (
              <TableTh
                key={key}
                align={key === "sl" || key === "action" ? "center" : "left"}
                className={key === "sl" || key === "action" ? "w-16" : ""}
              >
                {label}
              </TableTh>
            ))}
          </TableHead>
          <TableBody>
            {dataList && dataList.length > 0 ? (
              dataList.map((data, index) => (
                <TableRow key={data.id || index}>
                  {tableHeaders.map(({ key }) => (
                    <TableCell
                      key={key}
                      align={key === "sl" || key === "action" ? "center" : "left"}
                    >
                      {renderCellContent(key, data, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <tr>
                <td colSpan={tableHeaders.length} className="py-12 text-center italic">
                  <EmptyState
                    title="No category available"
                    description="Click below to add your first category!"
                    buttonText="+ Add New Category"
                    onButtonClick={() => onEdit()}
                  />
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
      </TableScroll>

      {selectedCategory && (
        <DeleteModal
          isOpen={isDeleteModalOpen}
          title="Delete Category?"
          message={`Are you sure you want to delete "${selectedCategory.name}"?`}
          onClose={closeDeleteModal}
          onDelete={handleDelete}
        />
      )}

      {pageCount > 1 && (
        <div className="p-2.5 sm:p-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <Pagination
            pageCount={pageCount}
            currentPageNumber={currentPageNumber}
            handlePagination={handlePagination}
          />
        </div>
      )}
    </TableContainer>
  );
};

export default GenericCategoryTable;
