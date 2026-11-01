import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { partyListQueryKey } from "@/config/query-key";
import apiConfig from "@/config/api.json";
import { buildAccessUser } from "@/utils/access-user";
import { postData } from "@/services/api-service";
import { isPartyActive } from "@/utils/party-utils";
import type { PartyItem } from "@/types";

export type TradePartyType = "CUSTOMER" | "SUPPLIER";

/**
 * Shared hook to fetch, filter and normalize Customers or Suppliers for Trade forms.
 */
export const useTradeParties = (partyType: TradePartyType) => {
  const partyListUrl = apiConfig.party.partyListUrl;

  const { data: rawPartyData, isLoading, refetch } = useQuery({
    queryKey: [partyListQueryKey, partyType],
    queryFn: async () => {
      try {
        const res: any = await postData({
          url: partyListUrl,
          body: { accessUser: buildAccessUser() },
        });
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const partyList: PartyItem[] = useMemo(() => {
    if (!rawPartyData) return [];
    const list: any[] = Array.isArray(rawPartyData)
      ? rawPartyData
      : rawPartyData.partyList || rawPartyData.data || [];

    return list
      .filter((p: any) => {
        if (!isPartyActive(p)) return false;
        const type = String(p.type || p.partyType || "").toUpperCase();
        return partyType === "CUSTOMER"
          ? !type.includes("SUPPLIER")
          : type.includes("SUPPLIER");
      })
      .map((p: any) => ({
        ...p,
        id: p.id ?? p.partyId,
        name: p.name || p.partyName,
        phone: p.phone || "",
        address: p.address || "",
      }));
  }, [rawPartyData, partyType]);

  return { partyList, isLoading, refetch };
};

export default useTradeParties;
