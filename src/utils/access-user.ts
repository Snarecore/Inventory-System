import { getUserInfo, getStoredToken, getStoredUser, getActiveBranchId, getBusinessCode } from "./auth-storage";

export interface AccessUser {
    phone: string;
    token: string;
    businessCode?: string;
    orgId: number | string;
    branchId: number | string;
}

export function buildAccessUser(): AccessUser {
    const userInfo = getUserInfo();
    const token = getStoredToken() || userInfo?.token || "";
    const user = getStoredUser();
    const activeBranchId = getActiveBranchId();

    const phone = userInfo?.phone || userInfo?.phoneNumber || user?.id || user?.email || "";
    const businessCode = getBusinessCode();
    const orgId = userInfo?.orgId || (userInfo as any)?.organizationId || 1;
    const branchId = activeBranchId || userInfo?.branchId || 1;

    return {
        phone,
        token,
        businessCode,
        orgId,
        branchId,
    };
}

export function withBranchScope<T extends Record<string, unknown>>(data: T): T & { orgId: number | string; branchId: number | string } {
    const access = buildAccessUser();
    return {
        ...data,
        orgId: data.orgId !== undefined ? data.orgId : access.orgId,
        branchId: data.branchId !== undefined ? data.branchId : access.branchId,
    };
}
