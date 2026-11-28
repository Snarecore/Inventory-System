import { GetDataProps, PostDataProps, PatchDataProps, PutDataProps, DeleteDataProps, FormDataProps } from "../models/api-models";
import { removeStoredUser, getStoredToken } from "../utils/auth-storage";

export interface ApiErrorResponse {
    error: true;
    message: string;
    status?: string;
    msg?: string;
}

export class ApiServiceError extends Error {
    readonly error = true;
    readonly status = "Error";
    readonly msg: string;

    constructor(message: string, readonly statusCode?: number, readonly data?: unknown) {
        super(message);
        this.name = "ApiServiceError";
        this.msg = message;
    }
}

const rawApiUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const apiUrl = rawApiUrl ? (rawApiUrl.endsWith("/") ? rawApiUrl : `${rawApiUrl}/`) : "";

const getResponseMessage = (data: unknown, fallback: string): string => {
    const response =
        data && typeof data === "object"
            ? (data as {
                  msg?: string | string[];
                  message?: string | string[];
                  data?: { message?: string | string[] };
              })
            : {};
    const rawMessage = response.msg || response.message || response.data?.message || fallback;
    return Array.isArray(rawMessage) ? rawMessage.join(", ") : String(rawMessage);
};

export function assertApiSuccess<T>(response: unknown, fallback: string): T {
    if (!response || typeof response !== "object") {
        throw new ApiServiceError(fallback);
    }

    const result = response as {
        error?: boolean;
        status?: string | number;
        statusCode?: number;
        msg?: string;
        message?: string;
        data?: unknown;
        productsList?: unknown;
    };
    const status = String(result.status ?? "").toLowerCase();
    const isFailure =
        result.error === true ||
        status === "error" ||
        status === "failed" ||
        status === "fail" ||
        (typeof result.statusCode === "number" && result.statusCode >= 400);

    if (isFailure) {
        throw new ApiServiceError(getResponseMessage(result, fallback), result.statusCode);
    }

    const isSuccess =
        status === "success" ||
        result.statusCode === 200 ||
        result.statusCode === 201 ||
        result.status === 200 ||
        result.status === 201 ||
        result.error === false ||
        result.data !== undefined ||
        result.productsList !== undefined;

    if (!isSuccess) {
        throw new ApiServiceError(getResponseMessage(result, fallback), result.statusCode);
    }

    return response as T;
}

/**
 * Core HTTP client for Cash Boi v4 API
 */
async function apiRequest<T>(
    url: string,
    options: RequestInit,
    baseUrl?: string
): Promise<T | ApiErrorResponse> {
    try {
        const base = baseUrl ? (baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`) : apiUrl;
        const targetUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `${base}${url.replace(/^\/+/, "")}`;
        const response = await fetch(targetUrl, options);

        // 401 Unauthorized: Session expired, clear storage and redirect
        if (response.status === 401 && !url.includes("authorization-check") && !url.includes("user-login")) {
            removeStoredUser();
            if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
            throw new ApiServiceError("Session expired. Please login again.", response.status);
        }

        if (!response.ok) {
            let errData: unknown;
            try {
                errData = await response.json();
            } catch {
                errData = undefined;
            }

            if (response.status === 413) {
                throw new ApiServiceError(
                    "Payload size is too large. Please upload smaller files.",
                    response.status,
                    errData
                );
            }
            if (response.status === 429) {
                throw new ApiServiceError(
                    getResponseMessage(errData, "Too many requests. Please wait a moment."),
                    response.status,
                    errData
                );
            }

            throw new ApiServiceError(
                getResponseMessage(errData, `Failed (${response.status}): ${response.statusText}`),
                response.status,
                errData
            );
        }

        return await response.json();
    } catch (error: unknown) {
        if (error instanceof ApiServiceError) {
            throw error;
        }

        const message =
            error instanceof Error && error.message
                ? error.message
                : "Network error. Please check your internet connection.";
        throw new ApiServiceError(message, undefined, error);
    }
}

export async function getData<T>({ url, token, baseUrl, headers: customHeaders }: GetDataProps): Promise<T | ApiErrorResponse> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "GET", cache: "no-cache" }, baseUrl);
}

export async function postData<T>({ url, token, body, baseUrl, headers: customHeaders }: PostDataProps): Promise<T | ApiErrorResponse> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "POST", body: JSON.stringify(body) }, baseUrl);
}

export async function patchData<T>({ url, token, body, baseUrl, headers: customHeaders }: PatchDataProps): Promise<T | ApiErrorResponse> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "PATCH", body: JSON.stringify(body) }, baseUrl);
}

export async function putData<T>({ url, token, body, baseUrl, headers: customHeaders }: PutDataProps): Promise<T | ApiErrorResponse> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "PUT", body: JSON.stringify(body) }, baseUrl);
}

export async function deleteData<T>({ url, token, baseUrl, headers: customHeaders }: DeleteDataProps): Promise<T | ApiErrorResponse> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "DELETE" }, baseUrl);
}

export async function postFormData<T>({ url, token, body, baseUrl, headers: customHeaders }: FormDataProps): Promise<T | ApiErrorResponse> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "POST", body }, baseUrl);
}

export async function patchFormData<T>({ url, token, body, baseUrl, headers: customHeaders }: FormDataProps): Promise<T | ApiErrorResponse> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "PATCH", body }, baseUrl);
}
