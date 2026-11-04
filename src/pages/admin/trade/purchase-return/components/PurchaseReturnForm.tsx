import React from "react";
import TradeReturnForm from "@/components/trade/TradeReturnForm";

/**
 * Purchase Return Form
 * Delegated to canonical unified TradeReturnForm component.
 */
export const PurchaseReturnForm: React.FC = () => {
  return <TradeReturnForm mode="purchase" />;
};

export default PurchaseReturnForm;