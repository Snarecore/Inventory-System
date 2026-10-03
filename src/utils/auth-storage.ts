import { LoginSuccessResponse, UserInfo } from "@/features/auth/login/login.types";

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
export const STORAGE_KEY_USER = "user";
export const STORAGE_KEY_TOKEN = "accessToken";
export const STORAGE_KEY_RAW_TOKEN = "token";
export const STORAGE_KEY_USER_INFO = "user_info";
export const STORAGE_KEY_ACTIVE_BRANCH = "active_branch_id";
export const STORAGE_KEY_SESSION_EXPIRES_AT = "session_expires_at";
export const STORAGE_KEY_LAST_ACTIVITY = "session_last_activity";

export function isTokenExpired(token?: string | null, offsetSeconds = 60): boolean {
    if (!token) return true;
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return false;
        const payload = JSON.parse(atob(parts[1]));
        if (typeof payload.exp !== "number") return false;
        const expiryMs = payload.exp * 1000;
        return Date.now() >= (expiryMs - offsetSeconds * 1000);
    } catch {
        return false;
    }
}

export function getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem(STORAGE_KEY_USER);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return {
            id: parsed.id || parsed._id || "",
            name: parsed.name || "",
            email: parsed.email || "",
            role: parsed.role || "admin"
        } as User;
    } catch {
        return null;
    }
}

export function getStoredToken(): string {
    if (typeof window === "undefined") return "";
    return (
        localStorage.getItem(STORAGE_KEY_TOKEN) ||
        sessionStorage.getItem(STORAGE_KEY_TOKEN) ||
        localStorage.getItem(STORAGE_KEY_RAW_TOKEN) ||
        sessionStorage.getItem(STORAGE_KEY_RAW_TOKEN) ||
        ""
    );
}

export function setStoredToken(token: string, rememberMe = true): void {
    if (typeof window === "undefined") return;
    if (rememberMe) {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
        localStorage.setItem(STORAGE_KEY_RAW_TOKEN, token);
    } else {
        sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
        sessionStorage.setItem(STORAGE_KEY_RAW_TOKEN, token);
    }
}

export function getUserInfo(): UserInfo | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_USER_INFO) || sessionStorage.getItem(STORAGE_KEY_USER_INFO);
        if (!raw) return null;
        return JSON.parse(raw) as UserInfo;
    } catch {
        return null;
    }
}

export function setUserInfo(info: UserInfo, rememberMe = true): void {
    if (typeof window === "undefined") return;
    try {
        const str = JSON.stringify(info);
        if (rememberMe) {
            localStorage.setItem(STORAGE_KEY_USER_INFO, str);
        } else {
            sessionStorage.setItem(STORAGE_KEY_USER_INFO, str);
        }
    } catch (e) {
        console.error("Failed to save user_info:", e);
    }
}

export function getActiveBranchId(): number | null {
    if (typeof window === "undefined") return null;
    const branch = localStorage.getItem(STORAGE_KEY_ACTIVE_BRANCH) || sessionStorage.getItem(STORAGE_KEY_ACTIVE_BRANCH);
    return branch ? Number(branch) : null;
}

export function setActiveBranchId(branchId: number, rememberMe = true): void {
    if (typeof window === "undefined") return;
    if (rememberMe) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_BRANCH, String(branchId));
    } else {
        sessionStorage.setItem(STORAGE_KEY_ACTIVE_BRANCH, String(branchId));
    }
}

export function setStoredUser(user: User, customExpiryMs?: number, rememberMe = true): void {
    if (typeof window === "undefined") return;
    try {
        const safeUser = {
            id: user.id || (user as any)._id || "",
            name: user.name || "",
            email: user.email || "",
            role: user.role || "admin"
        };
        const userStr = JSON.stringify(safeUser);
        if (rememberMe) {
            localStorage.setItem(STORAGE_KEY_USER, userStr);
        } else {
            sessionStorage.setItem(STORAGE_KEY_USER, userStr);
        }

        const currentExpiry = getSessionExpiryTime();
        const expiryTime = customExpiryMs || currentExpiry || (Date.now() + SESSION_DURATION_MS);
        
        if (rememberMe) {
            localStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(expiryTime));
        } else {
            sessionStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(expiryTime));
        }

        recordUserActivity();
    } catch (e) {
        console.error("Failed to save user session:", e);
    }
}

/**
 * Normalizes and stores complete login session according to Cash Boi API standards
 */
export function saveLoginSession(data: LoginSuccessResponse, rememberMe = true): void {
    if (typeof window === "undefined" || !data) return;

    const token = data.token;
    if (token) {
        setStoredToken(token, rememberMe);
    }

    // Map organizationId -> orgId as strictly required by v4 API
    const orgId = data.organizationId ?? (data as any).orgId;
    const branchId = data.branchId ?? (data.branches && data.branches.length > 0 ? data.branches[0].branchId : undefined);

    const userInfo: UserInfo = {
        phone: data.phoneNumber,
        phoneNumber: data.phoneNumber,
        token: data.token,
        businessCode: data.businessCode,
        orgId: orgId,
        organizationId: orgId,
        branchId: branchId,
        branchType: data.branchType,
        branches: data.branches || [],
        fullName: data.fullName,
        businessName: data.businessName,
        businessAddress: data.businessAddress,
        businessType: data.businessType,
        profileUrl: data.profileUrl,
        userRole: data.userRole || "ADMIN",
        userId: data.userId,
        accountType: data.accountType,
        isInventory: data.isInventory,
    };

    setUserInfo(userInfo, rememberMe);

    if (branchId !== undefined) {
        setActiveBranchId(branchId, rememberMe);
    }

    const appUser: User = {
        id: String(data.userId || data.phoneNumber),
        name: data.fullName || data.businessName || data.phoneNumber,
        email: data.phoneNumber,
        role: data.userRole || "admin",
    };

    setStoredUser(appUser, undefined, rememberMe);

    // Also set fallback single keys for legacy interceptor support
    if (rememberMe) {
        if (data.phoneNumber) localStorage.setItem("phone", data.phoneNumber);
        if (data.businessCode) localStorage.setItem("businessCode", data.businessCode);
    } else {
        if (data.phoneNumber) sessionStorage.setItem("phone", data.phoneNumber);
        if (data.businessCode) sessionStorage.setItem("businessCode", data.businessCode);
    }
}

export function removeStoredUser(): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.removeItem(STORAGE_KEY_USER);
        sessionStorage.removeItem(STORAGE_KEY_TOKEN);
        sessionStorage.removeItem(STORAGE_KEY_RAW_TOKEN);
        sessionStorage.removeItem(STORAGE_KEY_USER_INFO);
        sessionStorage.removeItem(STORAGE_KEY_ACTIVE_BRANCH);
        sessionStorage.removeItem(STORAGE_KEY_SESSION_EXPIRES_AT);
        sessionStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
        sessionStorage.removeItem("phone");
        sessionStorage.removeItem("businessCode");

        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_RAW_TOKEN);
        localStorage.removeItem(STORAGE_KEY_USER_INFO);
        localStorage.removeItem(STORAGE_KEY_ACTIVE_BRANCH);
        localStorage.removeItem(STORAGE_KEY_SESSION_EXPIRES_AT);
        localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
        localStorage.removeItem("phone");
        localStorage.removeItem("businessCode");
    } catch (e) {
        console.error("Failed to clear user session:", e);
    }
}

export function getSessionExpiryTime(): number | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY_SESSION_EXPIRES_AT) || localStorage.getItem(STORAGE_KEY_SESSION_EXPIRES_AT);
        if (!raw) return null;
        const num = Number(raw);
        return isNaN(num) ? null : num;
    } catch {
        return null;
    }
}

let lastActivityRecorded = 0;
export function recordUserActivity(): void {
    if (typeof window === "undefined") return;
    const now = Date.now();
    if (now - lastActivityRecorded < 10000) return;
    lastActivityRecorded = now;

    try {
        const newExpiry = now + SESSION_DURATION_MS;
        sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(now));
        sessionStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(newExpiry));
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(now));
        localStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(newExpiry));
    } catch {}
}

export function isSessionValid(): boolean {
    const token = getStoredToken();
    if (!token) return false;

    const user = getStoredUser();
    if (!user) return false;

    const expiry = getSessionExpiryTime();
    if (!expiry) return true;

    return Date.now() < expiry;
}

export function isSessionExpired(): boolean {
    return !isSessionValid();
}
