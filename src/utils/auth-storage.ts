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
export const STORAGE_KEY_USER_INFO = "user_info";
export const STORAGE_KEY_ACTIVE_BRANCH = "active_branch_id";
export const STORAGE_KEY_SESSION_EXPIRES_AT = "session_expires_at";
export const STORAGE_KEY_LAST_ACTIVITY = "session_last_activity";

export function getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem(STORAGE_KEY_USER);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return {
            id: parsed.id || "",
            name: parsed.name || "",
            email: parsed.email || "",
            role: parsed.role || "admin"
        };
    } catch {
        return null;
    }
}

export function getStoredToken(): string {
    if (typeof window === "undefined") return "";
    const directToken =
        localStorage.getItem(STORAGE_KEY_TOKEN) ||
        sessionStorage.getItem(STORAGE_KEY_TOKEN);
    if (directToken) return directToken;
    const userInfo = getUserInfo();
    if (userInfo?.token) return userInfo.token;
    return "";
}

export function setStoredToken(token: string, rememberMe = true): void {
    if (typeof window === "undefined") return;
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEY_TOKEN, token);
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
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEY_USER_INFO, JSON.stringify(info));
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
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEY_ACTIVE_BRANCH, String(branchId));
}

export function getBusinessCode(): string {
    if (typeof window === "undefined") return "";
    const userInfo = getUserInfo();
    const code = userInfo?.businessCode || (userInfo as any)?.business_code;
    return code ? String(code).trim() : "";
}

export function setBusinessCode(code: string, rememberMe = true): void {
    if (typeof window === "undefined") return;
    const userInfo = getUserInfo();
    if (userInfo) {
        setUserInfo({ ...userInfo, businessCode: code }, rememberMe);
    }
}

export function setStoredUser(user: User, customExpiryMs?: number, rememberMe = true): void {
    if (typeof window === "undefined") return;
    try {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEY_USER, JSON.stringify(user));

        const expiryTime = customExpiryMs || (Date.now() + SESSION_DURATION_MS);
        storage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(expiryTime));

        recordUserActivity();
    } catch (e) {
        console.error("Failed to save user session:", e);
    }
}

// Saves essential login session data

export function saveLoginSession(data: LoginSuccessResponse, rememberMe = true): void {
    if (typeof window === "undefined" || !data) return;

    if (data.token) {
        setStoredToken(data.token, rememberMe);
    }

    const rawOrg =
        data.organizationId ??
        (data as any)?.orgId ??
        (data as any)?.organization_id ??
        (Array.isArray(data.branches) && data.branches.length > 0
            ? data.branches[0].orgId ?? data.branches[0].organizationId
            : undefined);
    const orgId = rawOrg !== undefined && rawOrg !== null && !isNaN(Number(rawOrg)) ? Number(rawOrg) : undefined;
    const branchId = data.branchId;
    const branchType = data.branchType || (data as any)?.branch_type || "";
    const rawBranches = Array.isArray(data.branches) ? data.branches : [];
    const branches = rawBranches.map((b) => ({
        ...b,
        orgId: b.orgId || b.organizationId || orgId || 0,
    }));
    const businessCode = String(
        data.businessCode || data.business_code || (data as any)?.businessCode || (data as any)?.business_code || ""
    ).trim();

    const isEmployee =
        data.msg === "Employee account found" ||
        String(data.userRole || "").toUpperCase() === "EMPLOYEE" ||
        String(data.userRole || "").toUpperCase() === "STAFF" ||
        String(data.userRole || "").toUpperCase() === "MANAGER" ||
        (String(data.userRole || "").toUpperCase() !== "ADMIN" &&
            String(data.userRole || "").toUpperCase() !== "OWNER" &&
            Boolean((data as any)?.userId));

    const numericUserId = (data as any)?.userId ? Number((data as any).userId) : undefined;
    const employeeId = isEmployee && numericUserId ? numericUserId : undefined;

    const userInfo: UserInfo = {
        phone: data.phoneNumber,
        phoneNumber: data.phoneNumber,
        token: data.token,
        fullName: data.fullName,
        businessName: data.businessName,
        businessCode: businessCode,
        userRole: data.userRole || (isEmployee ? "EMPLOYEE" : "ADMIN"),
        accountType: data.accountType || (data as any)?.account_type || "",
        userId: numericUserId,
        employeeId: employeeId,
        isEmployee: isEmployee,
        orgId: orgId,
        organizationId: orgId,
        branchId: branchId,
        branchType: branchType,
        branches: branches,
    };

    setUserInfo(userInfo, rememberMe);

    const storage = rememberMe ? localStorage : sessionStorage;

    const effectiveBranchId =
        branchId !== undefined && branchId !== null && Number(branchId) > 0
            ? Number(branchId)
            : branches.length > 0
            ? Number(branches[0].branchId || branches[0].id)
            : undefined;

    if (effectiveBranchId !== undefined && !isNaN(effectiveBranchId) && effectiveBranchId > 0) {
        setActiveBranchId(effectiveBranchId, rememberMe);
    }

    // Reset branch_choice_made on fresh login so the user selects their active branch in the modal first
    sessionStorage.removeItem("branch_choice_made");
    localStorage.removeItem("branch_choice_made");

    const appUser: User = {
        id: String(numericUserId || data.phoneNumber),
        name: data.fullName || data.businessName || data.phoneNumber,
        email: data.phoneNumber && data.phoneNumber.includes("@") ? data.phoneNumber : "",
        role: data.userRole || (isEmployee ? "employee" : "admin"),
    };

    setStoredUser(appUser, undefined, rememberMe);
}

export function removeStoredUser(): void {
    if (typeof window === "undefined") return;
    try {
        const keys = [
            STORAGE_KEY_USER,
            STORAGE_KEY_TOKEN,
            STORAGE_KEY_USER_INFO,
            STORAGE_KEY_ACTIVE_BRANCH,
            STORAGE_KEY_SESSION_EXPIRES_AT,
            STORAGE_KEY_LAST_ACTIVITY,
            "branch_choice_made",
            "token",
            "phone",
            "businessCode",
        ];

        keys.forEach((k) => {
            sessionStorage.removeItem(k);
            localStorage.removeItem(k);
        });
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
