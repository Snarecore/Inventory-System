import { useMemo } from "react";
import { usePartyListQuery } from "@/hooks/usePartyQueries";
import { isPartyActive } from "@/utils/party-utils";
import type { PartyItem } from "@/types";

export type TradePartyType = "CUSTOMER" | "SUPPLIER";

/**
 * Shared hook to fetch, filter and normalize Customers or Suppliers for Trade forms.
 */
export const useTradeParties = (partyType: TradePartyType) => {
  const { data: rawPartyData, isLoading, refetch } = usePartyListQuery();

  const partyList: PartyItem[] = useMemo(() => {
    if (!rawPartyData) return [];

    // Collect all candidate arrays across all possible response structures
    const candidateArrays: any[][] = [];

    const collectArrays = (obj: any, depth = 0) => {
      if (!obj || typeof obj !== "object" || depth > 3) return;
      if (Array.isArray(obj)) {
        candidateArrays.push(obj);
        return;
      }

      // get-party-info-list standard arrays
      if (Array.isArray(obj.partyInfoList)) candidateArrays.push(obj.partyInfoList);
      if (Array.isArray(obj.partyList)) candidateArrays.push(obj.partyList);
      if (Array.isArray(obj.partiesList)) candidateArrays.push(obj.partiesList);
      if (Array.isArray(obj.partyListDetails)) candidateArrays.push(obj.partyListDetails);
      if (Array.isArray(obj.customerList)) candidateArrays.push(obj.customerList);
      if (Array.isArray(obj.supplierList)) candidateArrays.push(obj.supplierList);
      if (Array.isArray(obj.data)) {
        candidateArrays.push(obj.data);
      } else if (obj.data && typeof obj.data === "object") {
        collectArrays(obj.data, depth + 1);
      }

      // Check any other array keys
      for (const k of Object.keys(obj)) {
        if (
          ![
            "partyInfoList",
            "partyList",
            "partiesList",
            "partyListDetails",
            "customerList",
            "supplierList",
            "data",
          ].includes(k) &&
          Array.isArray(obj[k])
        ) {
          candidateArrays.push(obj[k]);
        }
      }
    };

    collectArrays(rawPartyData);

    // Merge all candidate arrays and deduplicate by partyId / id / (name + phone)
    const seen = new Set<string>();
    const mergedList: any[] = [];

    for (const arr of candidateArrays) {
      for (const p of arr) {
        if (!p || typeof p !== "object") continue;
        const name = (p.name || p.partyName || p.customerName || p.supplierName || "").trim();
        const id = p.id ?? p.partyId;
        if (!name && !id) continue;

        const dedupeKey = String(id ?? `${name}_${p.phone || p.partyPhone || ""}`).trim().toLowerCase();
        if (dedupeKey && !seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          mergedList.push(p);
        }
      }
    }

    return mergedList
      .filter((p: any) => {
        if (!p || typeof p !== "object") return false;
        if (!isPartyActive(p)) return false;

        const type = String(p.type || p.partyType || "").trim().toUpperCase();
        if (partyType === "CUSTOMER") {
          return (
            type.includes("CUSTOMER") ||
            type.includes("BOTH") ||
            type.includes("CLIENT") ||
            type.includes("DEALER") ||
            (!type.includes("SUPPLIER") && !type.includes("VENDOR")) ||
            !type
          );
        } else {
          return (
            type.includes("SUPPLIER") ||
            type.includes("VENDOR") ||
            type.includes("BOTH")
          );
        }
      })
      .map((p: any) => {
        const id = p.id ?? p.partyId;
        const name = (p.name || p.partyName || p.customerName || "Unnamed").trim();
        const phone = (
          p.phone ||
          p.partyPhone ||
          p.customerPhone ||
          p.mobile ||
          p.contactNumber ||
          ""
        ).trim();
        const address = (
          p.address ||
          p.partyAddress ||
          p.customerAddress ||
          ""
        ).trim();
        const email = String(p.email || "").trim();
        const username = String(p.username || "").trim();
        const balance = p.openingBalance ?? p.balance ?? 0;

        return {
          ...p,
          id,
          partyId: id,
          name,
          partyName: name,
          phone,
          partyPhone: phone,
          email,
          username,
          address,
          partyAddress: address,
          balance,
          openingBalance: balance,
        };
      });
  }, [rawPartyData, partyType]);

  return { partyList, isLoading, refetch };
};

export default useTradeParties;
