import React from "react";
import PurchaseReturnForm from "./components/PurchaseReturnForm";

/**
 * Create Purchase Return Page
 * URL: /admin/create-purchase-return
 * Allows creating purchase returns from eligible purchase orders.
 */
const CreatePurchaseReturnPage: React.FC = () => {
  return <PurchaseReturnForm />;
};

export default CreatePurchaseReturnPage;
