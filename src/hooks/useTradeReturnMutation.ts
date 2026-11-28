import { useMutation } from "@tanstack/react-query";
import {
  saveTradeReturn,
  type TradeReturnMode,
} from "@/services/trade-return-service";

export const useTradeReturnMutation = () =>
  useMutation({
    mutationFn: ({
      mode,
      payload,
    }: {
      mode: TradeReturnMode;
      payload: Record<string, unknown>;
    }) => saveTradeReturn(mode, payload),
  });
