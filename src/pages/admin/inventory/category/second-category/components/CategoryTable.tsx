import React from "react";
import apiConfig from "@/config/api.json";
import { secondCategoryQueryKey } from "@/config/query-key";
import { GenericCategoryTable, type GenericCategoryItem } from "../../components/GenericCategoryTable";

export interface SecondCategoryDataProps extends GenericCategoryItem {
  id: string;
  name: string;
  bannerImage?: string;
  mainCategoryId: string;
  mainCategoryName: string;
  firstCategoryId: string;
  firstCategoryName: string;
  status: boolean;
}

export interface SecondCategoryTableProps {
  dataList: SecondCategoryDataProps[];
  fetchData: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  pageCount: number;
  currentPageNumber: number;
  handlePagination: (paginationData: { selected: number }) => void;
  onEdit: (data?: SecondCategoryDataProps) => void;
}

const tableHeaders = [
  { key: "sl", label: "Sl" },
  { key: "bannerImage", label: "Banner Image" },
  { key: "name", label: "Name" },
  { key: "mainCategoryName", label: "Main Category" },
  { key: "firstCategoryName", label: "First Category" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
];

export const CategoryTable: React.FC<SecondCategoryTableProps> = (props) => {
  return (
    <GenericCategoryTable
      {...props}
      tableHeaders={tableHeaders}
      apiUrl={apiConfig.inventory.secondCategoryUrl}
      queryKey={secondCategoryQueryKey}
    />
  );
};

export default CategoryTable;
