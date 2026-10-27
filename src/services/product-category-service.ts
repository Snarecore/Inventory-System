import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  ProductCategoryListResponse,
  ProductCategoryActionResponse,
  InsertProductCategoryPayload,
  UpdateProductCategoryPayload,
  UpdateProductCategoryStatusPayload,
  DeleteProductCategoryPayload,
} from "@/types";

/**
 * Fetches the list of product categories (POST /get-product-categories-list)
 */
export const fetchProductCategoryList = async (): Promise<ProductCategoryListResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.productCategory.getProductCategoriesListUrl;

  const body = {
    accessUser,
  };

  const res: any = await postData<ProductCategoryListResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to fetch product categories");
  }

  return {
    status: res?.status || "Success",
    msg: res?.msg || "",
    categoryList: Array.isArray(res?.categoryList) ? res.categoryList : [],
  };
};

/**
 * Inserts a new product category (POST /insert-product-categories)
 */
export const insertProductCategory = async (
  payload: InsertProductCategoryPayload
): Promise<ProductCategoryActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.productCategory.insertProductCategoriesUrl;

  const body = {
    accessUser,
    name: payload.name.trim(),
    description: payload.description?.trim() || "",
    sortOrder: payload.sortOrder || 0,
    status: payload.status || "Active",
  };

  const res: any = await postData<ProductCategoryActionResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to insert product category");
  }

  return res;
};

/**
 * Updates an existing product category (POST /update-product-categories)
 */
export const updateProductCategory = async (
  payload: UpdateProductCategoryPayload
): Promise<ProductCategoryActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.productCategory.updateProductCategoriesUrl;

  const body = {
    accessUser,
    id: payload.id,
    name: payload.name.trim(),
    description: payload.description?.trim() || "",
    sortOrder: payload.sortOrder || 0,
    status: payload.status || "Active",
  };

  const res: any = await postData<ProductCategoryActionResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to update product category");
  }

  return res;
};

/**
 * Updates status of a product category (POST /update-product-categories-status)
 */
export const updateProductCategoryStatus = async (
  payload: UpdateProductCategoryStatusPayload
): Promise<ProductCategoryActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.productCategory.updateProductCategoriesStatusUrl;

  const body = {
    accessUser,
    id: payload.id,
    status: payload.status,
  };

  const res: any = await postData<ProductCategoryActionResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to update product category status");
  }

  return res;
};

/**
 * Deletes a product category (POST /delete-product-categories)
 */
export const deleteProductCategory = async (
  payload: DeleteProductCategoryPayload
): Promise<ProductCategoryActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.productCategory.deleteProductCategoriesUrl;

  const body = {
    accessUser,
    id: payload.id,
  };

  const res: any = await postData<ProductCategoryActionResponse>({ url, body });
  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to delete product category");
  }

  return res;
};
