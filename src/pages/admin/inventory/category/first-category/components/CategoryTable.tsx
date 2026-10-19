import React from "react";
import apiConfig from "@/config/api.json";
import { firstCategoryQueryKey } from "@/config/query-key";
import { GenericCategoryTable, type GenericCategoryItem } from "../../components/GenericCategoryTable";

export interface FirstCategoryDataProps extends GenericCategoryItem {
  id: string;
  name: string;
  bannerImage?: string;
  mainCategoryId: string;
  mainCategoryName: string;
  status: boolean;
}

export interface FirstCategoryTableProps {
  dataList: FirstCategoryDataProps[];
  fetchData: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  pageCount: number;
  currentPageNumber: number;
  handlePagination: (paginationData: { selected: number }) => void;
  onEdit: (data?: FirstCategoryDataProps) => void;
}

const tableHeaders = [
  { key: "sl", label: "Sl" },
  { key: "bannerImage", label: "Banner Image" },
  { key: "name", label: "Name" },
  { key: "mainCategoryName", label: "Main Category" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
];

export const CategoryTable: React.FC<FirstCategoryTableProps> = (props) => {
  return (
    <GenericCategoryTable
      {...props}
      tableHeaders={tableHeaders}
      apiUrl={apiConfig.inventory.firstCategoryUrl}
      queryKey={firstCategoryQueryKey}
    />
  );
};

export default CategoryTable;
