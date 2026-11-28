import apiConfig from "@/config/api.json";
import {
  assertApiSuccess,
  deleteData,
  getData,
  patchData,
  patchFormData,
  postFormData,
} from "@/services/api-service";

export async function fetchHeroSliders(page: number, limit: number): Promise<unknown> {
  return getData<unknown>({
    url: `${apiConfig.setting.heroSliderUrl}?page=${page}&limit=${limit}`,
  });
}

function toHeroSliderFormData(payload: Record<string, unknown>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (value instanceof Blob) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}

export async function saveHeroSlider(
  payload: Record<string, unknown>,
  id?: string
): Promise<unknown> {
  const url = id
    ? `${apiConfig.setting.heroSliderUrl}/${id}`
    : apiConfig.setting.heroSliderUrl;
  const response = id
    ? await patchFormData<unknown>({
        url,
        body: toHeroSliderFormData(payload),
      })
    : await postFormData<unknown>({
        url,
        body: toHeroSliderFormData(payload),
      });

  return assertApiSuccess(response, "Failed to save hero slider");
}

export async function updateHeroSliderStatus(
  id: string,
  status: boolean
): Promise<unknown> {
  const response = await patchData<unknown>({
    url: `${apiConfig.setting.heroSliderUrl}/${id}`,
    body: { status },
  });

  return assertApiSuccess(response, "Failed to update hero slider status");
}

export async function deleteHeroSlider(id: string): Promise<unknown> {
  const response = await deleteData<unknown>({
    url: `${apiConfig.setting.heroSliderUrl}/${id}`,
  });

  return assertApiSuccess(response, "Failed to delete hero slider");
}
