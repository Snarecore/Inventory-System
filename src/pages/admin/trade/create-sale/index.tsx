import React from "react";
import { Navigate } from "react-router-dom";
import CreateSaleForm from "./components/SaleForm";
import { usePermission } from "@/hooks/usePermission";

const CreateSalePage: React.FC = () => {
  const { canCreate, isAdmin } = usePermission();
  if (!isAdmin && !canCreate("sales")) {
    return <Navigate to="/admin/sales" replace />;
  }
  return <CreateSaleForm />;
};

export default CreateSalePage;
