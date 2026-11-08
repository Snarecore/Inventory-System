import { getUserInfo, setUserInfo, getActiveBranchId, setActiveBranchId } from "./auth-storage";
import type { BranchItem } from "@/types/branch.types";

export const STORAGE_KEY_BRANCH_CHOSEN = "branch_choice_made";

// Keys that are branch-specific and must be cleared when switching branches
export const BRANCH_SCOPED_KEYS = [
  "sales_draft",
  "purchase_draft",
  "last_invoice",
  "last_purchase_invoice",
];

export function toId(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normaliseBranch(b: any = {}): BranchItem {
  const branchId = toId(b.id ?? b.branchId) || 0;
  return {
    id: branchId,
    branchId: branchId,
    orgId: toId(b.orgId ?? b.organizationId) || 0,
    name: b.name || b.branchName || "",
    code: b.code || b.branchCode || "",
    address: b.address || "",
    phone: b.phone || "",
    currency: b.currency || "BDT",
    openingBalance: Number(b.openingBalance ?? 0),
    openingDate: b.openingDate ? String(b.openingDate).slice(0, 10) : "",
    active: b.active !== false,
    categoryCopy: Boolean(b.categoryCopy),
    productCopy: Boolean(b.productCopy),
    partyCopy: Boolean(b.partyCopy),
    bankCopy: Boolean(b.bankCopy),
    mfsCopy: Boolean(b.mfsCopy),
    copyBranchId: toId(b.copyBranchId ?? b.copybranchId),
    primary: Boolean(b.primary),
  };
}

export function getStoredBranches(): BranchItem[] {
  if (typeof window === "undefined") return [];
  const userInfo = getUserInfo();
  const list = userInfo?.branches;
  if (!Array.isArray(list)) return [];
  return list
    .map(normaliseBranch)
    .filter((b) => b.branchId !== 0);
}

export function setStoredBranches(branches: BranchItem[]): void {
  if (typeof window === "undefined") return;
  const userInfo = getUserInfo();
  if (!userInfo) return;
  setUserInfo({
    ...userInfo,
    branches,
  });
}

export function getDefaultBranchId(): number | null {
  const userInfo = getUserInfo();
  return toId(userInfo?.branchId);
}

export function isMultiBranch(): boolean {
  const userInfo = getUserInfo();
  const branches = getStoredBranches();
  const branchType = String(userInfo?.branchType || "").toUpperCase();
  return branchType === "MULTIPLE" || branches.length > 1;
}

export function isBranchChoicePending(): boolean {
  if (typeof window === "undefined") return false;
  if (!isMultiBranch()) return false;
  const made = localStorage.getItem(STORAGE_KEY_BRANCH_CHOSEN) || sessionStorage.getItem(STORAGE_KEY_BRANCH_CHOSEN);
  return made !== "1";
}

export function markBranchChosen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_BRANCH_CHOSEN, "1");
  sessionStorage.setItem(STORAGE_KEY_BRANCH_CHOSEN, "1");
}

export function clearBranchChoice(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_BRANCH_CHOSEN);
  sessionStorage.removeItem(STORAGE_KEY_BRANCH_CHOSEN);
}

export function clearAllBranchScoped(): void {
  if (typeof window === "undefined") return;
  BRANCH_SCOPED_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function switchBranch(branchId: number): void {
  if (typeof window === "undefined") return;
  setActiveBranchId(branchId);
  markBranchChosen();
  clearAllBranchScoped();
  
  // Reload and navigate to admin root so all memory caches and branch data reset cleanly
  window.location.assign("/admin");
}

export function getActiveBranch(): BranchItem | null {
  const activeId = getActiveBranchId();
  if (activeId === null) return null;
  const branches = getStoredBranches();
  return branches.find((b) => b.branchId === activeId) || null;
}
