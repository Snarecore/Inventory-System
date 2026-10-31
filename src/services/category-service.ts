import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  CategoryItem,
  CategoryListResponse,
  CategoryActionResponse,
  InsertCategoryPayload,
  UpdateCategoryPayload,
  UpdateCategoryStatusPayload,
} from "@/types";

/**
 * Checks if a category is a system default 'admin' category (protected/locked from edits or status toggles).
 */
export const isCategoryAdmin = (item?: CategoryItem | null): boolean => {
  if (!item) return false;
  const user = String(item.userName || item.username || "").trim().toLowerCase();
  return user === "admin";
};

/**
 * Normalizes category type casing (e.g. "INCOME" -> "Income", "EXPENSE" -> "Expense")
 */
export const normalizeCategoryType = (rawType?: string): "Income" | "Expense" => {
  const upper = String(rawType || "").trim().toUpperCase();
  if (upper === "INCOME") return "Income";
  return "Expense";
};

export interface FetchCategoryListParams {
  type?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Fetches the list of financial categories and active sub-categories
 */
export const fetchCategoryList = async (
  params?: FetchCategoryListParams
): Promise<CategoryListResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.category.getCategoryListUrl;

  const body = {
    accessUser,
    type: params?.type || null,
    startDate: params?.startDate || "",
    endDate: params?.endDate || "",
  };

  const res: any = await postData<CategoryListResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to fetch categories");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "",
    categoryList: Array.isArray(res?.categoryList) ? res.categoryList : [],
    subCategoryList: Array.isArray(res?.subCategoryList) ? res.subCategoryList : [],
  };
};

/**
 * Inserts a new financial category (Income, Expense)
 */
export const insertCategory = async (
  payload: InsertCategoryPayload
): Promise<CategoryActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.category.insertCategoryUrl;

  const body = {
    accessUser,
    categoryName: payload.categoryName.trim(),
    categoryType: payload.categoryType,
    openingBalance: Number(payload.openingBalance || 0),
    transactionDate: payload.transactionDate || new Date().toISOString(),
  };

  const res: any = await postData<CategoryActionResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to insert category");
  }

  return res;
};

/**
 * Updates category name and type
 */
export const updateCategory = async (
  payload: UpdateCategoryPayload
): Promise<CategoryActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.category.updateCategoryUrl;

  const body = {
    accessUser,
    categoryId: payload.categoryId,
    categoryName: payload.categoryName.trim(),
    categoryType: payload.categoryType,
    openingBalance: Number(payload.openingBalance || 0),
    transactionDate: payload.transactionDate || "",
  };

  const res: any = await postData<CategoryActionResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to update category");
  }

  return res;
};

/**
 * Activates or deactivates a category (updates status only)
 */
export const updateCategoryStatus = async (
  payload: UpdateCategoryStatusPayload
): Promise<CategoryActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.category.updateCategoryStatusUrl;

  const body = {
    accessUser,
    categoryId: payload.categoryId,
    status: payload.status,
  };

  const res: any = await postData<CategoryActionResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to update category status");
  }

  return res;
};
