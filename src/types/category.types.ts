export type CategoryType = "Income" | "Expense" | "Cash";
export type CategoryStatus = "Active" | "Inactive";

export interface CategoryItem {
  categoryId: number;
  categoryName: string;
  status: CategoryStatus | string;
  type: CategoryType | string;
  userName?: string;
  username?: string;
  openingBalance?: string | number;
}

export interface SubCategoryItem {
  subCategoryId: number;
  subCategoryName: string;
  status: string;
  userName?: string;
}

export interface CategoryListResponse {
  status: string;
  msg: string;
  categoryList: CategoryItem[];
  subCategoryList: SubCategoryItem[];
}

export interface InsertCategoryPayload {
  categoryName: string;
  categoryType: CategoryType;
  openingBalance?: number;
  transactionDate?: string;
}

export interface UpdateCategoryPayload {
  categoryId: number;
  categoryName: string;
  categoryType: CategoryType;
  openingBalance?: number;
  transactionDate?: string;
}

export interface UpdateCategoryStatusPayload {
  categoryId: number;
  status: CategoryStatus;
}

export interface CategoryActionResponse {
  status: string;
  msg: string;
  categoryId?: number;
}
