import { Navigate } from "react-router-dom";
import CreatePurchaseForm from "./components/PurchaseForm";
import { usePermission } from "@/hooks/usePermission";

const CreatePurchase = () => {
  const { canCreate, isAdmin } = usePermission();
  if (!isAdmin && !canCreate("purchase")) {
    return <Navigate to="/admin/purchases" replace />;
  }
  return (
    <div>
      <CreatePurchaseForm />
    </div>
  );
};

export default CreatePurchase;