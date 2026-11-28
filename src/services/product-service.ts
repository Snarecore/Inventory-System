import apiConfig from "@/config/api.json";
import { getData, postData, assertApiSuccess } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";

export async function fetchProductList(): Promise<unknown> {
  const response = await postData<unknown>({
    url: apiConfig.productList.productListUrl,
    body: { accessUser: buildAccessUser() },
  });

  return response;
}

export async function fetchProductCategories(): Promise<unknown> {
  return getData<unknown>({
    url: apiConfig.inventory.productCategoriesListUrl,
  });
}

export async function fetchProductUnits(): Promise<unknown> {
  return getData<unknown>({
    url: apiConfig.inventory.productUnitsListUrl,
  });
}

export async function saveProduct(payload: Record<string, unknown>): Promise<unknown> {
  const response = await postData<unknown>({
    url: apiConfig.inventory.insertProductUrl,
    body: payload,
  });

  return assertApiSuccess(response, "Failed to save product");
}
