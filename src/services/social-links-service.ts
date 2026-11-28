import apiConfig from "@/config/api.json";
import { getData } from "@/services/api-service";

export async function fetchSocialLinks(page: number, limit: number): Promise<unknown> {
  return getData<unknown>({
    url: `${apiConfig.setting.socialLinksUrl}?page=${page}&limit=${limit}`,
  });
}
