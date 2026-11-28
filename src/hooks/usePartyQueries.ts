import { useMutation, useQuery } from "@tanstack/react-query";
import { partyListQueryKey } from "@/config/query-key";
import { fetchPartyList, saveParty, updateParty } from "@/services/party-service";

export const usePartyListQuery = () =>
  useQuery({
    queryKey: [partyListQueryKey],
    queryFn: fetchPartyList,
    refetchOnWindowFocus: false,
  });

export const useSavePartyMutation = () =>
  useMutation({
    mutationFn: ({
      payload,
      isEdit,
    }: {
      payload: Record<string, unknown>;
      isEdit: boolean;
    }) => saveParty(payload, isEdit),
  });

export const useUpdatePartyMutation = () =>
  useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateParty(payload),
  });
