export type ProductCategoryStatus = "Active" | "Inactive";

export interface ProductCategoryItem {
  id: number;
  masterId?: number | null;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
  status: ProductCategoryStatus | string;
}

export interface ProductCategoryListResponse {
  status: string;
  msg: string;
  categoryList: ProductCategoryItem[];
}

export interface InsertProductCategoryPayload {
  name: string;
  description?: string;
  sortOrder?: number;
  status?: ProductCategoryStatus;
}

export interface UpdateProductCategoryPayload {
  id: number;
  name: string;
  description?: string;
  sortOrder?: number;
  status?: ProductCategoryStatus;
}

export interface UpdateProductCategoryStatusPayload {
  id: number;
  status: ProductCategoryStatus;
}

export interface DeleteProductCategoryPayload {
  id: number;
}

export interface ProductCategoryActionResponse {
  status: string;
  msg: string;
  id?: number;
}
