import type { PartyItem } from "@/types";

export const isPartyActive = (p: any): boolean => {
  if (!p || typeof p !== "object") return false;

  // 1. Check deleted flag
  const isDel = String(p.isDeleted ?? p.is_deleted ?? p.isDelete ?? p.is_delete ?? "").trim().toUpperCase();
  if (
    isDel === "Y" ||
    isDel === "YES" ||
    isDel === "TRUE" ||
    isDel === "1" ||
    p.isDeleted === true ||
    p.is_deleted === true
  ) {
    return false;
  }

  // 2. Check status string
  const rawStatus = String(p.status ?? p.partyStatus ?? p.party_status ?? "active").trim().toLowerCase();
  if (
    rawStatus === "inactive" ||
    rawStatus === "false" ||
    rawStatus === "0" ||
    rawStatus === "disable" ||
    rawStatus === "disabled"
  ) {
    return false;
  }

  // 3. Check explicit boolean or numeric active flags
  if (p.isActive === false || p.is_active === false || p.is_active === 0 || p.is_active === "0") {
    return false;
  }

  const rawActiveStr = String(p.isActive ?? p.is_active ?? "").trim().toUpperCase();
  if (rawActiveStr === "N" || rawActiveStr === "NO" || rawActiveStr === "FALSE" || rawActiveStr === "0") {
    return false;
  }

  return true;
};
