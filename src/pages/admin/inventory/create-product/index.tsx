import Button from "@/components/button/Button";
import PageHeader from "@/components/page-header/PageHeader";
import { FaArrowLeft } from "react-icons/fa";
import CreateProductForm from "./components/ProductForm";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";

const CreateProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const isEditMode = Boolean(id || searchParams.get("id") || searchParams.get("edit") || (location.state as any)?.editData);

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center gap-2.5 justify-between flex-wrap">
        <PageHeader
          headerTitle={isEditMode ? "Edit Product" : "Create Product"}
          headerDescription={isEditMode ? "Update existing product details" : "Create a new inventory product"}
        />
        <Button
          label="Back to Products"
          onClick={() => {navigate("/admin/products")}}
          color="var(--primary-color)"
          hoverColor="var(--primary-color-hover)"
          icon={<FaArrowLeft className="text-xs" />}
        />
      </div>

      <div>
        <CreateProductForm />
      </div>
    </div>
  );
};

export default CreateProduct;
