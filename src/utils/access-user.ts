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
    const rawOrg = userInfo?.orgId ?? (userInfo as any)?.organizationId;
    const orgId = rawOrg !== undefined && rawOrg !== null && !isNaN(Number(rawOrg)) ? Number(rawOrg) : 1;
    const rawBranch = activeBranchId ?? userInfo?.branchId;
    const branchId = rawBranch !== undefined && rawBranch !== null && !isNaN(Number(rawBranch)) ? Number(rawBranch) : 1;

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
        orgId: (data as any).orgId !== undefined ? (data as any).orgId : access.orgId,
        branchId: (data as any).branchId !== undefined ? (data as any).branchId : access.branchId,
    };
}
