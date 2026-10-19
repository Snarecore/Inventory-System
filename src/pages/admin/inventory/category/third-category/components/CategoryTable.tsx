import React from "react";
import apiConfig from "@/config/api.json";
import { thirdCategoryQueryKey } from "@/config/query-key";
import { GenericCategoryTable, type GenericCategoryItem } from "../../components/GenericCategoryTable";

export interface ThirdCategoryDataProps extends GenericCategoryItem {
  id: string;
  name: string;
  bannerImage?: string;
  mainCategoryId: string;
  mainCategoryName: string;
  firstCategoryId: string;
  firstCategoryName: string;
  secondCategoryId: string;
  secondCategoryName: string;
  status: boolean;
}

export interface ThirdCategoryTableProps {
  dataList: ThirdCategoryDataProps[];
  fetchData: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
  pageCount: number;
  currentPageNumber: number;
  handlePagination: (paginationData: { selected: number }) => void;
  onEdit: (data?: ThirdCategoryDataProps) => void;
}

const tableHeaders = [
  { key: "sl", label: "Sl" },
  { key: "bannerImage", label: "Banner Image" },
  { key: "name", label: "Name" },
  { key: "mainCategoryName", label: "Main Category" },
  { key: "firstCategoryName", label: "First Category" },
  { key: "secondCategoryName", label: "Second Category" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action" },
];

export const CategoryTable: React.FC<ThirdCategoryTableProps> = (props) => {
  return (
    <GenericCategoryTable
      {...props}
      tableHeaders={tableHeaders}
      apiUrl={apiConfig.inventory.thirdCategoryUrl}
      queryKey={thirdCategoryQueryKey}
    />
  );
};

export default CategoryTable;
