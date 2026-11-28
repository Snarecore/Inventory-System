import apiConfig from "@/config/api.json";
import { assertApiSuccess, postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";

export async function fetchPartyList(): Promise<unknown> {
  return postData<unknown>({
    url: apiConfig.party.partyListUrl,
    body: { accessUser: buildAccessUser() },
  });
}

export async function saveParty(
  payload: Record<string, unknown>,
  isEdit: boolean
): Promise<unknown> {
  const url = isEdit
    ? apiConfig.party.updatePartyUrl
    : apiConfig.party.insertPartyUrl;
  const response = await postData<unknown>({ url, body: payload });

  return assertApiSuccess(response, "Failed to save party information");
}

export async function updateParty(payload: Record<string, unknown>): Promise<unknown> {
  const response = await postData<unknown>({
    url: apiConfig.party.updatePartyUrl,
    body: payload,
  });

  return assertApiSuccess(response, "Failed to update party status");
}
