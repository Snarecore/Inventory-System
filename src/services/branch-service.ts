import { postData } from "./api-service";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import {
  normaliseBranch,
  getStoredBranches,
  setStoredBranches,
  toId,
} from "@/utils/branch-storage";
import type {
  BranchItem,
  BranchListResponse,
  BranchFormData,
} from "@/types/branch.types";

/**
 * 1. Fetch all branches for the organization using session accessUser.
 */
export async function getBranchList(): Promise<BranchItem[]> {
  const res = (await postData<BranchListResponse>({
    url: apiConfig.branch.getBranchListUrl,
    body: { accessUser: buildAccessUser() },
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to load branch list");
  }

  const rawList: any[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
    ? res
    : [];

  const branches = rawList.map(normaliseBranch).filter((b) => b.branchId !== 0);

  // Auto-sync active branches into localStorage on every fetch
  const active = branches.filter((b) => b.active);
  if (active.length > 0) {
    setStoredBranches(active);
  }

  return branches;
}

/**
 * 2. Sync active branches into user_info in localStorage.
 */
export async function syncStoredBranches(): Promise<{ branches: BranchItem[]; synced: boolean }> {
  try {
    const all = await getBranchList();
    const active = all.filter((b) => b.active);
    return { branches: active, synced: true };
  } catch (err) {
    console.warn("Failed to sync branches:", err);
    return { branches: getStoredBranches(), synced: false };
  }
}

/**
 * 3. Insert a new branch (clean DTO with session accessUser and copy options).
 */
export async function insertBranch(form: Partial<BranchFormData>): Promise<any> {
  const wantsCopy = Boolean(
    form.categoryCopy || form.productCopy || form.partyCopy || form.bankCopy || form.mfsCopy
  );

  const body = {
    accessUser: buildAccessUser(),
    name: form.name?.trim() || "",
    code: form.code?.trim() || "",
    address: form.address?.trim() || "",
    phone: form.phone?.trim() || "",
    currency: form.currency?.trim() || "BDT",
    openingBalance: Number(form.openingBalance || 0),
    openingDate: form.openingDate || "",
    ...(wantsCopy && {
      categoryCopy: Boolean(form.categoryCopy),
      productCopy: Boolean(form.productCopy),
      partyCopy: Boolean(form.partyCopy),
      bankCopy: Boolean(form.bankCopy),
      mfsCopy: Boolean(form.mfsCopy),
      copybranchId: toId(form.copybranchId),
    }),
  };

  const res = (await postData<any>({
    url: apiConfig.branch.insertBranchUrl,
    body,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to create branch");
  }

  return res;
}

/**
 * 4. Update an existing branch.
 */
export async function updateBranch(form: Partial<BranchItem> & { id: number; orgId?: number }): Promise<any> {
  const accessUser = buildAccessUser();
  const branchId = toId(form.id || form.branchId);
  if (!branchId) throw new Error("Branch ID is required for update");

  const orgId = toId(form.orgId ?? accessUser.orgId) || Number(accessUser.orgId);
  const wantsCopy = Boolean(
    form.categoryCopy || form.productCopy || form.partyCopy || form.bankCopy || form.mfsCopy
  );

  const body = {
    accessUser,
    id: branchId,
    orgId,
    name: form.name?.trim() || "",
    code: form.code?.trim() || "",
    address: form.address?.trim() || "",
    phone: form.phone?.trim() || "",
    currency: form.currency?.trim() || "BDT",
    openingBalance: Number(form.openingBalance || 0),
    openingDate: form.openingDate || "",
    active: form.active !== false,
    ...(wantsCopy && {
      categoryCopy: Boolean(form.categoryCopy),
      productCopy: Boolean(form.productCopy),
      partyCopy: Boolean(form.partyCopy),
      bankCopy: Boolean(form.bankCopy),
      mfsCopy: Boolean(form.mfsCopy),
      copybranchId: toId(form.copybranchId ?? (form as any).copyBranchId),
    }),
  };

  const res = (await postData<any>({
    url: apiConfig.branch.updateBranchUrl,
    body,
  })) as any;

  if (res?.error || res?.status === "Error") {
    throw new Error(res?.msg || res?.message || "Failed to update branch");
  }

  return res;
}

/**
 * 5. Toggle branch active / inactive state.
 */
export async function toggleBranchStatus(branch: BranchItem): Promise<any> {
  return updateBranch({
    ...branch,
    id: branch.branchId || branch.id,
    active: !branch.active,
  });
}
