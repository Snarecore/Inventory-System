import React from "react";
import apiConfig from "@/config/api.json";
import { mainCategoryQueryKey } from "@/config/query-key";
import { GenericCategoryTable, type GenericCategoryItem } from "../../components/GenericCategoryTable";

export interface CategoryDataProps extends GenericCategoryItem {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  bannerImage?: string;
  status: boolean;
  position?: number;
}

export interface CategoryTableProps {
  dataList: CategoryDataProps[];
  fetchData: () => void;
  pageCount: number;
  currentPageNumber: number;
  handlePagination: (paginationData: { selected: number }) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  onEdit: (data?: CategoryDataProps) => void;
}

const tableHeaders = [
  { key: "sl", label: "Sl" },
  { key: "image", label: "Image" },
  { key: "bannerImage", label: "Banner Image" },
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
];

export const CategoryTable: React.FC<CategoryTableProps> = (props) => {
  return (
    <GenericCategoryTable
      {...props}
      tableHeaders={tableHeaders}
      apiUrl={apiConfig.inventory.mainCategoryUrl}
      queryKey={mainCategoryQueryKey}
    />
  );
};

export default CategoryTable;
