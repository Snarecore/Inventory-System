export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;
export const STORAGE_KEY_USER = "user";
export const STORAGE_KEY_TOKEN = "accessToken";
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
    return localStorage.getItem(STORAGE_KEY_TOKEN) || sessionStorage.getItem(STORAGE_KEY_TOKEN) || "";
}

export function setStoredToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
}

export function setStoredUser(user: User, customExpiryMs?: number): void {
    if (typeof window === "undefined") return;
    try {
        const safeUser = {
            id: user.id || (user as any)._id || "",
            name: user.name || "",
            email: user.email || "",
            role: user.role || "admin"
        };
        const userStr = JSON.stringify(safeUser);
        sessionStorage.setItem(STORAGE_KEY_USER, userStr);
        localStorage.setItem(STORAGE_KEY_USER, userStr);

        const currentExpiry = getSessionExpiryTime();
        const expiryTime = customExpiryMs || currentExpiry || (Date.now() + SESSION_DURATION_MS);
        
        sessionStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(expiryTime));
        localStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(expiryTime));

        recordUserActivity();
    } catch (e) {
        console.error("Failed to save user session:", e);
    }
}

export function removeStoredUser(): void {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.removeItem(STORAGE_KEY_USER);
        sessionStorage.removeItem(STORAGE_KEY_TOKEN);
        sessionStorage.removeItem(STORAGE_KEY_SESSION_EXPIRES_AT);
        sessionStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);

        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_SESSION_EXPIRES_AT);
        localStorage.removeItem(STORAGE_KEY_LAST_ACTIVITY);
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
        sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(now));
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVITY, String(now));

        const newExpiry = now + SESSION_DURATION_MS;
        sessionStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(newExpiry));
        localStorage.setItem(STORAGE_KEY_SESSION_EXPIRES_AT, String(newExpiry));
    } catch {}
}

export function isSessionValid(): boolean {
    const user = getStoredUser();
    if (!user) return false;

    const expiry = getSessionExpiryTime();
    if (!expiry) return true;

    return Date.now() < expiry;
}

export function isSessionExpired(): boolean {
    const user = getStoredUser();
    if (!user) return false;

    const expiry = getSessionExpiryTime();
    if (!expiry) return false;

    return Date.now() >= expiry;
}
