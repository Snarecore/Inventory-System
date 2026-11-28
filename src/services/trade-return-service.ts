import apiConfig from "@/config/api.json";
import { postData } from "@/services/api-service";

export type TradeReturnMode = "sale" | "purchase";

export async function saveTradeReturn(
  mode: TradeReturnMode,
  payload: Record<string, unknown>
): Promise<unknown> {
  const url =
    mode === "sale"
      ? apiConfig.salesReturn.insertSalesReturnUrl
      : apiConfig.purchaseReturn.insertPurchaseReturnUrl;

  return postData<unknown>({ url, body: payload });
}
