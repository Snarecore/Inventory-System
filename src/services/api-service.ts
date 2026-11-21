import { GetDataProps, PostDataProps, PatchDataProps, PutDataProps, DeleteDataProps, FormDataProps } from "../models/api-models";
import { removeStoredUser, getStoredToken } from "../utils/auth-storage";

const rawApiUrl = (import.meta.env.VITE_API_BASE_URL || "https://itouch.stepserp.com/cash-boi-test/api") as string;
const apiUrl = rawApiUrl.endsWith("/") ? rawApiUrl : `${rawApiUrl}/`;

/**
 * Core HTTP client for Cash Boi v4 API
 */
async function apiRequest<T>(
    url: string,
    options: RequestInit,
    baseUrl?: string
): Promise<T | { error: boolean; message: string; status?: string; msg?: string }> {
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
            return { error: true, status: "Error", msg: "Session expired. Please login again.", message: "Session expired." };
        }

        if (!response.ok) {
            console.error(`Error: ${response.status} - ${response.statusText}`);
            const errData = await response.json().catch(() => null);

            if (response.status === 413) {
                return {
                    error: true,
                    status: "Error",
                    msg: "Payload size is too large. Please upload smaller files.",
                    message: "Payload size is too large."
                };
            }
            if (response.status === 429) {
                return {
                    error: true,
                    status: "Error",
                    msg: errData?.msg || errData?.message || "Too many requests. Please wait a moment.",
                    message: "Too many requests."
                };
            }

            const rawMsg = errData?.msg || errData?.message || errData?.data?.message || `Failed (${response.status}): ${response.statusText}`;
            const formattedMsg = Array.isArray(rawMsg) ? rawMsg.join(", ") : String(rawMsg);
            return { error: true, status: "Error", msg: formattedMsg, message: formattedMsg };
        }

        return await response.json();
    } catch (error: any) {
        console.error("Fetch error: ", error);
        return { 
            error: true, 
            status: "Error", 
            msg: error?.message || "Network error. Please check your internet connection.", 
            message: error?.message || "An error occurred while making the request." 
        };
    }
}

export async function getData<T>({ url, token, baseUrl, headers: customHeaders }: GetDataProps): Promise<T | { error: boolean; message: string; status?: string; msg?: string }> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "GET", cache: "no-cache" }, baseUrl);
}

export async function postData<T>({ url, token, body, baseUrl, headers: customHeaders }: PostDataProps): Promise<T | { error: boolean; message: string; status?: string; msg?: string }> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "POST", body: JSON.stringify(body) }, baseUrl);
}

export async function patchData<T>({ url, token, body, baseUrl, headers: customHeaders }: PatchDataProps): Promise<T | { error: boolean; message: string; status?: string; msg?: string }> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "PATCH", body: JSON.stringify(body) }, baseUrl);
}

export async function putData<T>({ url, token, body, baseUrl, headers: customHeaders }: PutDataProps): Promise<T | { error: boolean; message: string; status?: string; msg?: string }> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "PUT", body: JSON.stringify(body) }, baseUrl);
}

export async function deleteData<T>({ url, token, baseUrl, headers: customHeaders }: DeleteDataProps): Promise<T | { error: boolean; message: string; status?: string; msg?: string }> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "DELETE" }, baseUrl);
}

export async function postFormData<T>({ url, token, body, baseUrl, headers: customHeaders }: FormDataProps): Promise<T | { error: boolean; message: string; status?: string; msg?: string }> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "POST", body }, baseUrl);
}

export async function patchFormData<T>({ url, token, body, baseUrl, headers: customHeaders }: FormDataProps): Promise<T | { error: boolean; message: string; status?: string; msg?: string }> {
    const activeToken = token !== undefined ? token : getStoredToken();
    const headers: Record<string, string> = { ...(customHeaders || {}) };
    if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

    return apiRequest<T>(url, { headers, method: "PATCH", body }, baseUrl);
}
