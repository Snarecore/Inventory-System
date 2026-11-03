import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";
import { buildAccessUser } from "@/utils/access-user";
import type {
  MfsUserItem,
  MfsUserListResponse,
  InsertMfsUserPayload,
  UpdateMfsUserPayload,
  UpdateMfsUserStatusPayload,
  MfsActionResponse,
} from "@/types";

export interface MfsMethodMeta {
  value: string;
  label: string;
  tint: string;
  soft: string;
  logo: string;
}

export const MFS_METHODS: MfsMethodMeta[] = [
  { value: "Bkash", label: "bKash", tint: "#e2136e", soft: "#fde7f1", logo: "/mfs/bkash.png" },
  { value: "Nagad", label: "Nagad", tint: "#ec1c24", soft: "#fee6e7", logo: "/mfs/nagad.png" },
  { value: "Rocket", label: "Rocket", tint: "#8c3494", soft: "#f6e9f7", logo: "/mfs/rocket.png" },
  { value: "Upay", label: "Upay", tint: "#f7941e", soft: "#fef1e0", logo: "/mfs/upay.png" },
];

const FALLBACK_METHOD: MfsMethodMeta = {
  value: "",
  label: "Unknown",
  tint: "#64748b",
  soft: "#eef2f7",
  logo: "",
};

export const methodMeta = (method?: string): MfsMethodMeta => {
  const key = String(method || "").trim().toLowerCase();
  if (!key) return FALLBACK_METHOD;
  if (key === "bikash") return MFS_METHODS[0];
  const found = MFS_METHODS.find((m) => m.value.toLowerCase() === key);
  return found || { ...FALLBACK_METHOD, value: method || "", label: method || "Unknown" };
};

export const PHONE_REGEX = /^01\d{9}$/;
export const sanitizeDigits = (val: string): string => String(val || "").replace(/\D/g, "");

export const describeMfsSaveError = (rawMsg?: string, phone?: string): string => {
  const msg = String(rawMsg || "").trim();
  if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("duplicate")) {
    return `MFS account with number "${phone}" already exists.`;
  }
  return msg || "Failed to save MFS account. Please verify the account information.";
};

/**
 * 1. GET MFS USER LIST
 */
export const fetchMfsUserList = async (): Promise<MfsUserListResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.mfs?.mfsUserListUrl;

  const res: any = await postData<MfsUserListResponse>({ url, body: { accessUser } });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to fetch MFS account list");
  }

  const rawList = Array.isArray(res?.mfsUsers)
    ? res.mfsUsers
    : Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res?.data?.mfsUsers)
    ? res.data.mfsUsers
    : [];

  const mfsUsers: MfsUserItem[] = rawList.map((item: any, idx: number) => {
    const id = Number(item.id ?? item.mfsId ?? idx + 1);
    const name = item.name || item.accountName || "";
    const phone = item.phoneNumber || item.phone || item.mobileNumber || "";
    const method = item.method || item.provider || item.mfsMethod || "Bkash";
    const mfsName = method ? `${method}${name && name !== "-" ? ` (${name})` : ""}` : name || "MFS";
    return {
      id,
      name: name || "-",
      phoneNumber: phone,
      method,
      mfsName,
      mfsPhone: phone,
      openingBalance: Number(item.openingBalance ?? 0),
      currentBalance: Number(item.currentBalance ?? item.balance ?? 0),
      status: item.status ? String(item.status).trim() : "Inactive",
    };
  });

  return {
    status: res?.status || "Success",
    msg: res?.msg || "",
    mfsUsers,
  };
};

/**
 * 2. INSERT MFS USER
 */
export const insertMfsUser = async (
  payload: InsertMfsUserPayload
): Promise<MfsActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.mfs.insertMfsUserUrl;

  const opening = Number(payload.openingBalance || 0);
  const current = payload.currentBalance !== undefined ? Number(payload.currentBalance) : opening;

  const body = {
    accessUser,
    name: payload.name.trim(),
    phoneNumber: sanitizeDigits(payload.phoneNumber).slice(0, 11),
    method: payload.method.trim(),
    openingBalance: opening,
    currentBalance: current,
    status: payload.status || "Active",
  };

  const res: any = await postData<MfsActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    const errorMsg = describeMfsSaveError(res?.msg || res?.message, payload.phoneNumber);
    throw new Error(errorMsg);
  }

  return res;
};

/**
 * 3. UPDATE MFS USER
 */
export const updateMfsUser = async (
  payload: UpdateMfsUserPayload
): Promise<MfsActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.mfs.updateMfsUserUrl;

  const opening = Number(payload.openingBalance || 0);
  const current = payload.currentBalance !== undefined ? Number(payload.currentBalance) : opening;

  const body = {
    accessUser,
    id: Number(payload.id),
    name: payload.name.trim(),
    phoneNumber: sanitizeDigits(payload.phoneNumber).slice(0, 11),
    method: payload.method.trim(),
    openingBalance: opening,
    currentBalance: current,
    status: payload.status || "Active",
  };

  const res: any = await postData<MfsActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    const errorMsg = describeMfsSaveError(res?.msg || res?.message, payload.phoneNumber);
    throw new Error(errorMsg);
  }

  return res;
};

/**
 * 4. UPDATE MFS USER STATUS
 */
export const updateMfsUserStatus = async (
  payload: UpdateMfsUserStatusPayload
): Promise<MfsActionResponse> => {
  const accessUser = buildAccessUser();
  const url = apiConfig.mfs.updateMfsUserStatusUrl;

  const body = {
    accessUser,
    id: Number(payload.id),
    status: payload.status,
  };

  const res: any = await postData<MfsActionResponse>({ url, body });

  if (res?.error || String(res?.status).toLowerCase() === "error") {
    throw new Error(res?.msg || res?.message || "Failed to update MFS account status");
  }

  return res;
};
